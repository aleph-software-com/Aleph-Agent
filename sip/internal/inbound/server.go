// Package inbound handles incoming SIP calls.
//
// Protocol with the Node.js backend:
//
//  1. Go sends 180 Ringing to the trunk (inDialog.Progress)
//  2. Go opens WS: ws://backend/api/sip/call?callId=&from=&to=
//  3. Backend resolves the destination number → agent, replies with a decision:
//     {"action":"answer","agentId":"..."} or {"action":"reject","code":486,"reason":"..."}
//  4. Go executes the decision:
//     answer → inDialog.Answer() then bridge RTP ↔ WS audio
//     reject → inDialog.Respond(code, reason) + close WS
//
// The Go service knows nothing about agents or routing — the backend decides everything.
package inbound

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"aleph/sip/internal/bridge"
	"aleph/sip/internal/calls"

	"github.com/emiago/diago"
	"github.com/google/uuid"
)

// InboundHandler handles incoming SIP calls.
type InboundHandler struct {
	Manager    *calls.Manager
	WebhookURL string // e.g. "http://backend:3001"
}

// decision is the first JSON message the backend sends after WS connect.
type decision struct {
	Action  string `json:"action"`  // "answer" | "reject"
	AgentID string `json:"agentId"` // set when action == "answer"
	Code    int    `json:"code"`    // SIP response code when action == "reject"
	Reason  string `json:"reason"`  // SIP reason phrase when action == "reject"
}

// Handle is called by Diago for each incoming INVITE.
func (h *InboundHandler) Handle(inDialog *diago.DialogServerSession) {
	callID := uuid.New().String()
	from := inDialog.FromUser()
	to := inDialog.ToUser()

	call := &calls.Call{
		ID:           callID,
		Status:       calls.StatusRinging,
		Direction:    "inbound",
		To:           to,
		From:         from,
		ServerDialog: inDialog,
	}
	h.Manager.Register(call)
	log.Printf("[SIP] Inbound %s from=%s to=%s", callID, from, to)

	// 1. Acknowledge to the trunk that we received the INVITE
	inDialog.Progress() // 180 Ringing

	// 2. Connect to the backend and ask what to do
	dec, b, err := h.askBackend(callID, from, to)
	if err != nil {
		log.Printf("[SIP] Inbound %s — backend unreachable: %v → 500", callID, err)
		inDialog.Respond(500, "Backend Unreachable", nil)
		h.Manager.SetStatus(callID, calls.StatusFailed)
		return
	}

	// 3. Execute backend decision
	switch dec.Action {
	case "answer":
		log.Printf("[DEBUG][SIP] Inbound %s — backend says answer (agent %s)", callID, dec.AgentID)
		log.Printf("[DEBUG][SIP] Inbound %s — calling inDialog.Answer()", callID)
		inDialog.Answer()
		log.Printf("[DEBUG][SIP] Inbound %s — Answer() done, setting up audio writer", callID)
		h.Manager.SetStatus(callID, calls.StatusAnswered)

		audioWriter, awErr := inDialog.AudioWriter()
		if awErr != nil {
			log.Printf("[DEBUG][SIP] Inbound %s — audio writer ERROR: %v", callID, awErr)
		} else {
			log.Printf("[DEBUG][SIP] Inbound %s — audio writer OK (TTS→RTP path ready)", callID)
			ttsFrameCount := 0
			b.OnAudio = func(ulawBytes []byte) {
				ttsFrameCount++
				if ttsFrameCount == 1 || ttsFrameCount%50 == 0 {
					log.Printf("[DEBUG][SIP] Inbound %s — TTS frame #%d: %d bytes → RTP", callID, ttsFrameCount, len(ulawBytes))
				}
				for len(ulawBytes) > 0 {
					n := 160
					if n > len(ulawBytes) {
						n = len(ulawBytes)
					}
					if _, err := audioWriter.Write(ulawBytes[:n]); err != nil {
						log.Printf("[DEBUG][SIP] Inbound %s — RTP write error: %v", callID, err)
						return
					}
					ulawBytes = ulawBytes[n:]
				}
			}
		}
		b.StartReadLoop()
		log.Printf("[DEBUG][SIP] Inbound %s — sending audio_config(8000) to backend", callID)
		b.SendAudioConfig(8000)

		// wsDown is closed when the audio goroutine exits (WS error or normal end)
		wsDown := make(chan struct{})
		go func() {
			streamAudioToBackend(inDialog, b, callID)
			close(wsDown)
		}()

		// dialogDone is closed when the SIP dialog ends (caller hung up)
		dialogDone := make(chan struct{})
		go func() {
			inDialog.Listen()
			close(dialogDone)
		}()

		select {
		case <-wsDown:
			// Backend WS died mid-call → send BYE to Twilio so billing stops
			log.Printf("[SIP] Inbound %s — backend WS lost, hanging up call", callID)
			inDialog.Hangup(context.Background())
			<-dialogDone
		case <-dialogDone:
			// Normal end: caller hung up first
		}

	case "reject":
		code := dec.Code
		if code == 0 {
			code = 486
		}
		reason := dec.Reason
		if reason == "" {
			reason = "Busy Here"
		}
		log.Printf("[SIP] Inbound %s — backend says reject %d %s", callID, code, reason)
		inDialog.Respond(code, reason, nil)
		b.Close()
		h.Manager.SetStatus(callID, calls.StatusFailed)
		return

	default:
		log.Printf("[SIP] Inbound %s — unknown action %q → 500", callID, dec.Action)
		inDialog.Respond(500, "Internal Error", nil)
		b.Close()
		h.Manager.SetStatus(callID, calls.StatusFailed)
		return
	}

	b.SendHangup()
	h.Manager.SetStatus(callID, calls.StatusEnded)
	log.Printf("[SIP] Inbound %s ended", callID)
}

// askBackend opens the WebSocket to the backend and reads the first decision message.
// Returns the decision and the open bridge (ready for audio if action == "answer").
func (h *InboundHandler) askBackend(callID, from, to string) (*decision, *bridge.Bridge, error) {
	wsBase := strings.Replace(h.WebhookURL, "http://", "ws://", 1)
	wsBase = strings.Replace(wsBase, "https://", "wss://", 1)

	wsURL := fmt.Sprintf("%s/api/sip/call?callId=%s&from=%s&to=%s",
		wsBase,
		url.QueryEscape(callID),
		url.QueryEscape(from),
		url.QueryEscape(to),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	b, err := bridge.ConnectRaw(ctx, wsURL)
	if err != nil {
		return nil, nil, fmt.Errorf("ws dial: %w", err)
	}

	// Read the decision (first text message from backend)
	var dec decision
	if err := b.ReadDecision(&dec); err != nil {
		b.Close()
		return nil, nil, fmt.Errorf("read decision: %w", err)
	}

	return &dec, b, nil
}

// streamAudioToBackend reads µ-law 8kHz RTP frames from the caller and
// forwards them to the backend for STT processing.
func streamAudioToBackend(inDialog *diago.DialogServerSession, b *bridge.Bridge, callID string) {
	log.Printf("[DEBUG][SIP] Inbound %s — streamAudioToBackend started, calling AudioReader()", callID)
	audioReader, err := inDialog.AudioReader()
	if err != nil {
		log.Printf("[DEBUG][SIP] Inbound %s — AudioReader() ERROR: %v", callID, err)
		<-b.Done()
		return
	}
	log.Printf("[DEBUG][SIP] Inbound %s — AudioReader() OK, entering RTP read loop", callID)
	buf := make([]byte, 160) // 20ms frame at 8kHz µ-law
	frameCount := 0
	for {
		n, err := audioReader.Read(buf)
		if err != nil {
			log.Printf("[DEBUG][SIP] Inbound %s — RTP read stopped after %d frames: %v", callID, frameCount, err)
			return
		}
		frameCount++
		if frameCount == 1 || frameCount%500 == 0 {
			log.Printf("[DEBUG][SIP] Inbound %s — RTP frame #%d: %d bytes (caller→backend)", callID, frameCount, n)
		}
		if err := b.SendPCM(buf[:n]); err != nil {
			log.Printf("[DEBUG][SIP] Inbound %s — WS send failed after %d frames: %v", callID, frameCount, err)
			return
		}
	}
}

// Serve starts the SIP server for incoming calls.
func Serve(ctx context.Context, dg *diago.Diago, handler *InboundHandler) error {
	log.Println("[SIP] Listening for incoming calls on :5060")
	return dg.Serve(ctx, handler.Handle)
}

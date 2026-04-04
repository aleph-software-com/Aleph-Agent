/**
 * Session — single entry point for all agent/pipeline interactions.
 *
 * Layers (stacked based on config):
 *   LLM  (always)       — text in, text out
 *   STT  (if stt_provider) — audio in → text → LLM, barge-in on speech_start
 *   TTS  (if tts_provider) — LLM tokens → sentences → ElevenLabs → audio out
 *
 * Modes:
 *   Agent mode    — single agent, direct LLM calls
 *   Pipeline mode — multi-agent with handoff loop
 */

import { EventEmitter } from 'events';
import * as agentsQ from '../queries/agents.js';
import * as pipelinesQ from '../queries/pipelines.js';
import * as sessionsQ from '../queries/chatSessions.js';
import {
  resolveCanvasOwnership,
  resolveEntryAgent,
  resolveAgentVersion,
  runAgentLoop,
  type EngineContext, type EngineEmitter,
} from '../engine/index.js';
import { acquireSession } from '../engine/session-manager.js';
import { decrypt } from '../utils/crypto.js';
import { STTPipeline } from '../stt/pipeline.js';
import { TTSPipeline } from '../tts/pipeline.js';
import path from 'path';

const DEFAULT_VAD_MODEL_PATH = path.resolve('models', 'silero_vad.onnx');
const MAX_AGENT_SWITCHES = 5;
const now = () => new Date().toISOString();

// ── Config ──────────────────────────────────────────────

export interface SessionConfig {
  agentId?: string;
  pipelineId?: string;
  sessionId?: string;
}

// ── Session ─────────────────────────────────────────────

export class Session extends EventEmitter {
  private config: SessionConfig;
  private session: any = null;

  // Agent mode
  private agentId: string | null = null;
  private agentFull: any = null;

  // Pipeline mode
  private pipelineFull: any = null;
  private pipelineTools: any[] = [];
  private currentAgentId: string | null = null;
  private currentAgentVersion: number | null = null;

  // Layers
  private sttPipeline: STTPipeline | null = null;
  private ttsPipeline: TTSPipeline | null = null;

  // Barge-in
  private currentAbort: AbortController | null = null;

  constructor(config: SessionConfig) {
    super();
    this.config = config;
  }

  get sessionId(): string {
    return this.session?.id;
  }

  get isPipeline(): boolean {
    return !!this.config.pipelineId;
  }

  // ── Lifecycle ─────────────────────────────────────────

  async start(): Promise<void> {
    if (this.isPipeline) {
      await this.initPipeline();
    } else {
      await this.initAgent();
    }

    this.emit('session', { id: this.session.id });

    // STT layer
    if (this.agentFull?.stt_provider) {
      await this.initSTT();
    }

    // TTS layer
    if (this.agentFull?.tts_provider) {
      await this.initTTS();
    }

    // Fire initial greeting
    await this.runTurn(null);
  }

  stop(): void {
    if (this.currentAbort) {
      this.currentAbort.abort();
      this.currentAbort = null;
    }
    if (this.sttPipeline) {
      this.sttPipeline.forceFlush();
      this.sttPipeline.stop();
      this.sttPipeline = null;
    }
    if (this.ttsPipeline) {
      this.ttsPipeline.stop();
      this.ttsPipeline = null;
    }
  }

  /** Interrupt current response — abort LLM stream + close TTS context.
   *  Same mechanism for voice barge-in and text interruption. */
  private interruptCurrentResponse(): void {
    if (this.currentAbort) {
      this.currentAbort.abort();
    }
    if (this.ttsPipeline) {
      this.ttsPipeline.interrupt();
    }
  }

  // ── Input ─────────────────────────────────────────────

  async handleUserMessage(text: string): Promise<void> {
    // Interrupt whatever is currently running (same as voice barge-in)
    this.interruptCurrentResponse();
    await this.runTurn(text);
  }

  async processAudio(pcm16: Buffer): Promise<void> {
    if (this.sttPipeline) {
      await this.sttPipeline.processAudio(pcm16);
    }
  }

  setInputSampleRate(rate: number): void {
    if (this.sttPipeline) {
      this.sttPipeline.setInputSampleRate(rate);
    }
  }

  // ── Init: Agent mode ──────────────────────────────────

  private async initAgent(): Promise<void> {
    const agent = await agentsQ.findById(this.config.agentId!);
    if (!agent) throw new Error('Agent not found');

    const version = await agentsQ.findVersion(agent.id, agent.current_version);
    const snapshot = version?.snapshot ?? {};
    this.agentFull = { ...agent, ...snapshot };
    this.agentId = agent.id;

    this.session = this.config.sessionId
      ? (sessionsQ.findById(this.config.sessionId) || sessionsQ.create(agent.id))
      : sessionsQ.create(agent.id);
  }

  // ── Init: Pipeline mode ───────────────────────────────

  private async initPipeline(): Promise<void> {
    const pipeline = await pipelinesQ.findById(this.config.pipelineId!);
    if (!pipeline) throw new Error('Pipeline not found');

    const pipelineVersion = await pipelinesQ.findVersion(pipeline.id, pipeline.current_version);
    const pipelineSnapshot = pipelineVersion?.snapshot ?? {};
    this.pipelineFull = { ...pipeline, ...pipelineSnapshot };
    this.pipelineTools = this.pipelineFull.tools || [];

    if (this.config.sessionId) {
      this.session = sessionsQ.findById(this.config.sessionId);
      if (this.session) {
        this.currentAgentId = this.session.current_agent_id || this.session.agent_id;
        this.currentAgentVersion = resolveAgentVersion(this.pipelineFull.flow_data, this.currentAgentId!);
      }
    }

    if (!this.session) {
      const entry = resolveEntryAgent(this.pipelineFull.flow_data);
      if (!entry) throw new Error('No entry agent found in pipeline');
      this.session = sessionsQ.createPipeline(pipeline.id, entry.agentId);
      this.currentAgentId = entry.agentId;
      this.currentAgentVersion = entry.agentVersion;
    }

    const agent = await agentsQ.findById(this.currentAgentId!);
    if (!agent) throw new Error(`Pipeline entry agent ${this.currentAgentId} not found`);
    const agentVersion = await agentsQ.findVersion(agent.id,
      this.currentAgentVersion ?? agent.current_version);
    this.agentFull = { ...agent, ...(agentVersion?.snapshot ?? {}) };
    this.agentId = agent.id;
  }

  // ── Core: run a turn (agent or pipeline) ──────────────

  private async runTurn(userText: string | null): Promise<void> {
    try {
      this.session = sessionsQ.findById(this.session.id)!;

      const { abortController, release } = await acquireSession(this.session.id);
      this.currentAbort = abortController;

      try {
        this.session = sessionsQ.findById(this.session.id)!;

        // Start new TTS context for this response
        if (this.ttsPipeline) {
          this.ttsPipeline.beginResponse();
        }

        const emitter = this.buildEmitter();

        if (this.isPipeline) {
          await this.runPipelineTurn(userText, emitter, abortController);
        } else {
          await this.runAgentTurn(userText, emitter, abortController);
        }

        // Flush remaining text through TTS
        if (this.ttsPipeline) {
          this.ttsPipeline.finishResponse();
        }
      } finally {
        this.currentAbort = null;
        release();
      }
    } catch (err: any) {
      console.error('[Session] Engine error:', err);
      this.emit('error', { error: err.message || 'Engine error' });
    }
  }

  /**
   * Build the engine emitter. If TTS is active, token events go to
   * the TTS pipeline (which emits audio). All other events pass through.
   */
  private buildEmitter(): EngineEmitter {
    if (this.ttsPipeline) {
      const tts = this.ttsPipeline;
      return {
        emit: (event: string, data: any) => {
          if (event === 'token') {
            // Tokens → TTS pipeline (sentence split → ElevenLabs → audio)
            tts.pushToken(data.t);
            // Also forward text token for transcript display
            this.emit('token', data);
          } else {
            this.emit(event, data);
          }
        },
      };
    }

    // No TTS — direct passthrough
    return {
      emit: (event: string, data: any) => this.emit(event, data),
    };
  }

  // ── Agent turn ────────────────────────────────────────

  private async runAgentTurn(
    userText: string | null,
    emitter: EngineEmitter,
    abortController: AbortController,
  ): Promise<void> {
    const ctx = await this.buildContext({
      lastUserMsg: userText ? { role: 'user', content: userText } : null,
    });
    if (!ctx) return;

    const result = await runAgentLoop(ctx, emitter, undefined, abortController.signal);

    sessionsQ.update(this.session.id, {
      active_task_name: result.activeTaskName,
      runtime_variables: result.runtimeVariables,
      completed_tasks: result.completedTasks,
      message_history: result.history,
      context_summary: result.contextSummary,
    });

    this.emit('done', {});
  }

  // ── Pipeline turn (handoff loop) ──────────────────────

  private async runPipelineTurn(
    userText: string | null,
    emitter: EngineEmitter,
    abortController: AbortController,
  ): Promise<void> {
    let runtimeVariables: Record<string, any> = this.session.runtime_variables ? { ...this.session.runtime_variables } : {};
    let restoredHistory: any[] = this.session.message_history || [];
    let contextSummary: string | null = this.session.context_summary || null;
    let userMsgConsumed = false;
    let pendingHandoff: any = null;
    let agentSwitchCount = 0;

    while (agentSwitchCount <= MAX_AGENT_SWITCHES) {
      const ctx = await this.buildContext({
        agentIdOverride: this.currentAgentId!,
        agentVersionOverride: this.currentAgentVersion,
        restoredHistory,
        contextSummary,
        runtimeVariables,
        completedTasks: new Set(agentSwitchCount === 0 ? (this.session.completed_tasks || []) : []),
        lastUserMsg: !userMsgConsumed && userText ? { role: 'user', content: userText } : null,
        extraTools: this.pipelineTools,
        pipelineName: this.pipelineFull.name,
        pipelinePrompt: this.pipelineFull.prompt || undefined,
        transferredMsgCount: agentSwitchCount > 0 ? restoredHistory.length : 0,
        pendingHandoff,
      });
      if (!ctx) break;

      emitter.emit('debug', {
        type: 'info',
        content: agentSwitchCount === 0
          ? `Pipeline "${this.pipelineFull.name}" → Agent "${this.agentFull.name}"`
          : `Handoff → Agent "${this.agentFull.name}"`,
        timestamp: now(),
      });
      userMsgConsumed = true;

      const result = await runAgentLoop(ctx, emitter, {
        pipelineFlowData: this.pipelineFull.flow_data,
        currentAgentId: this.currentAgentId!,
      }, abortController.signal);

      sessionsQ.update(this.session.id, {
        active_task_name: result.activeTaskName,
        runtime_variables: result.runtimeVariables,
        completed_tasks: result.completedTasks,
        message_history: result.history,
        context_summary: result.contextSummary,
        current_agent_id: this.currentAgentId,
      });

      if (abortController.signal.aborted) return;

      if (!result.handoff) {
        this.emit('done', {});
        return;
      }

      agentSwitchCount++;
      const handoff = result.handoff;
      pendingHandoff = handoff.pendingHandoff;

      if (handoff.contextOptions.includes('full')) {
        restoredHistory = handoff.historyBeforeSwitch;
        runtimeVariables = result.runtimeVariables;
        contextSummary = result.contextSummary;
      } else if (handoff.contextOptions.includes('extracted')) {
        const extractedVars: Record<string, any> = {};
        for (const [k, v] of Object.entries(result.runtimeVariables)) {
          if (k.startsWith('extraction.')) extractedVars[k] = v;
        }
        const varEntries = Object.entries(extractedVars).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
        restoredHistory = varEntries.length > 0
          ? [{ role: 'system', content: `[CONTEXTE TRANSFÉRÉ — données extraites]\n${varEntries.join('\n')}` }]
          : [];
        runtimeVariables = extractedVars;
        contextSummary = null;
      } else {
        restoredHistory = [];
        runtimeVariables = {};
        contextSummary = null;
      }

      this.currentAgentId = handoff.targetAgentId;
      this.currentAgentVersion = handoff.targetAgentVersion ?? null;

      const nextAgent = await agentsQ.findById(this.currentAgentId!);
      if (nextAgent) {
        const nextVersion = await agentsQ.findVersion(nextAgent.id,
          this.currentAgentVersion ?? nextAgent.current_version);
        this.agentFull = { ...nextAgent, ...(nextVersion?.snapshot ?? {}) };
      }
    }

    this.emit('debug', { type: 'info', content: 'Max agent switches atteint', timestamp: now() });
    this.emit('done', {});
  }

  // ── Build EngineContext ────────────────────────────────

  private async buildContext(overrides: {
    agentIdOverride?: string;
    agentVersionOverride?: number | null;
    restoredHistory?: any[];
    contextSummary?: string | null;
    runtimeVariables?: Record<string, any>;
    completedTasks?: Set<string>;
    lastUserMsg?: { role: string; content: string } | null;
    extraTools?: any[];
    pipelineName?: string;
    pipelinePrompt?: string;
    transferredMsgCount?: number;
    pendingHandoff?: any;
  }): Promise<EngineContext | null> {
    const targetAgentId = overrides.agentIdOverride || this.agentId!;

    const agent = await agentsQ.findById(targetAgentId);
    if (!agent) {
      this.emit('error', { error: `Agent ${targetAgentId} introuvable` });
      return null;
    }

    const versionNum = overrides.agentVersionOverride ?? agent.current_version;
    const version = await agentsQ.findVersion(agent.id, versionNum);
    const snapshot = version?.snapshot ?? {};
    const agentFull: any = { ...agent, ...snapshot };
    this.agentFull = agentFull;

    const tasks = agentFull.tasks || [];
    const agentTools: any[] = agentFull.tools || [];
    const extraTools: any[] = overrides.extraTools || [];

    const { agentToolNames, taskToolNames } = resolveCanvasOwnership(agentFull.flow_data);

    const allTools = new Map<string, any>();
    for (const t of agentTools) allTools.set(t.name, t);
    for (const t of extraTools) allTools.set(t.name, t);

    const canvasAgentTools: any[] = [];
    for (const name of agentToolNames) {
      const t = allTools.get(name);
      if (t) canvasAgentTools.push(t);
    }
    for (const t of extraTools) {
      if (!canvasAgentTools.find((ct: any) => ct.id === t.id)) {
        canvasAgentTools.push(t);
      }
    }

    const canvasTaskToolMap = new Map<string, any[]>();
    for (const [taskLabel, toolNameSet] of taskToolNames) {
      const tls: any[] = [];
      for (const name of toolNameSet) {
        const t = allTools.get(name);
        if (t) tls.push(t);
      }
      canvasTaskToolMap.set(taskLabel, tls);
    }

    return {
      agent: agentFull, tasks, allTools, canvasAgentTools, canvasTaskToolMap,
      session: this.session,
      restoredHistory: overrides.restoredHistory ?? this.session.message_history ?? [],
      contextSummary: overrides.contextSummary ?? this.session.context_summary ?? null,
      runtimeVariables: overrides.runtimeVariables ?? this.session.runtime_variables ?? {},
      completedTasks: overrides.completedTasks ?? new Set(this.session.completed_tasks || []),
      lastUserMsg: overrides.lastUserMsg ?? null,
      pipelineName: overrides.pipelineName,
      pipelinePrompt: overrides.pipelinePrompt,
      transferredMsgCount: overrides.transferredMsgCount,
      pendingHandoff: overrides.pendingHandoff,
    };
  }

  // ── STT layer ─────────────────────────────────────────

  private async initSTT(): Promise<void> {
    const sttConfig = (this.agentFull.stt_config || {}) as Record<string, any>;

    let sttApiKey = '';
    if (sttConfig.api_key_encrypted) {
      try { sttApiKey = decrypt(sttConfig.api_key_encrypted); } catch { /* */ }
    }
    if (!sttApiKey) {
      this.emit('error', { error: 'No STT API key configured. Add one in the agent STT settings.' });
      return;
    }

    const vadModelPath = sttConfig.vad_model_path || DEFAULT_VAD_MODEL_PATH;

    this.sttPipeline = new STTPipeline({
      vad: {
        modelPath: vadModelPath,
        threshold: sttConfig.vad_threshold ?? 0.5,
        minSilenceDurationMs: sttConfig.vad_min_silence_ms ?? 500,
        minSpeechDurationMs: sttConfig.vad_min_speech_ms ?? 250,
      },
      deepgram: {
        apiKey: sttApiKey,
        model: this.agentFull.stt_model || sttConfig.model || 'nova-2',
        language: sttConfig.language ?? 'fr',
        endpointing: sttConfig.endpointing ?? 25,
        sampleRate: sttConfig.sample_rate ?? 48000,
        channels: sttConfig.channels ?? 1,
      },
      flushDelayMs: sttConfig.flush_delay_ms ?? 200,
    });

    this.sttPipeline.on('transcript_final', (d: any) => this.emit('transcript_final', d));
    this.sttPipeline.on('speech_start', () => {
      this.emit('speech_start', {});
      this.interruptCurrentResponse();
    });
    this.sttPipeline.on('speech_end', () => this.emit('speech_end', {}));
    this.sttPipeline.on('utterance', ({ text }: { text: string }) => {
      this.emit('utterance', { text });
      this.handleUserMessage(text);
    });
    this.sttPipeline.on('error', (err: Error) => {
      console.error('[Session] STT error:', err.message);
      this.emit('error', { error: `STT error: ${err.message}` });
    });

    await this.sttPipeline.start();
    console.log('[Session] STT layer active');
  }

  // ── TTS layer ─────────────────────────────────────────

  private async initTTS(): Promise<void> {
    const ttsConfig = (this.agentFull.tts_config || {}) as Record<string, any>;

    let ttsApiKey = '';
    if (ttsConfig.api_key_encrypted) {
      try { ttsApiKey = decrypt(ttsConfig.api_key_encrypted); } catch { /* */ }
    }
    if (!ttsApiKey) {
      this.emit('error', { error: 'No TTS API key configured. Add one in the agent TTS settings.' });
      return;
    }

    this.ttsPipeline = new TTSPipeline({
      elevenlabs: {
        apiKey: ttsApiKey,
        voiceId: ttsConfig.voice_id || this.agentFull.tts_model || 'EXAVITQu4vr4xnSDxMaL',
        modelId: ttsConfig.model_id || 'eleven_multilingual_v2',
        outputFormat: ttsConfig.output_format || 'mp3_44100_64',
        stability: ttsConfig.stability ?? 0.5,
        similarityBoost: ttsConfig.similarity_boost ?? 0.75,
      },
    });

    // Forward audio chunks to client
    this.ttsPipeline.on('audio', (chunk: Buffer) => {
      this.emit('audio', chunk);
    });

    this.ttsPipeline.on('error', (err: Error) => {
      console.error('[Session] TTS error:', err.message);
      this.emit('error', { error: `TTS error: ${err.message}` });
    });

    await this.ttsPipeline.start();
    console.log('[Session] TTS layer active');
  }
}

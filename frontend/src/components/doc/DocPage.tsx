import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Doc navigation sections ── */
const docNav = [
  {
    section: 'Fundamentals',
    items: [
      { id: 'agent', icon: 'A', label: 'Agent' },
      { id: 'task', icon: 'T', label: 'Task' },
      { id: 'tool', icon: 'T', label: 'Tool' },
      { id: 'pipeline', icon: 'P', label: 'Pipeline' },
    ],
  },
  {
    section: 'Architecture',
    items: [
      { id: 'canvas', icon: 'C', label: 'Canvas (Visual Graph)' },
      { id: 'layers', icon: 'L', label: 'Prompt Layers' },
    ],
  },
  {
    section: 'Execution',
    items: [
      { id: 'engine', icon: 'E', label: 'Engine Loop' },
      { id: 'tool-exec', icon: 'X', label: 'Tool Execution' },
      { id: 'conditions', icon: '?', label: 'Conditions & Routing' },
      { id: 'variables', icon: 'V', label: 'Runtime Variables' },
      { id: 'context', icon: 'M', label: 'Context & Transfer' },
    ],
  },
  {
    section: 'Debug',
    items: [
      { id: 'debug-chat', icon: 'D', label: 'Debug Chat' },
    ],
  },
  {
    section: 'Usage',
    items: [
      { id: 'api-keys', icon: 'K', label: 'API Keys' },
      { id: 'api-usage', icon: '>', label: 'Integration' },
      { id: 'database', icon: 'D', label: 'Database' },
    ],
  },
]

/* ── Sidebar ── */
function DocSidebar({ activeId, onNavigate }: { activeId: string; onNavigate: (id: string) => void }) {
  return (
    <div
      className="h-full overflow-y-auto shrink-0"
      style={{ width: 260, background: 'var(--bg-dark)', borderRight: '1px solid var(--border-muted)' }}
    >
      <div className="px-5 pt-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Documentation
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 pb-4">
        {docNav.map((group) => (
          <div key={group.section}>
            <div
              className="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[1.5px]"
              style={{ color: 'var(--text-dim)' }}
            >
              {group.section}
            </div>
            {group.items.map((item) => {
              const isActive = activeId === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-left transition-all duration-150 cursor-pointer"
                  style={{
                    background: isActive ? 'rgba(245, 240, 232, 0.05)' : 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--text-dim)',
                    borderLeft: isActive ? '3px solid var(--accent-hover)' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(245, 240, 232, 0.03)'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-dim)'
                    }
                  }}
                >
                  <span className="w-4 text-center text-[12px] opacity-70">{item.icon}</span>
                  <span className="text-[13px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </div>
  )
}

/* ── Reusable components ── */
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    purple: { bg: 'rgba(167, 139, 250, 0.12)', fg: '#a78bfa' },
    green: { bg: 'rgba(52, 211, 153, 0.12)', fg: '#34d399' },
    blue: { bg: 'rgba(96, 165, 250, 0.12)', fg: '#60a5fa' },
    orange: { bg: 'rgba(251, 146, 60, 0.12)', fg: '#fb923c' },
    pink: { bg: 'rgba(244, 114, 182, 0.12)', fg: '#f472b6' },
    red: { bg: 'rgba(248, 113, 113, 0.12)', fg: '#f87171' },
    yellow: { bg: 'rgba(251, 191, 36, 0.12)', fg: '#fbbf24' },
  }
  const c = colors[color] || colors.blue
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  )
}

function Card({ badge, badgeColor, children }: { badge?: string; badgeColor?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-5 my-4" style={{ background: 'var(--bg-light)', border: '1px solid var(--border)' }}>
      {badge && (
        <div className="mb-3">
          <Badge color={badgeColor || 'blue'}>{badge}</Badge>
        </div>
      )}
      {children}
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="my-5 py-4 px-5 rounded-r-lg text-[14px]"
      style={{ borderLeft: '3px solid var(--border-muted)', background: 'rgba(245, 240, 232, 0.03)', color: 'var(--text-muted)' }}
    >
      {children}
    </div>
  )
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="my-5 py-4 px-5 rounded-r-lg text-[14px]"
      style={{ borderLeft: '3px solid #fb923c', background: 'rgba(251, 146, 60, 0.06)', color: 'var(--text-muted)' }}
    >
      {children}
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="text-[12px] px-1.5 py-0.5 rounded"
      style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--code)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {children}
    </code>
  )
}

function Pre({ children }: { children: string }) {
  return (
    <pre
      className="my-4 p-5 rounded-lg overflow-x-auto text-[13px] leading-relaxed"
      style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: 'var(--text-muted)' }}
    >
      {children}
    </pre>
  )
}

function CanvasNode({ type, children }: { type: 'start' | 'task' | 'tool' | 'agent'; children: React.ReactNode }) {
  const styles: Record<string, { bg: string; fg: string }> = {
    start: { bg: 'rgba(52, 211, 153, 0.12)', fg: '#34d399' },
    task: { bg: 'rgba(96, 165, 250, 0.12)', fg: '#60a5fa' },
    tool: { bg: 'rgba(251, 146, 60, 0.12)', fg: '#fb923c' },
    agent: { bg: 'rgba(167, 139, 250, 0.12)', fg: '#a78bfa' },
  }
  const s = styles[type]
  return (
    <span className="inline-block px-3.5 py-1 rounded-md font-semibold text-[13px]" style={{ background: s.bg, color: s.fg, fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </span>
  )
}

function Arrow({ children }: { children?: React.ReactNode }) {
  return <span className="mx-2" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{children || '───>'}</span>
}

function SectionSep() {
  return <div className="my-16" style={{ height: 1, background: 'var(--border)' }} />
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full text-[14px] my-4" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="text-left text-[13px] font-semibold py-2.5 px-4" style={{ borderBottom: '2px solid var(--border)', color: 'var(--text)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="py-2.5 px-4" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Content ── */
function DocContent({ onSectionVisible }: { onSectionVisible: (id: string) => void }) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const getActiveSection = () => {
      const headings = Array.from(container.querySelectorAll('h2[id]'))
      let current = ''
      for (const h of headings) {
        const rect = h.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        // heading is above or at the top 30% of the container
        if (rect.top - containerRect.top <= containerRect.height * 0.3) {
          current = h.id
        } else {
          break
        }
      }
      if (current) onSectionVisible(current)
    }

    container.addEventListener('scroll', getActiveSection, { passive: true })
    getActiveSection()
    return () => container.removeEventListener('scroll', getActiveSection)
  }, [onSectionVisible])

  return (
    <div ref={contentRef} className="flex-1 overflow-y-auto px-16 py-12" style={{ background: 'var(--bg-dark)' }}>
      <div className="max-w-[860px]">
        {/* Intro */}
        <div className="rounded-xl p-8 mb-12" style={{ background: 'linear-gradient(135deg, var(--bg-light), var(--bg))', border: '1px solid var(--border-muted)' }}>
          <h2 className="text-[28px] font-bold mb-3" style={{ color: 'var(--text)' }}>Aleph <span style={{ color: 'var(--accent-hover)' }}>Agent</span></h2>
          <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
            Build conversational AI agents visually, test them individually, then assemble them into pipelines to create complex workflows — all without writing a single line of code.
          </p>
          <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
            Each <strong style={{ color: 'var(--text)' }}>agent</strong> is self-contained: its own prompt, tools, and tasks. You build it visually using a canvas (directed graph), test it in real time with the built-in chat, and once it works — connect it to other agents through a <strong style={{ color: 'var(--text)' }}>pipeline</strong>.
          </p>
          <p className="text-[15px] leading-relaxed m-0" style={{ color: 'var(--text-muted)' }}>
            The idea: <strong style={{ color: 'var(--text)' }}>simple, reliable agents individually</strong>, reusable and composable in pipelines to cover advanced scenarios (reception → qualification → support → billing). No code, no wiring bugs — just blocks that connect.
          </p>
        </div>

        {/* ═══ AGENT ═══ */}
        <h2 id="agent" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Agent</h2>

        <p className="mb-4 text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          An <strong style={{ color: 'var(--text)' }}>Agent</strong> is composed of two layers: a <strong style={{ color: 'var(--text)' }}>permanent foundation</strong> (system prompt + global tools) that lives throughout the entire conversation, and <strong style={{ color: 'var(--text)' }}>tasks</strong> which are temporary objectives with a start and an end.
        </p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>The foundation: system prompt + global tools</h3>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The <strong style={{ color: 'var(--text)' }}>system prompt</strong> defines who the agent is: its personality, tone, and rules. It is injected into every LLM call, from the first message to the last. It never changes during the conversation.
        </p>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>Global tools</strong> (attached to the agent via the canvas) are always available, regardless of the active task. These are actions the agent can always perform — for example a handoff tool or an HTTP search tool.
        </p>

        <Card badge="Permanent" badgeColor="purple">
          <Table
            headers={['Element', 'Lifetime', 'Role']}
            rows={[
              [<Code>system_prompt</Code>, 'Entire conversation', 'Personality, tone, general rules'],
              [<Code>tools</Code>, 'Entire conversation', 'Always-available actions (handoff, search...)'],
              [<Code>llm_model</Code>, 'Entire conversation', <>LLM model (e.g. <Code>gpt-4o</Code>)</>],
              [<Code>llm_config</Code>, 'Entire conversation', 'Temperature, context window, summarization'],
            ]}
          />
        </Card>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Tasks: temporary objectives</h3>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          A <strong style={{ color: 'var(--text)' }}>task</strong> is a workflow step with a specific objective. It has a <strong style={{ color: 'var(--text)' }}>start</strong> (activation via the canvas) and an <strong style={{ color: 'var(--text)' }}>end</strong> (when the LLM calls the tool defined as <Code>exit_condition</Code>). Each task provides:
        </p>
        <ul className="mb-4 ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5">An <strong style={{ color: 'var(--text)' }}>additional prompt</strong> injected on top of the system prompt — the current objective</li>
          <li className="mb-1.5">Its <strong style={{ color: 'var(--text)' }}>own tools</strong> that only exist while it is active</li>
        </ul>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The agent has <strong style={{ color: 'var(--text)' }}>at most one active task</strong> at a time. When a task ends, the canvas conditional routes determine what comes next: either <strong style={{ color: 'var(--text)' }}>another task</strong> takes over, or <strong style={{ color: 'var(--text)' }}>no route matches</strong> and the task flow is complete. In that case, the task prompt and its tools are removed — the <strong style={{ color: 'var(--text)' }}>system prompt takes back full control</strong> with only the global tools.
        </p>

        <Card badge="Temporary (task)" badgeColor="blue">
          <Table
            headers={['Element', 'Lifetime', 'Role']}
            rows={[
              [<Code>prompt</Code>, 'While the task is active', 'Instructions specific to the current objective'],
              ['Task tools', 'While the task is active', 'Actions available only for this objective'],
              [<Code>exit_condition</Code>, 'While the task is active', 'Name of the tool that triggers the end of the task'],
            ]}
          />
        </Card>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Overview</h3>

        <Pre>{`┌─────────────────────────────────────────────────────────┐
│  AGENT                                                  │
│                                                         │
│  system_prompt: "You are a sales assistant.             │
│                  Be polite and professional."            │
│                                                         │
│  global tools: [ handoff_human, product_search ]        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                         │
│  ┌─ TASK: collect_info ─────────────────────────────┐   │
│  │  prompt: "Ask for the customer's name and email" │   │
│  │  tools: [ extraction_contact ]                   │   │
│  │  exit_condition: extraction_contact              │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  ┌─ TASK: qualify ──────────────────────────────────┐   │
│  │  prompt: "Identify the customer's need"          │   │
│  │  tools: [ extraction_need, http_crm ]            │   │
│  │  exit_condition: extraction_need                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘`}</Pre>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          While the <Code>collect_info</Code> task is active, the LLM sees: the system prompt + the task prompt + global tools + <Code>extraction_contact</Code>. When <Code>extraction_contact</Code> is called, the task ends and <Code>qualify</Code> takes over.
        </p>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>The system prompt survives everything. Tasks come and go.</strong> This separation is what allows building complex workflows without losing the agent's coherence.
        </InfoBox>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>State persistence</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The active task state (<Code>active_task_name</Code>) is persisted in the session between each HTTP request. This is not for the LLM — it's for the <strong style={{ color: 'var(--text)' }}>engine</strong>. Without it, the engine wouldn't know:
        </p>
        <ul className="mb-4 ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5">Which tools to expose to the LLM (global + active task tools)</li>
          <li className="mb-1.5">Which <Code>exit_condition</Code> to monitor</li>
          <li className="mb-1.5">Which routes to evaluate for the next transition</li>
        </ul>

        {/* ═══ TASK ═══ */}
        <h2 id="task" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Task</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          A <strong style={{ color: 'var(--text)' }}>Task</strong> is a temporary objective within the agent. It injects a focused prompt and makes its own tools available for the duration of a specific goal.
        </p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Why tasks?</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          You could put everything in the system prompt: "ask for the name, then the email, then offer a time slot". But that doesn't scale. The longer the prompt, the more the LLM loses focus. Tasks solve this by <strong style={{ color: 'var(--text)' }}>breaking a workflow into steps</strong>. At any given moment, the LLM only sees the current objective and the tools it needs — nothing else. When a task ends, its prompt and tools disappear, and the next step takes over with a clean context.
        </p>

        <Card badge="Structure" badgeColor="blue">
          <Table
            headers={['Property', 'Role']}
            rows={[
              [<Code>name</Code>, <>Unique identifier within the agent (e.g. <Code>collect_email</Code>)</>],
              [<Code>prompt</Code>, 'Instructions injected when the task is active'],
              [<Code>description</Code>, 'Objective (e.g. "Collect the user\'s email address")'],
              [<Code>exit_condition</Code>, 'Name of the tool that, once called, terminates the task'],
            ]}
          />
        </Card>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Lifecycle</h4>
        <ol className="mb-4 ml-5 list-decimal" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Activation</strong> — First task found via the canvas (<Code>Start → Task</Code> edge).</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Active</strong> — Its prompt is injected on top of the system prompt. Its tools become available.</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Exit</strong> — The LLM calls the tool matching <Code>exit_condition</Code> → the task is terminated.</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Transition</strong> — The engine evaluates the canvas conditional routes.</li>
        </ol>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Injected prompt format</h4>
        <Pre>{`CURRENT TASK: collect_email
OBJECTIVE: Collect the user's email address

Politely ask for the email. Validate the format before calling
the extraction tool.`}</Pre>

        {/* ═══ TOOL ═══ */}
        <h2 id="tool" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Tool</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          A <strong style={{ color: 'var(--text)' }}>Tool</strong> is an action the LLM can trigger. The agent cannot access the outside world directly — it goes through tools. There are <strong style={{ color: 'var(--text)' }}>3 types</strong>:
        </p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Why tools?</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          An LLM on its own can only <strong style={{ color: 'var(--text)' }}>produce text</strong>. It cannot call an API, query a database, or extract structured data. Tools are the bridge between the LLM's intelligence and the real world. The LLM decides <em>when</em> and <em>with which arguments</em> to call a tool, the backend <em>executes</em> the action, and the result comes back into the conversation for the LLM to decide what to do next.
        </p>

        <Card badge="HTTP" badgeColor="orange">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>External API call</h4>
          <p style={{ color: 'var(--text-muted)' }}>Sends an HTTP request to a configured URL. The body can combine 3 sources:</p>
          <ul className="ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
            <li className="mb-1"><Code>fixed</Code> — hardcoded value in the config</li>
            <li className="mb-1"><Code>variable</Code> — references a runtime variable</li>
            <li className="mb-1"><Code>llm</Code> — the LLM provides the value (function calling)</li>
          </ul>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>The JSON response is decomposed into variables: <Code>{'http.{toolName}.{key}'}</Code></p>
        </Card>

        <Card badge="Extraction" badgeColor="green">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Structured data collection</h4>
          <p style={{ color: 'var(--text-muted)' }}>Asks the LLM to provide typed values (string, number, boolean). Results are stored as variables: <Code>{'extraction.{toolName}.{fieldName}'}</Code></p>
          <Pre>{`// Config
fields: [
  { name: "email", type: "string", description: "User's email address" },
  { name: "age",   type: "number", description: "User's age" }
]

// Variables produites
extraction.collect_info.email = "ruben@test.com"
extraction.collect_info.age   = 25`}</Pre>
        </Card>

        <Card badge="Handoff" badgeColor="pink">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Conversation transfer</h4>
          <p style={{ color: 'var(--text-muted)' }}>Transfers the conversation to another agent or a human. The handoff <strong style={{ color: 'var(--text)' }}>immediately stops</strong> the current agent's engine.</p>
          <ul className="ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
            <li className="mb-1"><Code>target_type</Code> — <Code>human</Code> or <Code>agent</Code></li>
            <li className="mb-1"><Code>transfer_message</Code> — message displayed during the transfer</li>
            <li className="mb-1"><Code>context_options</Code> — what is transmitted: <Code>none</Code>, <Code>extracted</Code>, or <Code>full</Code></li>
          </ul>
        </Card>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Ownership: Agent-level vs Task-level</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          A tool can be attached to <strong style={{ color: 'var(--text)' }}>the agent</strong> or to <strong style={{ color: 'var(--text)' }}>a task</strong> via canvas edges:
        </p>
        <Table
          headers={['Attachment', 'Canvas edge', 'Availability']}
          rows={[
            ['Agent-level', <Code>Agent → Tool</Code>, 'Always available, regardless of the active task'],
            ['Task-level', <Code>Task → Tool</Code>, 'Only available when this task is active'],
          ]}
        />
        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>Both types are merged</strong> into a single array and sent together to the LLM. The LLM doesn't know which is "agent-level" or "task-level" — it just sees a list of available functions.
        </InfoBox>

        {/* ═══ PIPELINE ═══ */}
        <h2 id="pipeline" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Pipeline</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          A <strong style={{ color: 'var(--text)' }}>Pipeline</strong> orchestrates multiple agents together. It has <strong style={{ color: 'var(--text)' }}>no LLM of its own</strong> — it's a pure router that connects agents via handoff tools. Routing is not linear: any agent can transfer to any other agent in the pipeline based on the wiring defined in the flow.
        </p>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          It's always the active agent's LLM that runs. The pipeline doesn't think — it provides a <strong style={{ color: 'var(--text)' }}>shared framework</strong> and resolves transitions between agents.
        </p>

        <Card badge="Pipeline prompt — shared context" badgeColor="purple">
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
            The pipeline prompt carries everything that <strong style={{ color: 'var(--text)' }}>doesn't belong to any specific agent</strong> but to the system as a whole: brand identity, expected tone, global rules, language, compliance guidelines…
          </p>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
            At runtime, this prompt is injected <strong style={{ color: 'var(--text)' }}>first</strong> into every agent's context. The prompt stack seen by the LLM is:
          </p>
          <ol className="mb-3 ml-5 list-decimal" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            <li className="mb-1"><strong style={{ color: 'var(--text)' }}>Pipeline prompt</strong> — brand identity, tone, global rules</li>
            <li className="mb-1"><strong style={{ color: 'var(--text)' }}>Agent prompt</strong> — the agent's role and capabilities</li>
            <li className="mb-1"><strong style={{ color: 'var(--text)' }}>Task prompt</strong> — active task instructions (if applicable)</li>
          </ol>
          <p style={{ color: 'var(--text-muted)' }}>
            When a handoff transfers the conversation to another agent, the pipeline prompt stays the same — only the agent prompt changes. All agents in a pipeline speak with the same brand voice, the same rules, the same tone.
          </p>
        </Card>

        <Card badge="Shared tools — common capabilities" badgeColor="purple">
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
            Like the prompt, the pipeline can define <strong style={{ color: 'var(--text)' }}>shared tools</strong> accessible to all its agents. These tools are merged with each agent's own tools at runtime.
          </p>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
            Typical use cases: a product search HTTP tool, an identity extraction tool, or a FAQ RAG tool — capabilities that <strong style={{ color: 'var(--text)' }}>all agents in the pipeline need</strong> without having to configure them individually.
          </p>
          <p style={{ color: 'var(--text-muted)' }}>
            At runtime, the LLM sees the union: <strong style={{ color: 'var(--text)' }}>pipeline tools + agent tools + active task tools</strong>. It doesn't distinguish between the three sources — it's just a list of available functions.
          </p>
        </Card>

        <Card badge="Structure" badgeColor="purple">
          <Table
            headers={['Property', 'Role']}
            rows={[
              [<Code>prompt</Code>, 'Shared prompt (identity, tone, rules) — injected first into every agent\'s context'],
              [<Code>tools</Code>, 'Shared tools — merged with each agent\'s tools at runtime'],
              [<Code>flow_data</Code>, <><Code>PipelineAgent</Code> node graph — who transfers to whom</>],
            ]}
          />
        </Card>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>How it works</h4>
        <ol className="mb-4 ml-5 list-decimal" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5">A message arrives — the pipeline resolves the <strong style={{ color: 'var(--text)' }}>entry agent</strong> from its <Code>flow_data</Code></li>
          <li className="mb-1.5">The entry agent runs (normal engine loop)</li>
          <li className="mb-1.5">If the agent calls a <strong style={{ color: 'var(--text)' }}>handoff</strong> tool → the pipeline resolves the target agent</li>
          <li className="mb-1.5">Context is transferred according to <Code>context_options</Code></li>
          <li className="mb-1.5">The target agent takes over</li>
        </ol>

        <WarningBox>
          <strong style={{ color: '#fb923c' }}>Safety: max 5 agent switches per request.</strong> If agent A transfers to B which transfers back to A, the counter prevents infinite loops.
        </WarningBox>

        <div className="my-6 p-8 rounded-lg text-center leading-[2.4]" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-muted)' }}>
          <CanvasNode type="start">Start</CanvasNode>
          <Arrow>───&gt;</Arrow>
          <CanvasNode type="agent">Reception Agent</CanvasNode>
          <Arrow>──handoff──&gt;</Arrow>
          <CanvasNode type="agent">Support Agent</CanvasNode>
          <Arrow>──handoff──&gt;</Arrow>
          <CanvasNode type="agent">Billing Agent</CanvasNode>
        </div>

        <SectionSep />

        {/* ═══ CANVAS ═══ */}
        <h2 id="canvas" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Canvas (Visual Graph)</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The <strong style={{ color: 'var(--text)' }}>Canvas</strong> is the core of the architecture. It's a directed graph (nodes + edges) stored as JSONB in <Code>flow_data</Code>. It drives <strong style={{ color: 'var(--text)' }}>everything</strong>: task ordering, available tools, routing conditions, and transitions.
        </p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Why a canvas?</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          An agent has tasks, tools, and routing conditions — but what connects them (which tool belongs to which task, which task follows which, under what condition) needs to be defined somewhere. Rather than code or config files, the canvas is a <strong style={{ color: 'var(--text)' }}>visual editor</strong> for building these relationships as a graph. The result — nodes and edges — is saved in the snapshot's <Code>flow_data</Code>. The engine reads this graph at runtime to determine what to do. This makes the wiring editable without touching code, and visible at a glance.
        </p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Node types</h3>
        <Table
          headers={['Type', 'Role']}
          rows={[
            [<Code>start</Code>, 'Flow entry point'],
            [<Code>agent</Code>, 'Represents the agent itself (for attaching agent-level tools)'],
            [<Code>task</Code>, <>A workflow step — <Code>data.label</Code> = task name in DB</>],
            [<Code>tool</Code>, <>A tool — <Code>data.label</Code> = tool name in DB</>],
          ]}
        />

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Edge types</h3>
        <Table
          headers={['Edge', 'Meaning']}
          rows={[
            [<Code>Start → Task</Code>, 'Defines the initial task'],
            [<Code>Agent → Tool</Code>, 'Always-available tool (agent-level)'],
            [<Code>Task → Tool</Code>, 'Tool available when the task is active'],
            [<Code>Task → Task</Code>, 'Transition route (can have a condition)'],
            [<Code>Agent → Task</Code>, 'Entry point — defines the first task in the workflow'],
          ]}
        />

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Canvas example</h3>
        <div className="my-6 p-8 rounded-lg text-left leading-[2.4]" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-muted)' }}>
          <CanvasNode type="start">Start</CanvasNode>
          <Arrow>───&gt;</Arrow>
          <CanvasNode type="task">collect_email</CanvasNode>
          <Arrow>───&gt;</Arrow>
          <CanvasNode type="tool">email_extractor</CanvasNode>
          <br />
          <span className="inline-block" style={{ width: 208 }} />
          <span style={{ color: 'var(--text-dim)' }}>│</span>
          <br />
          <span className="inline-block" style={{ width: 130 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>exit_condition = "email_extractor"</span>
          <br />
          <span className="inline-block" style={{ width: 208 }} />
          <span style={{ color: 'var(--text-dim)' }}>▼</span>
          <br />
          <span className="inline-block" style={{ width: 130 }} />
          <CanvasNode type="task">verify_email</CanvasNode>
          <Arrow>───&gt;</Arrow>
          <CanvasNode type="tool">http_verify_api</CanvasNode>
        </div>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>What the code does with it</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>3 functions in <Code>canvas.ts</Code> parse the <Code>flow_data</Code>:</p>

        <Card>
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}><Code>findInitialTask(flowData, tasks)</Code></h4>
          <p className="m-0" style={{ color: 'var(--text-muted)' }}>Finds the <Code>Start → Task</Code> edge and returns the corresponding task. This is the workflow entry point.</p>
        </Card>

        <Card>
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}><Code>resolveCanvasOwnership(flowData)</Code></h4>
          <p className="mb-2" style={{ color: 'var(--text-muted)' }}>Splits tools into two groups:</p>
          <ul className="ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
            <li className="mb-1"><strong style={{ color: 'var(--text)' }}>agentToolNames</strong> — tools attached to the agent</li>
            <li className="mb-1"><strong style={{ color: 'var(--text)' }}>taskToolNames</strong> — Map of <Code>taskName → Set&lt;toolNames&gt;</Code></li>
          </ul>
        </Card>

        <Card>
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}><Code>buildRoutingMaps(flowData, tasks)</Code></h4>
          <p className="mb-2" style={{ color: 'var(--text-muted)' }}>Builds transition routes between tasks:</p>
          <ul className="ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
            <li className="mb-1"><strong style={{ color: 'var(--text)' }}>taskRoutes</strong> — Map of <Code>taskName → ToolRoute[]</Code></li>
          </ul>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Each route can carry a condition: <Code>{'{ variable, operator, value }'}</Code></p>
        </Card>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>The engine (agent level) always handles routing.</strong> Even though the canvas visually shows Task → Task edges, it's the engine that intercepts the exit_condition, evaluates routes, and decides the next task.
        </InfoBox>

        <SectionSep />

        {/* ═══ LAYERS ═══ */}
        <h2 id="layers" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Prompt Layers</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          On each LLM call, system messages are stacked in layers. Each layer adds context without overwriting previous ones. The order is fixed:
        </p>

        <div className="flex flex-col my-6">
          {[
            { n: 1, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.06)', label: '1. Pipeline prompt', desc: 'Shared context across all pipeline agents. Absent in standalone agent mode.' },
            { n: 2, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.06)', label: '2. Agent identity', desc: "The agent's system_prompt — its personality and permanent instructions." },
            { n: 3, color: '#34d399', bg: 'rgba(52, 211, 153, 0.06)', label: '3. Active task', desc: 'The current task prompt. Added/removed/replaced dynamically on each transition.' },
            { n: 4, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.06)', label: '4. Tools', desc: "Agent tools + active task tools. Recomputed on each task transition. Sent separately to the LLM (tools parameter, not in messages)." },
            { n: 5, color: '#fb923c', bg: 'rgba(251, 146, 60, 0.06)', label: '5. Memory', desc: 'Summary of previous exchanges (when context has been compacted).' },
            { n: 6, color: '#f472b6', bg: 'rgba(244, 114, 182, 0.06)', label: '6. History', desc: 'Recent conversation messages (user, assistant, tool results).' },
          ].map((layer, i, arr) => (
            <div
              key={layer.n}
              className="flex items-center gap-3 px-5 py-4 text-[14px]"
              style={{
                background: layer.bg,
                border: '1px solid var(--border)',
                borderTop: i > 0 ? 'none' : undefined,
                borderRadius: i === 0 ? '10px 10px 0 0' : i === arr.length - 1 ? '0 0 10px 10px' : undefined,
              }}
            >
              <span className="font-semibold min-w-[150px]" style={{ color: layer.color }}>{layer.label}</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{layer.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Why this order?</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>The LLM processes system messages in order. The <strong style={{ color: 'var(--text)' }}>highest layer = broadest context</strong>, the lowest = most specific:</p>
        <ul className="mb-4 ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Pipeline prompt</strong> — global framework</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Agent identity</strong> — refines within that framework</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Task prompt</strong> — immediate objective</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Tools</strong> — the LLM's action capabilities at this moment. Always agent tools + active task tools. When the task changes, tools are recomputed</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Memory</strong> — recalls what happened before</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>History</strong> — recent conversation</li>
        </ul>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Dynamic task slot management</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The task slot (layer 3) is managed dynamically during execution via <Code>updateTaskSlot()</Code>:
        </p>
        <ul className="mb-4 ml-5 list-disc" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Task A → Task B</strong>: the slot content is replaced</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Task A → no task</strong>: the slot is removed</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>No task → Task A</strong>: the slot is inserted</li>
        </ul>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>Each engine loop iteration sends a complete snapshot</strong> of all layers to the LLM. If the task changes between two iterations, the LLM sees the new task prompt on the very next iteration.
        </InfoBox>

        {/* ═══ ENGINE LOOP ═══ */}
        <h2 id="engine" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Engine Loop</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The engine is the main loop that runs an agent. For a <strong style={{ color: 'var(--text)' }}>single user message</strong>, the engine can make <strong style={{ color: 'var(--text)' }}>multiple LLM calls</strong> (iterations).
        </p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Why multiple iterations?</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>When the LLM calls a tool instead of responding with text, the engine must:</p>
        <ol className="mb-4 ml-5 list-decimal" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5">Execute the tool</li>
          <li className="mb-1.5">Add the result to the history</li>
          <li className="mb-1.5">Call the LLM again so it can see the result and decide what to do</li>
        </ol>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>This can chain: extraction → HTTP → text response = <strong style={{ color: 'var(--text)' }}>3 iterations</strong>.</p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>The cycle</h3>
        <Pre>{`while (iteration < MAX_ITERATIONS) {            // max 10
  ┌─ Build context (system prompts + history)
  ├─ Call OpenAI (streaming SSE)
  │
  ├─ If tool_calls:
  │   ├─ Execute all tools (Promise.all)
  │   ├─ Add results to history
  │   ├─ Check exit_condition → task transition?
  │   ├─ Check handoff → immediate stop?
  │   └─ continue (loop back → LLM sees the results)
  │
  └─ If text:
      └─ return (final response to user)
}`}</Pre>

        <WarningBox>
          <strong style={{ color: '#fb923c' }}>Anti-loop safety: MAX_ITERATIONS = 10.</strong> If the LLM chains 10 tool calls without ever producing text, the engine force-stops.
        </WarningBox>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Interruption</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          If the user sends a new message while the engine is running, an <Code>AbortSignal</Code> is triggered. The system must then handle the shutdown cleanly to avoid corrupting state.
        </p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Why it's tricky</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          When the LLM calls a tool, the OpenAI protocol works in <strong style={{ color: 'var(--text)' }}>two steps</strong>: the LLM sends an <Code>assistant</Code> message containing a <Code>tool_call</Code>, then it expects a <Code>tool</Code> message (the result). If the history contains a <Code>tool_call</Code> without its result, OpenAI rejects the next call.
        </p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>What the system does</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>During LLM streaming:</strong> on each chunk, the engine checks <Code>abortSignal.aborted</Code>. If <Code>true</Code>, the stream is cut. Partial text is saved with the <Code>[interrupted]</Code> suffix. Incomplete <Code>tool_calls</Code> are discarded.
        </p>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>During tool execution:</strong> already-launched tools are not cancelled, but the engine does not loop back. Produced variables are still saved.
        </p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Cleanup on restart</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The new request reloads the session and passes the history through <Code>cleanOrphanedToolCalls()</Code>. Orphaned <Code>tool_calls</Code> are removed from the history.
        </p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Save before restart</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          The old request always saves the session before releasing control. The new request <strong style={{ color: 'var(--text)' }}>waits for this save</strong> before starting.
        </p>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>Summary:</strong> interruption cuts the stream, discards incomplete tool_calls, saves state, and cleans orphans on restart. Even if an HTTP request was in flight, it's not considered for routing — only its variables are preserved.
        </InfoBox>

        {/* ═══ TOOL EXEC ═══ */}
        <h2 id="tool-exec" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Tool Execution</h2>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Parallel execution</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>When the LLM calls multiple tools in a single response, they are <strong style={{ color: 'var(--text)' }}>all executed in parallel</strong> via <Code>Promise.all</Code>:</p>
        <Pre>{`const execResults = await Promise.all(
  toolCallsArray.map(tc => executeTool(tool, args, runtimeVariables))
);`}</Pre>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>However, <strong style={{ color: 'var(--text)' }}>post-processing is sequential</strong>: results are processed one by one, since routing depends on order.</p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Handoff = immediate stop</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>If one of the executed tools is a <strong style={{ color: 'var(--text)' }}>handoff</strong>, post-processing stops immediately. Subsequent tools have already run but their results are <strong style={{ color: 'var(--text)' }}>ignored</strong> for routing.</p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>The 3 body field modes (HTTP tool)</h3>
        <Table
          headers={['Mode', 'Source', 'Example']}
          rows={[
            [<Code>fixed</Code>, 'Hardcoded value in config', <Code>{'{ key: "api_key", fixed_value: "sk-xxx" }'}</Code>],
            [<Code>variable</Code>, 'Runtime variable', <Code>{'{ key: "email", variable_id: "extraction.form.email" }'}</Code>],
            [<Code>llm</Code>, 'Value provided by the LLM', <Code>{'{ key: "query", description: "User search query" }'}</Code>],
          ]}
        />

        {/* ═══ CONDITIONS ═══ */}
        <h2 id="conditions" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Conditions & Routing</h2>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Exit condition</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Each task has an <Code>exit_condition</Code> = a tool name. When the LLM calls that tool, the task is considered complete. The engine then evaluates the outgoing routes.</p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Route resolution</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Routes are defined by <Code>Task → Task</Code> edges in the canvas. When a task ends, the engine iterates its outgoing routes and picks the first one whose condition is satisfied.</p>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>If no route matches, the task flow stops and the <strong style={{ color: 'var(--text)' }}>system prompt takes back full control</strong>.</p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Condition evaluation</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Each route can carry a condition. The first route whose condition is true is selected. A route without a condition serves as a <strong style={{ color: 'var(--text)' }}>fallback</strong>.</p>
        <Pre>{`// Condition on a canvas edge
{
  variable: "extraction.validator.valid",   // key in runtimeVariables
  operator: "==",                           // comparison operator
  value: "true"                             // expected value
}`}</Pre>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Available operators</h4>
        <Table
          headers={['Operator', 'Type', 'Description']}
          rows={[
            [<Code>==</Code>, 'String', 'Strict equality'],
            [<Code>!=</Code>, 'String', 'Not equal'],
            [<Code>&gt;</Code>, 'Numeric', 'Greater than'],
            [<Code>&lt;</Code>, 'Numeric', 'Less than'],
            [<Code>&gt;=</Code>, 'Numeric', 'Greater or equal'],
            [<Code>&lt;=</Code>, 'Numeric', 'Less or equal'],
            [<Code>contains</Code>, 'String', 'Substring match'],
          ]}
        />

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>No compound conditions.</strong> Each edge carries at most one condition. To simulate an AND, chain intermediate tasks.
        </InfoBox>

        {/* ═══ VARIABLES ═══ */}
        <h2 id="variables" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Runtime Variables</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Runtime variables are the agent's structured memory system. They are produced by tools and consumed by conditions and HTTP tool body fields.</p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Namespace</h3>
        <Table
          headers={['Source', 'Format', 'Example']}
          rows={[
            ['Extraction tool', <Code>{'extraction.{toolName}.{fieldName}'}</Code>, <><Code>extraction.form.email</Code> = "ruben@test.com"</>],
            ['HTTP tool', <Code>{'http.{toolName}.{key}'}</Code>, <><Code>http.verify_api.status</Code> = "valid"</>],
          ]}
        />

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>Lifecycle</h3>
        <ol className="mb-4 ml-5 list-decimal" style={{ color: 'var(--text-muted)' }}>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Creation</strong> — A tool executes and returns variables</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Merge</strong> — <Code>Object.assign(runtimeVariables, variables)</Code></li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Persistence</strong> — Saved in the session between requests</li>
          <li className="mb-1.5"><strong style={{ color: 'var(--text)' }}>Reference</strong> — Usable in conditions and HTTP body_fields</li>
        </ol>

        <WarningBox>
          <strong style={{ color: '#fb923c' }}>No TTL, no deletion, no transformation.</strong> Variables accumulate for the entire session duration. A tool that produces the same key overwrites the previous value.
        </WarningBox>

        {/* ═══ CONTEXT ═══ */}
        <h2 id="context" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Context & Transfer</h2>

        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Context is managed at <strong style={{ color: 'var(--text)' }}>two independent levels</strong>: within a single agent, and between agents during a handoff.</p>

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>1. Intra-agent context</h3>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Sliding Window</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>If enabled (<Code>llm_config.context_window.enabled</Code>), only the <strong style={{ color: 'var(--text)' }}>last N turns</strong> are sent to the LLM. Configurable via <Code>context_window.size</Code> (default: 10 turns).</p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Summarization</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>When messages are removed by the sliding window, a call to <strong style={{ color: 'var(--text)' }}>GPT-4o-mini</strong> summarizes the removed messages. The summary is injected into the Memory layer.</p>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Orphaned tool_calls cleanup</h4>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>After an interruption or truncation, <Code>cleanOrphanedToolCalls()</Code> removes <Code>tool_calls</Code> without a matching result.</p>

        <SectionSep />

        <h3 className="text-[22px] font-semibold mt-12 mb-3" style={{ color: 'var(--text)' }}>2. Inter-agent context (handoff transfer)</h3>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>When an agent transfers the conversation to another agent, the system decides <strong style={{ color: 'var(--text)' }}>what the new agent knows</strong>. Configured on the handoff tool via <Code>context_options</Code>.</p>

        <Card badge="full" badgeColor="green">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Full transfer</h4>
          <p style={{ color: 'var(--text-muted)' }}>Everything is transmitted: full history, runtime variables, memory summary. The next agent sees the conversation as if it had been there from the start.</p>
          <Table
            headers={['Data', 'Transferred?']}
            rows={[
              ['History (messages)', 'Yes — full'],
              ['Runtime variables', 'Yes — all'],
              ['Memory summary', 'Yes'],
            ]}
          />
        </Card>

        <Card badge="extracted" badgeColor="orange">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Extracted data only</h4>
          <p style={{ color: 'var(--text-muted)' }}>History is cleared. Only <strong style={{ color: 'var(--text)' }}>extraction variables</strong> (<Code>extraction.*</Code>) are preserved.</p>
          <Table
            headers={['Data', 'Transferred?']}
            rows={[
              ['History (messages)', 'No — replaced by a summary'],
              [<><Code>extraction.*</Code></>, 'Yes'],
              [<><Code>http.*</Code></>, 'No — deleted'],
              ['Memory summary', 'No — deleted'],
            ]}
          />
        </Card>

        <Card badge="none" badgeColor="red">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Clean slate</h4>
          <p style={{ color: 'var(--text-muted)' }}>Nothing is transmitted. The new agent starts from <strong style={{ color: 'var(--text)' }}>absolute zero</strong>.</p>
          <Table
            headers={['Data', 'Transferred?']}
            rows={[
              ['History (messages)', 'No'],
              ['Runtime variables', 'No — all deleted'],
              ['Memory summary', 'No'],
            ]}
          />
        </Card>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>The transfer mode is set on the handoff tool.</strong> It's a per-connection design choice between agents. <Code>full</Code> for total continuity, <Code>extracted</Code> to pass data without noise, <Code>none</Code> when the next agent should know nothing.
        </InfoBox>

        <h4 className="text-[16px] font-semibold mt-8 mb-2" style={{ color: 'var(--text)' }}>Combining both systems</h4>
        <Pre>{`Reception Agent (20 conversation messages)
  │
  │ sliding window → keeps last 10 turns
  │ summarization → summarizes the first 10
  │
  ├── handoff (context_options: "extracted") ──→ Support Agent
  │     │
  │     │ history = [extracted data summary]
  │     │ variables = extraction.* only
  │     │ memory summary = deleted
  │     │
  │     │ ... 15 support conversation messages ...
  │     │
  │     ├── handoff (context_options: "full") ──→ Billing Agent
  │           │
  │           │ history = full Support Agent history
  │           │ variables = all (support + reception.extraction.*)
  │           │ memory summary = Support Agent's summary`}</Pre>

        <SectionSep />

        {/* ── Debug Chat ── */}
        <h2 id="debug-chat" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Debug Chat</h2>
        <p className="text-[15px] mb-6" style={{ color: 'var(--text-muted)' }}>
          The built-in chat simulator includes a real-time debug panel. It exposes everything happening under the hood on each exchange: the prompt sent to the LLM, token consumption, active tasks, tool calls, and evaluated conditions.
        </p>

        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Context panel (right side)</h3>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          The right sidebar displays the <strong style={{ color: 'var(--text)' }}>exact context</strong> sent to the LLM on each iteration. It updates in real time during streaming.
        </p>
        <Table
          headers={['Block', 'Description']}
          rows={[
            [<Code>Pipeline</Code>, 'The pipeline global prompt (if applicable) — first context layer'],
            [<Code>Agent</Code>, 'The active agent\'s system prompt — identity and base behavior'],
            [<Code>System</Code>, 'Engine-injected instructions: active task, memory, available tools'],
            [<Code>Messages</Code>, 'Conversation history (user/assistant/tool) as seen by the LLM'],
          ]}
        />

        <InfoBox>
          Each block corresponds to a <strong style={{ color: 'var(--text)' }}>prompt layer</strong> described in the Architecture section. The panel lets you visually verify that layers stack correctly and that the context sent to the LLM is as expected.
        </InfoBox>

        <h3 className="text-[18px] font-semibold mb-3 mt-10" style={{ color: 'var(--text)' }}>Token Usage</h3>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          The Context panel header displays real-time token consumption:
        </p>
        <Table
          headers={['Metric', 'Description']}
          rows={[
            [<Code>input</Code>, 'Tokens sent to the LLM (prompt + context + history) — cumulative across the session'],
            [<Code>output</Code>, 'Tokens generated by the LLM (response + tool calls) — cumulative across the session'],
            [<Code>msgs</Code>, 'Total message count in the current context'],
          ]}
        />

        <WarningBox>
          <strong style={{ color: '#fb923c' }}>Compaction:</strong> When the context exceeds the configured limit, the engine automatically compacts the history. A <Code>CONTEXT COMPACTED</Code> block appears in the timeline, and the Context panel shows the generated summary.
        </WarningBox>

        <h3 className="text-[18px] font-semibold mb-3 mt-10" style={{ color: 'var(--text)' }}>Debug timeline (conversation feed)</h3>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          Debug events are interspersed in the conversation feed, between user and assistant messages. Each event is typed and color-coded:
        </p>
        <Table
          headers={['Event', 'Color', 'Description']}
          rows={[
            [<Code>TASK</Code>, 'Blue', 'The agent enters a new task — shows the activated task name'],
            [<Code>TASK EXIT</Code>, 'Blue', 'A task completes — shows the exit tool that triggered the transition'],
            [<Code>TOOL CALL</Code>, 'Orange', 'The LLM decides to call a tool — shows name and arguments'],
            [<Code>TOOL RESULT</Code>, 'Orange', 'The result returned by the tool — expandable if content is long'],
            [<Code>CONDITION</Code>, 'Pink', 'A condition on an edge is evaluated — shows the variable, operator, expected value, and result (TRUE/FALSE)'],
            [<Code>CONTEXT COMPACTED</Code>, 'Green', 'History was compacted — shows the generated summary'],
            [<Code>HANDOFF</Code>, 'Purple', 'Transfer to another agent in a pipeline — shows target and reason'],
            [<Code>INFO</Code>, 'Gray', 'General engine information (max iterations, interruption…)'],
          ]}
        />

        <h3 className="text-[18px] font-semibold mb-3 mt-10" style={{ color: 'var(--text)' }}>Access</h3>
        <Card>
          <ol className="list-decimal list-inside space-y-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
            <li>Open an agent or pipeline</li>
            <li>Click the <strong style={{ color: 'var(--text)' }}>Chat</strong> button in the header</li>
            <li>The simulator opens fullscreen with the <strong style={{ color: 'var(--text)' }}>Context</strong> panel on the right</li>
            <li>Send a message — debug events and LLM context appear in real time</li>
          </ol>
        </Card>

        <SectionSep />

        {/* ── API Keys ── */}
        <h2 id="api-keys" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>API Keys</h2>
        <p className="text-[15px] mb-6" style={{ color: 'var(--text-muted)' }}>
          API keys let you expose your agents and pipelines via a secure REST API. Each key is bound to a specific agent or pipeline, with configurable rate limiting and built-in usage tracking.
        </p>

        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Create an API key</h3>

        <Card>
          <h4 className="text-[16px] font-semibold mb-3 mt-0" style={{ color: 'var(--text)' }}>Steps</h4>
          <ol className="list-decimal list-inside space-y-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
            <li>Open the <strong style={{ color: 'var(--text)' }}>API Keys</strong> section from the navigation bar</li>
            <li>Click <strong style={{ color: 'var(--text)' }}>New key</strong></li>
            <li>Give your key a descriptive name (e.g. <Code>prod-chatbot</Code>, <Code>test-support</Code>)</li>
            <li>Choose the type: <strong style={{ color: 'var(--text)' }}>Agent</strong> or <strong style={{ color: 'var(--text)' }}>Pipeline</strong></li>
            <li>Select the target entity and optionally a specific version</li>
            <li>Confirm — the full key is displayed <strong style={{ color: 'var(--text)' }}>only once</strong></li>
          </ol>
        </Card>

        <WarningBox>
          <strong style={{ color: '#fb923c' }}>Important:</strong> The full API key is only displayed at creation time. Copy it immediately and store it securely (environment variable, secret manager). After closing, only the first and last characters will be visible.
        </WarningBox>

        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Configuration</h3>
        <Table
          headers={['Parameter', 'Description', 'Default']}
          rows={[
            ['Rate limit', 'Maximum number of requests allowed per minute', '100'],
            ['Version', 'Specific agent/pipeline version to use (optional)', 'Latest version'],
            ['Enabled / Disabled', 'Temporarily suspend access without deleting the key', 'Enabled'],
          ]}
        />

        <InfoBox>
          Each key has automatic counters: <strong style={{ color: 'var(--text)' }}>requests</strong> (API calls), <strong style={{ color: 'var(--text)' }}>sessions</strong> (unique conversations), and <strong style={{ color: 'var(--text)' }}>last used</strong>. These metrics are visible in the key detail panel.
        </InfoBox>

        <SectionSep />

        {/* ── Integration ── */}
        <h2 id="api-usage" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Integration</h2>
        <p className="text-[15px] mb-6" style={{ color: 'var(--text-muted)' }}>
          The API uses the <strong style={{ color: 'var(--text)' }}>Server-Sent Events (SSE)</strong> protocol for real-time streaming. The API key determines the target agent or pipeline.
        </p>

        {/* ── API Reference ── */}
        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Endpoints</h3>
        <Table
          headers={['Method', 'URL', 'Description']}
          rows={[
            [<Code>POST</Code>, <Code>/api/v1/chat</Code>, 'Send a message (SSE streaming response)'],
            [<Code>POST</Code>, <Code>{'/api/v1/sessions/:id/end'}</Code>, 'Close a session and retrieve stats'],
          ]}
        />
        <p className="text-[14px] mt-3 mb-6" style={{ color: 'var(--text-muted)' }}>
          All endpoints require the <Code>Authorization: Bearer ak-...</Code> header
        </p>

        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Request — Chat</h3>
        <Pre>{`POST /api/v1/chat
Content-Type: application/json
Authorization: Bearer ak-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Pre>
        <Table
          headers={['Field', 'Type', 'Description']}
          rows={[
            [<Code>messages</Code>, <Code>{'Array<{role, content}>'}</Code>, 'Array of messages. Can be empty [] to let the agent initiate the conversation.'],
            [<Code>session_id</Code>, <Code>string?</Code>, 'Optional — auto-generated if absent'],
          ]}
        />

        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>SSE Events</h3>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          The stream uses <strong style={{ color: 'var(--text)' }}>named events</strong>. The type is in <Code>event:</Code>, the data in <Code>data:</Code> (JSON).
        </p>
        <Table
          headers={['Event', 'Data', 'Description']}
          rows={[
            [<Code>session</Code>, <Code>{'{ id }'}</Code>, 'First event — session ID to keep'],
            [<Code>token</Code>, <Code>{'{ t }'}</Code>, 'Text fragment (streaming)'],
            [<Code>done</Code>, <Code>{'{}'}</Code>, 'End of stream'],
            [<Code>error</Code>, <Code>{'{ error }'}</Code>, 'Error'],
            [<Code>debug</Code>, <Code>{'{ type, content }'}</Code>, 'Debug (task_enter, task_exit, info…)'],
          ]}
        />

        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Session closure</h3>
        <Pre>{`POST /api/v1/sessions/:session_id/end
Authorization: Bearer ak-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Pre>
        <Pre>{`// Response
{
  "message": "Session ended",
  "session_id": "session-uuid"
}`}</Pre>

        <SectionSep />

        {/* ── Browser SDK ── */}
        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Browser integration — Full class</h3>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          Copy-paste ready class for your project. Handles streaming, automatic abort (new message while the agent is speaking), agent-initiated conversations, session management, and closure.
        </p>
        <Pre>{`class AgentChat {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.sessionId = null;
    this.controller = null; // AbortController for the current request
  }

  /**
   * Sends a message to the agent and streams the response.
   * - message (string|null): the text to send.
   *   Pass null to let the agent initiate the conversation.
   * - If the agent is already responding, the previous response
   *   is automatically interrupted (abort on client + server).
   *
   * Callbacks:
   *  onToken(token, fullText)  — called on each received fragment
   *  onDone(fullText)          — called when the response is complete
   *  onError(message)          — called on error
   */
  async send(message, { onToken, onDone, onError } = {}) {
    // If a request is in progress, abort it before sending
    this.abort();
    this.controller = new AbortController();

    const body = {
      messages: message ? [{ role: "user", content: message }] : [],
    };
    if (this.sessionId) body.session_id = this.sessionId;

    let res;
    try {
      res = await fetch(this.apiUrl + "/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${this.apiKey}\`,
        },
        body: JSON.stringify(body),
        signal: this.controller.signal,
      });
    } catch (e) {
      if (e.name === "AbortError") return null;
      throw e;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      onError?.(err.error || \`HTTP \${res.status}\`);
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    let currentEvent = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ") || !currentEvent) continue;

          const data = JSON.parse(line.slice(6));

          switch (currentEvent) {
            case "session":
              this.sessionId = data.id;
              break;
            case "token":
              fullResponse += data.t;
              onToken?.(data.t, fullResponse);
              break;
            case "done":
              this.controller = null;
              onDone?.(fullResponse);
              return fullResponse;
            case "error":
              onError?.(data.error);
              this.controller = null;
              return null;
          }
          currentEvent = null;
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") throw e;
    }

    this.controller = null;
    return fullResponse;
  }

  /** Interrupts the current response (Stop button). */
  abort() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  /** true if the agent is currently responding. */
  get isStreaming() {
    return this.controller !== null;
  }

  /** Closes the session and returns usage stats. */
  async endSession() {
    if (!this.sessionId) return null;
    const res = await fetch(
      this.apiUrl + \`/api/v1/sessions/\${this.sessionId}/end\`,
      {
        method: "POST",
        headers: { "Authorization": \`Bearer \${this.apiKey}\` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    this.sessionId = null;
    return data;
  }
}`}</Pre>

        <h4 className="text-[16px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Usage example in a chat</h4>
        <Pre>{`const chat = new AgentChat("http://localhost:3001", "ak-your_key_here");

const callbacks = {
  onToken(token, fullText) {
    document.getElementById("response").textContent = fullText;
  },
  onDone(finalText) {
    console.log("Complete response:", finalText);
  },
  onError(err) {
    console.error("Error:", err);
  },
};

// ── The agent initiates the conversation (no user message) ──
await chat.send(null, callbacks);

// ── The user responds ──
await chat.send("I'd like a Margherita pizza", callbacks);

// ── If the user sends while the agent is speaking ──
// → send() automatically interrupts the current response.
//   No need for a Stop button or calling abort() manually.

// ── End of conversation ──
await chat.endSession();`}</Pre>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>Automatic abort:</strong> If the user sends a message while the agent is responding, <Code>send()</Code> automatically interrupts the current response before launching the new request. The server detects the disconnection and stops generation. Already-produced text is preserved in the session history.
        </InfoBox>

        <SectionSep />

        {/* ── cURL ── */}
        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Quick example — cURL</h3>
        <Pre>{`# The agent initiates the conversation (empty messages)
curl -N -X POST http://localhost:3001/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ak-your_key_here" \\
  -d '{"messages": []}'

# Send a user message (with session_id from the first call)
curl -N -X POST http://localhost:3001/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ak-your_key_here" \\
  -d '{"messages": [{"role": "user", "content": "A Margherita pizza"}], "session_id": "SESSION_ID"}'

# Close the session
curl -X POST http://localhost:3001/api/v1/sessions/SESSION_ID/end \\
  -H "Authorization: Bearer ak-your_key_here"`}</Pre>

        <SectionSep />

        {/* ── Pipeline ── */}
        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Pipeline Integration</h3>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          The API is <strong style={{ color: 'var(--text)' }}>identical</strong> for agents and pipelines — only the API key changes. A pipeline key points to the pipeline, an agent key points to the agent. The endpoint remains <Code>/api/v1/chat</Code>.
        </p>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          The only difference: in a pipeline, the agent can <strong style={{ color: 'var(--text)' }}>transfer the conversation</strong> to another agent (handoff). When this happens, the server sends two additional events before resuming streaming with the new agent:
        </p>
        <Table
          headers={['Event', 'Data', 'Description']}
          rows={[
            [<Code>flush</Code>, <Code>{'{}'}</Code>, 'The current agent finished speaking — save streamed text as a complete message before the agent switch'],
            [<Code>transfer</Code>, <Code>{'{ content }'}</Code>, 'Transfer message displayed to the user (e.g. "Let me transfer you to my colleague")'],
          ]}
        />
        <p className="text-[14px] mt-3 mb-6" style={{ color: 'var(--text-muted)' }}>
          After these events, <Code>token</Code> events resume — it's the new agent speaking. Everything happens in the same SSE stream.
        </p>

        <h3 className="text-[18px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Browser integration — Pipeline</h3>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>
          The <Code>AgentChat</Code> class also works for pipelines. Just pass the pipeline API key and handle the two additional events via an <Code>onTransfer</Code> callback.
        </p>
        <Pre>{`class PipelineChat extends AgentChat {
  /**
   * Sends a message and streams the response.
   * In addition to AgentChat callbacks:
   *  onTransfer(message)  — called when the agent hands off (handoff)
   */
  async send(message, { onToken, onDone, onError, onTransfer } = {}) {
    this.abort();
    this.controller = new AbortController();

    const body = {
      messages: message ? [{ role: "user", content: message }] : [],
    };
    if (this.sessionId) body.session_id = this.sessionId;

    let res;
    try {
      res = await fetch(this.apiUrl + "/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${this.apiKey}\`,
        },
        body: JSON.stringify(body),
        signal: this.controller.signal,
      });
    } catch (e) {
      if (e.name === "AbortError") return null;
      throw e;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      onError?.(err.error || \`HTTP \${res.status}\`);
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    let currentEvent = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ") || !currentEvent) continue;

          const data = JSON.parse(line.slice(6));

          switch (currentEvent) {
            case "session":
              this.sessionId = data.id;
              break;
            case "token":
              fullResponse += data.t;
              onToken?.(data.t, fullResponse);
              break;
            case "flush":
              // Current agent finished — save its text
              if (fullResponse) {
                onDone?.(fullResponse);
                fullResponse = "";
              }
              break;
            case "transfer":
              // Transfer message ("Let me transfer you to...")
              onTransfer?.(data.content);
              break;
            case "done":
              this.controller = null;
              onDone?.(fullResponse);
              return fullResponse;
            case "error":
              onError?.(data.error);
              this.controller = null;
              return null;
          }
          currentEvent = null;
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") throw e;
    }

    this.controller = null;
    return fullResponse;
  }
}`}</Pre>

        <h4 className="text-[16px] font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>Usage example — Pipeline</h4>
        <Pre>{`const chat = new PipelineChat("http://localhost:3001", "ak-pipeline_key_here");

const messagesDiv = document.getElementById("messages");
let currentBubble = null;

function addBubble(text) {
  const div = document.createElement("div");
  div.textContent = text;
  messagesDiv.appendChild(div);
  return div;
}

const callbacks = {
  onToken(token, fullText) {
    if (!currentBubble) currentBubble = addBubble("");
    currentBubble.textContent = fullText;
  },
  onDone(finalText) {
    // Agent text complete — ready for the next one
    currentBubble = null;
  },
  onTransfer(message) {
    // "Let me transfer you to our sales team"
    addBubble(message);
  },
  onError(err) {
    console.error("Erreur :", err);
  },
};

// ── The entry agent initiates the conversation ──
await chat.send(null, callbacks);

// ── The user responds ──
await chat.send("I'd like a quote", callbacks);
// → The entry agent responds (tokens)
// → flush — its text is saved
// → transfer — "Let me transfer you to our sales team"
// → The new agent responds (tokens)
// → done

// ── End ──
await chat.endSession();`}</Pre>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>Agent or Pipeline?</strong> If you don't use handoffs, the <Code>AgentChat</Code> class is sufficient — even with a pipeline key. <Code>PipelineChat</Code> is only needed if you want to visually separate each agent's responses during a transfer.
        </InfoBox>

        <SectionSep />

        {/* ═══ DATABASE ═══ */}
        <h2 id="database" className="text-[32px] font-bold mb-3 pt-16" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>Database</h2>
        <p className="text-[15px] mb-6" style={{ color: 'var(--text-muted)' }}>
          If you want to modify or set up the project yourself, here are the system's SQL tables. The database uses <strong style={{ color: 'var(--text)' }}>PostgreSQL</strong> with a <strong style={{ color: 'var(--text)' }}>versioned snapshot</strong> model: agents and pipelines only store their name and current version, all content (config, tasks, tools, flow) lives in a versioned JSONB column.
        </p>

        <Card badge="agents" badgeColor="blue">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Agents — metadata</h4>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>Lightweight table that references the agent. All content lives in <Code>agent_versions</Code>.</p>
          <Pre>{`CREATE TABLE agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT now()
);`}</Pre>
        </Card>

        <Card badge="agent_versions" badgeColor="blue">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Agent Versions — full snapshot</h4>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>Each version is a JSONB snapshot containing the config, system prompt, tasks, tools, and flow. Editing an agent creates a new version without touching previous ones.</p>
          <Pre>{`CREATE TABLE agent_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version     INT NOT NULL,
    label       TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    snapshot    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_versions_agent ON agent_versions(agent_id);`}</Pre>
          <p className="mt-3 mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Snapshot structure:</p>
          <Pre>{`{
  "description": "",
  "system_prompt": "",
  "llm_provider": "openai",
  "llm_model": "gpt-4o",
  "llm_config": {},
  "tts_provider": null, "tts_model": null, "tts_config": {},
  "stt_provider": null, "stt_model": null, "stt_config": {},
  "flow_data": { "nodes": [], "edges": [] },
  "tasks": [
    { "id": "uuid", "name": "", "description": "",
      "prompt": "", "exit_condition": "" }
  ],
  "tools": [
    { "id": "uuid", "name": "", "description": "",
      "type": "http", "config": {} }
  ]
}`}</Pre>
        </Card>

        <Card badge="pipelines" badgeColor="purple">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Pipelines — metadata</h4>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>Same logic as agents: lightweight table, content lives in <Code>pipeline_versions</Code>.</p>
          <Pre>{`CREATE TABLE pipelines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT now()
);`}</Pre>
        </Card>

        <Card badge="pipeline_versions" badgeColor="purple">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>Pipeline Versions — full snapshot</h4>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>JSONB snapshot containing the shared prompt, shared tools, and agent wiring flow.</p>
          <Pre>{`CREATE TABLE pipeline_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    version     INT NOT NULL,
    label       TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    snapshot    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pipeline_id, version)
);

CREATE INDEX idx_pipeline_versions_pipeline ON pipeline_versions(pipeline_id);`}</Pre>
          <p className="mt-3 mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Snapshot structure:</p>
          <Pre>{`{
  "description": "",
  "prompt": "",
  "flow_data": { "nodes": [], "edges": [] },
  "tools": [
    { "id": "uuid", "name": "", "description": "",
      "type": "http", "config": {} }
  ]
}`}</Pre>
        </Card>

        <Card badge="api_keys" badgeColor="orange">
          <h4 className="text-[16px] font-semibold mb-2 mt-0" style={{ color: 'var(--text)' }}>API Keys — external access</h4>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>Each key is bound to an agent or pipeline, with rate limiting and usage tracking. The key itself is an <Code>ak-...</Code> token of 48 hex characters.</p>
          <Pre>{`CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID REFERENCES agents(id) ON DELETE CASCADE,
    pipeline_id     UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    key             TEXT NOT NULL UNIQUE,
    version         INT,
    enabled         BOOLEAN DEFAULT true,
    rate_limit      INT DEFAULT 100,
    request_count   INT DEFAULT 0,
    session_count   INT DEFAULT 0,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);`}</Pre>
        </Card>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>Why snapshots?</strong> Each agent or pipeline version is a self-contained JSONB blob. The engine loads the snapshot and runs with it — no JOINs, no dependencies. This enables versioning, rollback, and guarantees that the production agent doesn't change while you're editing the draft.
        </InfoBox>

        <div className="h-32" />
      </div>
    </div>
  )
}

/* ── Main DocPage ── */
export default function DocPage() {
  const [activeSection, setActiveSection] = useState('agent')
  const contentRef = useRef<HTMLDivElement>(null)
  const isNavigatingRef = useRef(false)
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNavigate = (id: string) => {
    isNavigatingRef.current = true
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleSectionVisible = useCallback((id: string) => {
    if (isNavigatingRef.current) {
      // Reset debounce timer — unblock only when scroll stops
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
      scrollEndTimerRef.current = setTimeout(() => {
        isNavigatingRef.current = false
      }, 150)
      return
    }
    setActiveSection(id)
  }, [])

  return (
    <div className="flex h-full w-full overflow-hidden">
      <DocSidebar activeId={activeSection} onNavigate={handleNavigate} />
      <DocContent onSectionVisible={handleSectionVisible} />
    </div>
  )
}

import type { ChatSession } from '../queries/chatSessions.js';
import type { Tool } from '../types/agents.js';

// ── Basic types ─────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolRoute {
  taskName: string;
  label?: string;
  condition?: {
    variable: string;
    operator: string;
    value: string;
  };
}

export interface RoutingMaps {
  taskRoutes: Map<string, ToolRoute[]>;
  agentRoutes: ToolRoute[];
}

export interface CanvasOwnership {
  agentToolNames: Set<string>;
  taskToolNames: Map<string, Set<string>>;
}

// ── Engine emitter (decoupled from Express) ─────────────

export interface EngineEmitter {
  emit(event: string, data: any): void;
}

// ── Engine context (input) ──────────────────────────────

export interface EngineContext {
  agent: any;
  tasks: any[];
  allTools: Map<string, Tool>;           // name → Tool (all canvas + pipeline tools)
  canvasAgentTools: Tool[];              // agent-level tools from canvas
  canvasTaskToolMap: Map<string, Tool[]>; // taskName → task-level tools
  session: ChatSession;
  restoredHistory: any[];
  contextSummary: string | null;
  runtimeVariables: Record<string, any>;
  completedTasks: Set<string>;
  lastUserMsg: { role: string; content: string } | null;
  // Pipeline-specific
  pipelineName?: string;
  pipelinePrompt?: string;
  transferredMsgCount?: number;
  pendingHandoff?: any;
}

// ── Engine options ──────────────────────────────────────

export interface EngineOptions {
  pipelineFlowData?: any;
  currentAgentId?: string;
}

// ── Engine result (output) ──────────────────────────────

export interface EngineResult {
  history: any[];
  contextSummary: string | null;
  runtimeVariables: Record<string, any>;
  completedTasks: string[];
  activeTaskName: string | null;
  handoff?: {
    targetAgentId: string;
    targetAgentVersion: number | null;
    contextOptions: string[];
    transferMessage: string | null;
    pendingHandoff: any;
    historyBeforeSwitch: any[];
  };
}

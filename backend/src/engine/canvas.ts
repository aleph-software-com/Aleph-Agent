import type { ToolRoute, RoutingMaps, CanvasOwnership } from './types.js';

/** Find the initial task from canvas edges (Start/Agent → Task) */
export function findInitialTask(flowData: any, tasks: any[]): any | null {
  if (!flowData || !flowData.nodes || !flowData.edges) return null;

  const nodes = flowData.nodes as any[];
  const edges = flowData.edges as any[];
  const taskByName = new Map(tasks.map((t: any) => [t.name, t]));

  const startOrAgentIds = new Set(
    nodes.filter((n) => n.type === 'start' || n.type === 'agent').map((n) => n.id),
  );

  for (const edge of edges) {
    if (!startOrAgentIds.has(edge.source)) continue;
    const target = nodes.find((n) => n.id === edge.target);
    if (target?.type === 'task' && target.data?.label) {
      const task = taskByName.get(target.data.label);
      if (task) return task;
    }
  }

  return null;
}

/**
 * Build routing maps from canvas edges.
 * Separates task-level routes (task → task) from agent-level routes (agent → task).
 */
export function buildRoutingMaps(flowData: any, tasks: any[]): RoutingMaps {
  const taskRoutes = new Map<string, ToolRoute[]>();
  const agentRoutes: ToolRoute[] = [];
  if (!flowData || !flowData.nodes || !flowData.edges) return { taskRoutes, agentRoutes };

  const nodes = flowData.nodes as any[];
  const edges = flowData.edges as any[];
  const nodeById = new Map<string, any>();
  for (const n of nodes) nodeById.set(n.id, n);

  const taskNames = new Set(tasks.map((t: any) => t.name));

  for (const edge of edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) continue;
    if (targetNode.type !== 'task') continue;

    const toLabel = targetNode.data?.label;
    if (!toLabel || !taskNames.has(toLabel)) continue;

    const isTask = sourceNode.type === 'task';
    const isAgent = sourceNode.type === 'agent';
    if (!isTask && !isAgent) continue;

    const route: ToolRoute = { taskName: toLabel };
    if (edge.data && edge.data.variable && edge.data.operator) {
      route.condition = {
        variable: edge.data.variable,
        operator: edge.data.operator,
        value: edge.data.value || '',
      };
      route.label = edge.data.label || edge.label || `→ ${toLabel}`;
    }

    if (isTask) {
      const fromLabel = sourceNode.data?.label;
      if (!fromLabel) continue;
      if (!taskRoutes.has(fromLabel)) taskRoutes.set(fromLabel, []);
      taskRoutes.get(fromLabel)!.push(route);
    } else {
      agentRoutes.push(route);
    }
  }

  return { taskRoutes, agentRoutes };
}

/**
 * Resolve canvas tool ownership from flow_data edges.
 * Returns which tools are agent-level (always available) vs task-level (available per task).
 */
export function resolveCanvasOwnership(flowData: any): CanvasOwnership {
  const agentToolNames = new Set<string>();
  const taskToolNames = new Map<string, Set<string>>();

  if (!flowData || !flowData.nodes || !flowData.edges) return { agentToolNames, taskToolNames };

  const nodes = flowData.nodes as any[];
  const edges = flowData.edges as any[];
  const nodeById = new Map<string, any>();
  for (const n of nodes) nodeById.set(n.id, n);

  for (const edge of edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    if ((sourceNode.type === 'agent' || sourceNode.type === 'start') && targetNode.type === 'tool') {
      const toolLabel = targetNode.data?.label;
      if (toolLabel) agentToolNames.add(toolLabel);
    }

    if (sourceNode.type === 'task' && targetNode.type === 'tool') {
      const taskLabel = sourceNode.data?.label;
      const toolLabel = targetNode.data?.label;
      if (taskLabel && toolLabel) {
        if (!taskToolNames.has(taskLabel)) taskToolNames.set(taskLabel, new Set());
        taskToolNames.get(taskLabel)!.add(toolLabel);
      }
    }
  }

  return { agentToolNames, taskToolNames };
}

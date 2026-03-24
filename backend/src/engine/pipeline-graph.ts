export interface ResolvedAgent {
  agentId: string;
  agentVersion: number | null;
}

/** Resolve the entry agent from pipeline flow_data (Start → first pipeline-agent) */
export function resolveEntryAgent(flowData: any): ResolvedAgent | null {
  if (!flowData?.nodes?.length || !flowData?.edges?.length) return null;
  const startNode = flowData.nodes.find((n: any) => n.type === 'start');
  if (!startNode) return null;
  for (const edge of flowData.edges) {
    if (edge.source !== startNode.id) continue;
    const target = flowData.nodes.find((n: any) => n.id === edge.target);
    if (target?.type === 'pipeline-agent' && target.data?.agentId) {
      return { agentId: target.data.agentId, agentVersion: target.data.agentVersion ?? null };
    }
  }
  return null;
}

/** Resolve the pinned version for a given agentId from pipeline flow_data */
export function resolveAgentVersion(flowData: any, agentId: string): number | null {
  if (!flowData?.nodes?.length) return null;
  const node = flowData.nodes.find(
    (n: any) => n.type === 'pipeline-agent' && n.data?.agentId === agentId,
  );
  return node?.data?.agentVersion ?? null;
}

/** Resolve handoff target from pipeline flow (current agent handoff port → target agent) */
export function resolveHandoffTarget(
  flowData: any,
  currentAgentId: string,
  handoffToolName: string,
): ResolvedAgent | null {
  if (!flowData?.nodes?.length || !flowData?.edges?.length) return null;
  const currentNode = flowData.nodes.find(
    (n: any) => n.type === 'pipeline-agent' && n.data?.agentId === currentAgentId,
  );
  if (!currentNode) return null;
  const sanitized = handoffToolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  for (const edge of flowData.edges) {
    if (edge.source !== currentNode.id) continue;
    if (edge.sourceHandle !== handoffToolName && edge.sourceHandle !== sanitized) continue;
    const target = flowData.nodes.find((n: any) => n.id === edge.target);
    if (target?.type === 'pipeline-agent' && target.data?.agentId) {
      return { agentId: target.data.agentId, agentVersion: target.data.agentVersion ?? null };
    }
  }
  return null;
}

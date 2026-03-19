/** Message #1 — identité de l'agent (system prompt) */
export function buildIdentityPrompt(agentPrompt: string): string {
  return agentPrompt || '';
}

/** Message #2 — task active (mis à jour à chaque transition, null si aucune) */
export function buildTaskPrompt(activeTask: any | null): string | null {
  if (!activeTask) return null;
  return `TASK EN COURS: ${activeTask.name}\n`
    + (activeTask.description ? `OBJECTIF: ${activeTask.description}\n` : '')
    + (activeTask.prompt ? `\n${activeTask.prompt}` : '');
}

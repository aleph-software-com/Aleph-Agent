// ── Variable System ──
// Calcule les variables disponibles à partir de tous les tools en scope (agent + tasks)
// pour alimenter le dropdown du body mapping HTTP.

export interface ToolVariable {
  id: string        // ex: "extraction.collect_info.email" ou "http.create_client.id"
  label: string     // ex: "email" ou "id"
  group: string     // ex: "Extraction · collect_info" ou "HTTP · create_client"
}

export function computeAvailableVariables(allTools: any[]): ToolVariable[] {
  const variables: ToolVariable[] = []

  for (const tool of allTools) {
    switch (tool.type) {
      case 'extraction': {
        const config = tool.config || {}
        for (const field of config.fields || []) {
          variables.push({
            id: `extraction.${tool.name}.${field.name}`,
            label: field.name,
            group: `Extraction · ${tool.name}`,
          })
        }
        break
      }
      case 'http': {
        // Les tools HTTP produisent des variables à partir de la réponse API.
        // Au design-time on ne connaît pas la shape exacte de la réponse,
        // donc on expose une variable générique "response" par tool HTTP.
        variables.push({
          id: `http.${tool.name}.response`,
          label: 'response',
          group: `HTTP · ${tool.name}`,
        })
        break
      }
      // handoff ne produit pas de variables
    }
  }

  return variables
}

export function groupVariablesBySource(variables: ToolVariable[]): { group: string; items: ToolVariable[] }[] {
  const map = new Map<string, ToolVariable[]>()

  for (const v of variables) {
    if (!map.has(v.group)) map.set(v.group, [])
    map.get(v.group)!.push(v)
  }

  return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
}

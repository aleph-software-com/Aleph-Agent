import type { ToolRoute, EngineEmitter } from './types.js';

/** Evaluate a condition (variable operator value) against a tool result */
export function evaluateCondition(
  condition: { variable: string; operator: string; value: string },
  toolResult: string,
): boolean {
  let data: any;
  try { data = JSON.parse(toolResult); } catch { data = toolResult; }

  let actual: any;
  if (typeof data === 'object' && data !== null) {
    actual = condition.variable.split('.').reduce((obj, key) => {
      return obj && typeof obj === 'object' ? obj[key] : undefined;
    }, data);
  } else {
    actual = data;
  }

  const expected = condition.value;
  const actualStr = actual !== undefined && actual !== null ? String(actual) : '';

  switch (condition.operator) {
    case '==': return actualStr === expected;
    case '!=': return actualStr !== expected;
    case '>': return Number(actualStr) > Number(expected);
    case '<': return Number(actualStr) < Number(expected);
    case '>=': return Number(actualStr) >= Number(expected);
    case '<=': return Number(actualStr) <= Number(expected);
    case 'contient': return actualStr.includes(expected);
    default: return false;
  }
}

/** Resolve the next task by evaluating route conditions against runtime variables */
export function resolveTaskRoute(
  routes: ToolRoute[],
  runtimeVars: Record<string, any>,
  emitter?: EngineEmitter,
  scope: 'task' | 'agent' = 'task',
): string | null {
  let fallback: string | null = null;

  for (const route of routes) {
    if (!route.condition) { fallback = route.taskName; continue; }

    const actual = runtimeVars[route.condition.variable] ?? '';
    const actualStr = actual !== undefined && actual !== null ? String(actual) : '';
    const result = evaluateCondition(route.condition, JSON.stringify(actual));

    if (emitter) {
      emitter.emit('debug', {
        type: 'condition_eval',
        content: `[${scope}] ${route.condition.variable} ${route.condition.operator} "${route.condition.value}" → ${result ? 'VRAI' : 'FAUX'}`,
        timestamp: new Date().toISOString(),
        label: route.label || `→ ${route.taskName}`,
        variable: route.condition.variable,
        operator: route.condition.operator,
        value: route.condition.value,
        actual: actualStr,
        result,
        scope,
      });
    }

    if (result) return route.taskName;
  }

  return fallback;
}

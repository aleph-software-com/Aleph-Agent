import OpenAI from 'openai';
import type { Tool, HttpConfig, ExtractionConfig, HandoffConfig } from '../types/agents.js';

export function resolveVariable(variableId: string, runtimeVars: Record<string, any>): any {
  return runtimeVars[variableId] ?? null;
}

/** Convert a DB tool record to OpenAI function calling format */
export function toOpenAITool(t: Tool): OpenAI.Chat.Completions.ChatCompletionTool {
  const sanitizedName = t.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  let parameters: Record<string, any>;

  switch (t.type) {
    case 'extraction': {
      const config = t.config as ExtractionConfig;
      const props: Record<string, any> = {};
      const required: string[] = [];
      for (const field of config.fields || []) {
        const jsonType = field.type === 'number' ? 'number' : field.type === 'boolean' ? 'boolean' : 'string';
        props[field.name] = { type: jsonType, description: field.description };
        required.push(field.name);
      }
      parameters = { type: 'object', properties: props, required };
      break;
    }
    case 'handoff': {
      parameters = {
        type: 'object',
        properties: { reason: { type: 'string', description: 'Raison du transfert' } },
        required: [],
      };
      break;
    }
    case 'http':
    default: {
      const config = t.config as HttpConfig;
      const props: Record<string, any> = {};
      const required: string[] = [];
      for (const field of config.body_fields || []) {
        if (field.value_mode === 'llm') {
          props[field.key] = { type: field.field_type || 'string', description: field.description || field.key };
          required.push(field.key);
        }
      }
      parameters = { type: 'object', properties: props, required };
      break;
    }
  }

  return {
    type: 'function',
    function: { name: sanitizedName, description: t.description || `Tool: ${t.name}`, parameters },
  };
}

/** Execute a tool and return result + extracted variables */
export async function executeTool(
  tool: Tool,
  parsedArgs: Record<string, any>,
  runtimeVariables: Record<string, any>,
): Promise<{ result: string; variables: Record<string, any>; debugMsg: string }> {
  const variables: Record<string, any> = {};
  let result = '{}';
  let debugMsg = '';

  switch (tool.type) {
    case 'http': {
      const config = tool.config as HttpConfig;
      let body: string | undefined;
      if (config.method !== 'GET') {
        const bodyObj: Record<string, any> = {};
        for (const field of config.body_fields || []) {
          if (field.value_mode === 'fixed') bodyObj[field.key] = field.fixed_value;
          else if (field.value_mode === 'variable') bodyObj[field.key] = resolveVariable(field.variable_id || '', runtimeVariables);
          else if (field.value_mode === 'llm') bodyObj[field.key] = parsedArgs[field.key];
        }
        body = JSON.stringify(bodyObj);
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      for (const h of config.headers || []) headers[h.key] = h.value;

      const resp = await fetch(config.url, { method: config.method || 'POST', headers, body });
      result = await resp.text();

      try {
        const jsonResp = JSON.parse(result);
        if (typeof jsonResp === 'object' && jsonResp !== null) {
          for (const [key, val] of Object.entries(jsonResp)) {
            variables[`http.${tool.name}.${key}`] = val;
          }
        }
      } catch {
        variables[`http.${tool.name}.response`] = result;
      }
      debugMsg = `${resp.status} (${result.substring(0, 200)})`;
      break;
    }

    case 'extraction': {
      const config = tool.config as ExtractionConfig;
      result = JSON.stringify(parsedArgs);
      for (const field of config.fields || []) {
        if (parsedArgs[field.name] !== undefined) {
          variables[`extraction.${tool.name}.${field.name}`] = parsedArgs[field.name];
        }
      }
      debugMsg = `extracted: ${result.substring(0, 200)}`;
      break;
    }

    case 'handoff': {
      const config = tool.config as HandoffConfig;
      result = JSON.stringify({
        handoff: true,
        target_type: config.target_type,
        transfer_message: config.transfer_message,
        context_options: config.context_options,
        reason: parsedArgs.reason || '',
      });
      debugMsg = `handoff to ${config.target_type}`;
      break;
    }
  }

  return { result, variables, debugMsg };
}

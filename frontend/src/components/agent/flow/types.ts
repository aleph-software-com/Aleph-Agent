export interface TaskDef {
  id: string
  name: string
}

export interface ToolDef {
  id: string
  name: string
  type?: string
  config?: Record<string, unknown>
}

export interface EdgeCondition {
  [key: string]: unknown
  label: string
  variable: string
  operator: string
  value: string
}

export type ToolOverride = {
  name?: string
  description?: string
}

export type ToolOverrides = Record<string, ToolOverride>

export interface Tool {
  name: string
  description?: string
  isInitialEnabled?: boolean
  originalName?: string
  originalDescription?: string
}

export interface ToolWithMetadata
  extends Omit<Tool, 'description' | 'isInitialEnabled'> {
  description: string
  isInitialEnabled: boolean
  originalName?: string
  originalDescription?: string
}

export interface EditState {
  isOpen: boolean
  tool: Tool | null
  name: string
  description: string
  hasOverrideDescription: boolean
}

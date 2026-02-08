import type { AgentProviderId } from '../../../shared/types/api'

interface BuildAgentLaunchCommandInput {
  provider: AgentProviderId
  prompt: string
  model: string | null
}

export interface AgentLaunchCommand {
  command: string
  args: string[]
  effectiveModel: string | null
}

function normalizeOptionalValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizePrompt(value: string): string {
  const normalized = value.trim()

  if (normalized.length === 0) {
    throw new Error('Agent prompt cannot be empty')
  }

  return normalized
}

export function buildAgentLaunchCommand(input: BuildAgentLaunchCommandInput): AgentLaunchCommand {
  const effectiveModel = normalizeOptionalValue(input.model)
  const prompt = normalizePrompt(input.prompt)

  if (input.provider === 'claude-code') {
    const args = ['--dangerously-skip-permissions']

    if (effectiveModel) {
      args.push('--model', effectiveModel)
    }

    args.push(prompt)

    return {
      command: 'claude',
      args,
      effectiveModel,
    }
  }

  const args = ['--full-auto']

  if (effectiveModel) {
    args.push('--model', effectiveModel)
  }

  args.push(prompt)

  return {
    command: 'codex',
    args,
    effectiveModel,
  }
}

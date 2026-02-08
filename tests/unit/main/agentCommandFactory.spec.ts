import { describe, expect, it } from 'vitest'
import { buildAgentLaunchCommand } from '../../../src/main/infrastructure/agent/AgentCommandFactory'

describe('buildAgentLaunchCommand', () => {
  it('builds codex command with model override', () => {
    const command = buildAgentLaunchCommand({
      provider: 'codex',
      prompt: 'implement login flow',
      model: 'gpt-5.2-codex',
    })

    expect(command.command).toBe('codex')
    expect(command.args).toEqual([
      '--full-auto',
      '--model',
      'gpt-5.2-codex',
      'implement login flow',
    ])
    expect(command.effectiveModel).toBe('gpt-5.2-codex')
  })

  it('builds claude command without model override', () => {
    const command = buildAgentLaunchCommand({
      provider: 'claude-code',
      prompt: 'review failing tests',
      model: null,
    })

    expect(command.command).toBe('claude')
    expect(command.args).toEqual(['--dangerously-skip-permissions', 'review failing tests'])
    expect(command.effectiveModel).toBeNull()
  })

  it('rejects empty prompt', () => {
    expect(() =>
      buildAgentLaunchCommand({
        provider: 'codex',
        prompt: '   ',
        model: null,
      }),
    ).toThrow('Agent prompt cannot be empty')
  })
})

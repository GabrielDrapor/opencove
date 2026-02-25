import { describe, expect, it } from 'vitest'
import {
  resolveDefaultTerminalWindowSize,
  DEFAULT_TERMINAL_WINDOW_BASE_SIZE,
} from '../../../src/renderer/src/features/workspace/components/workspaceCanvas/constants'

describe('workspace canvas default terminal sizing', () => {
  it('applies scale percent to default terminal/agent window size', () => {
    const size = resolveDefaultTerminalWindowSize(80)

    expect(size).toEqual({
      width: Math.round((DEFAULT_TERMINAL_WINDOW_BASE_SIZE.width * 80) / 100),
      height: Math.round((DEFAULT_TERMINAL_WINDOW_BASE_SIZE.height * 80) / 100),
    })
  })

  it('clamps invalid scale values to allowed range', () => {
    const tooSmall = resolveDefaultTerminalWindowSize(-1)
    const tooLarge = resolveDefaultTerminalWindowSize(999)

    expect(tooSmall).toEqual({
      width: 468,
      height: 360,
    })
    expect(tooLarge).toEqual({
      width: 936,
      height: 720,
    })
  })
})

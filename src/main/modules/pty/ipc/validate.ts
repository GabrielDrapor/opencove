import type {
  AttachTerminalInput,
  DetachTerminalInput,
  KillTerminalInput,
  ResizeTerminalInput,
  SnapshotTerminalInput,
  WriteTerminalInput,
} from '../../../../shared/contracts/dto'
import type { SpawnPtyOptions } from '../../../infrastructure/pty/PtyManager'
import { isAbsolute } from 'node:path'

export function normalizeSpawnTerminalPayload(payload: unknown): SpawnPtyOptions {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for pty:spawn')
  }

  const record = payload as Record<string, unknown>
  const cwd = typeof record.cwd === 'string' ? record.cwd.trim() : ''
  const shell = typeof record.shell === 'string' ? record.shell.trim() : ''

  const cols =
    typeof record.cols === 'number' && Number.isFinite(record.cols) && record.cols > 0
      ? Math.floor(record.cols)
      : 80
  const rows =
    typeof record.rows === 'number' && Number.isFinite(record.rows) && record.rows > 0
      ? Math.floor(record.rows)
      : 24

  if (cwd.length === 0) {
    throw new Error('Invalid cwd for pty:spawn')
  }

  if (!isAbsolute(cwd)) {
    throw new Error('pty:spawn requires an absolute cwd')
  }

  return {
    cwd,
    shell: shell.length > 0 ? shell : undefined,
    cols,
    rows,
  }
}

export function normalizeWriteTerminalPayload(payload: unknown): WriteTerminalInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for pty:write')
  }

  const record = payload as Record<string, unknown>
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : ''
  const data = typeof record.data === 'string' ? record.data : ''

  if (sessionId.length === 0) {
    throw new Error('Invalid sessionId for pty:write')
  }

  return { sessionId, data }
}

export function normalizeResizeTerminalPayload(payload: unknown): ResizeTerminalInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for pty:resize')
  }

  const record = payload as Record<string, unknown>
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : ''

  const cols =
    typeof record.cols === 'number' && Number.isFinite(record.cols) && record.cols > 0
      ? Math.floor(record.cols)
      : 80
  const rows =
    typeof record.rows === 'number' && Number.isFinite(record.rows) && record.rows > 0
      ? Math.floor(record.rows)
      : 24

  if (sessionId.length === 0) {
    throw new Error('Invalid sessionId for pty:resize')
  }

  return { sessionId, cols, rows }
}

export function normalizeKillTerminalPayload(payload: unknown): KillTerminalInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for pty:kill')
  }

  const record = payload as Record<string, unknown>
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : ''

  if (sessionId.length === 0) {
    throw new Error('Invalid sessionId for pty:kill')
  }

  return { sessionId }
}

export function normalizeSnapshotPayload(payload: unknown): SnapshotTerminalInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for pty:snapshot')
  }

  const record = payload as Record<string, unknown>
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : ''

  if (sessionId.length === 0) {
    throw new Error('Invalid sessionId for pty:snapshot')
  }

  return { sessionId }
}

export function normalizeAttachTerminalPayload(payload: unknown): AttachTerminalInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for pty:attach')
  }

  const record = payload as Record<string, unknown>
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : ''

  if (sessionId.length === 0) {
    throw new Error('Invalid sessionId for pty:attach')
  }

  return { sessionId }
}

export function normalizeDetachTerminalPayload(payload: unknown): DetachTerminalInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for pty:detach')
  }

  const record = payload as Record<string, unknown>
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : ''

  if (sessionId.length === 0) {
    throw new Error('Invalid sessionId for pty:detach')
  }

  return { sessionId }
}

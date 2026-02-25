import type { Size, TaskPriority } from '../../types'
import {
  DEFAULT_AGENT_SETTINGS,
  MAX_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
  MIN_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
} from '../../../settings/agentConfig'

export const DEFAULT_TERMINAL_WINDOW_BASE_SIZE: Size = {
  width: 780,
  height: 600,
}

export const TASK_SIZE: Size = {
  width: 460,
  height: 280,
}

export const MIN_SIZE: Size = {
  width: 320,
  height: 220,
}

export const MIN_CANVAS_ZOOM = 0.1
export const MAX_CANVAS_ZOOM = 2
export const TRACKPAD_PAN_SCROLL_SPEED = 0.5
export const TRACKPAD_PINCH_SENSITIVITY = 0.01
export const TRACKPAD_GESTURE_LOCK_GAP_MS = 220

export function resolveDefaultTerminalWindowSize(scalePercent: number): Size {
  const normalizedScale = Number.isFinite(scalePercent)
    ? Math.round(scalePercent)
    : DEFAULT_AGENT_SETTINGS.defaultTerminalWindowScalePercent
  const clampedScale = Math.max(
    MIN_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
    Math.min(MAX_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT, normalizedScale),
  )

  return {
    width: Math.round((DEFAULT_TERMINAL_WINDOW_BASE_SIZE.width * clampedScale) / 100),
    height: Math.round((DEFAULT_TERMINAL_WINDOW_BASE_SIZE.height * clampedScale) / 100),
  }
}

export const TASK_PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const TASK_PRIORITIES: TaskPriority[] = TASK_PRIORITY_OPTIONS.map(option => option.value)

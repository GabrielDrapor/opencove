import React from 'react'
import {
  CANVAS_INPUT_MODES,
  MAX_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
  MAX_TERMINAL_FONT_SIZE,
  MAX_UI_FONT_SIZE,
  MIN_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
  MIN_TERMINAL_FONT_SIZE,
  MIN_UI_FONT_SIZE,
  type CanvasInputMode,
} from '../../agentConfig'

export function CanvasSection(props: {
  canvasInputMode: CanvasInputMode
  normalizeZoomOnTerminalClick: boolean
  defaultTerminalWindowScalePercent: number
  terminalFontSize: number
  uiFontSize: number
  onChangeCanvasInputMode: (mode: CanvasInputMode) => void
  onChangeNormalizeZoomOnTerminalClick: (enabled: boolean) => void
  onChangeDefaultTerminalWindowScalePercent: (percent: number) => void
  onChangeTerminalFontSize: (size: number) => void
  onChangeUiFontSize: (size: number) => void
}): React.JSX.Element {
  const {
    canvasInputMode,
    normalizeZoomOnTerminalClick,
    defaultTerminalWindowScalePercent,
    terminalFontSize,
    uiFontSize,
    onChangeCanvasInputMode,
    onChangeNormalizeZoomOnTerminalClick,
    onChangeDefaultTerminalWindowScalePercent,
    onChangeTerminalFontSize,
    onChangeUiFontSize,
  } = props

  return (
    <div className="settings-panel__section" id="settings-section-canvas">
      <h3>Canvas Interaction</h3>
      <div className="settings-panel__row">
        <span>Input Mode</span>
        <select
          id="settings-canvas-input-mode"
          data-testid="settings-canvas-input-mode"
          value={canvasInputMode}
          onChange={event => {
            onChangeCanvasInputMode(event.target.value as CanvasInputMode)
          }}
        >
          {CANVAS_INPUT_MODES.map(mode => (
            <option key={mode} value={mode}>
              {mode === 'auto'
                ? 'Auto (Detect from gestures)'
                : mode === 'trackpad'
                  ? 'Trackpad (Drag selects)'
                  : 'Mouse (Shift+Drag selects)'}
            </option>
          ))}
        </select>
      </div>
      <div className="settings-panel__row">
        <span>Default Terminal/Agent Window Size</span>
        <div className="settings-panel__number-control">
          <input
            id="settings-default-terminal-window-size"
            data-testid="settings-default-terminal-window-size"
            type="number"
            min={MIN_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT}
            max={MAX_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT}
            step={1}
            value={defaultTerminalWindowScalePercent}
            onChange={event => {
              const next = Number(event.target.value)
              onChangeDefaultTerminalWindowScalePercent(next)
            }}
          />
          <span>%</span>
        </div>
      </div>
      <div className="settings-panel__row">
        <span>Terminal Font Size</span>
        <div className="settings-panel__number-control">
          <input
            id="settings-terminal-font-size"
            data-testid="settings-terminal-font-size"
            type="number"
            min={MIN_TERMINAL_FONT_SIZE}
            max={MAX_TERMINAL_FONT_SIZE}
            step={1}
            value={terminalFontSize}
            onChange={event => {
              const next = Number(event.target.value)
              onChangeTerminalFontSize(next)
            }}
          />
          <span>px</span>
        </div>
      </div>
      <div className="settings-panel__row">
        <span>Interface Font Size</span>
        <div className="settings-panel__number-control">
          <input
            id="settings-ui-font-size"
            data-testid="settings-ui-font-size"
            type="number"
            min={MIN_UI_FONT_SIZE}
            max={MAX_UI_FONT_SIZE}
            step={1}
            value={uiFontSize}
            onChange={event => {
              const next = Number(event.target.value)
              onChangeUiFontSize(next)
            }}
          />
          <span>px</span>
        </div>
      </div>
      <label className="settings-provider-card__toggle">
        <input
          id="settings-normalize-zoom-on-terminal-click"
          data-testid="settings-normalize-zoom-on-terminal-click"
          type="checkbox"
          checked={normalizeZoomOnTerminalClick}
          onChange={event => {
            onChangeNormalizeZoomOnTerminalClick(event.target.checked)
          }}
        />
        <span>Click terminal auto-zooms canvas to 100%</span>
      </label>
      <p className="settings-panel__hint">
        Auto mode infers trackpad vs mouse from wheel and pinch input. Window size applies to new
        terminal/agent nodes.
      </p>
    </div>
  )
}

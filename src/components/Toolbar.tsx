type ToolbarProps = {
  autoRotate: boolean
  disabled?: boolean
  onResetView: () => void
  onFitModel: () => void
  onToggleAutoRotate: () => void
  onRotateLeft: () => void
  onRotateRight: () => void
  onRotateUp: () => void
  onRotateDown: () => void
  onResetModelRotation: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onPlaceOnGround: () => void
}

const btnClass =
  'rounded border border-industrial-border bg-industrial-panelAlt px-3 py-1.5 text-xs font-medium text-industrial-text transition hover:border-industrial-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40'

export function Toolbar({
  autoRotate,
  disabled = false,
  onResetView,
  onFitModel,
  onToggleAutoRotate,
  onRotateLeft,
  onRotateRight,
  onRotateUp,
  onRotateDown,
  onResetModelRotation,
  onMoveUp,
  onMoveDown,
  onPlaceOnGround,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-industrial-border bg-industrial-panel/90 px-3 py-2">
      <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.14em] text-industrial-muted">
        Viewport
      </span>
      <button type="button" disabled={disabled} onClick={onResetView} className={btnClass}>
        Reset View
      </button>
      <button type="button" disabled={disabled} onClick={onFitModel} className={btnClass}>
        Fit Model
      </button>

      <span className="mx-1 h-4 w-px bg-industrial-border" />

      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-industrial-muted">
        Rotate
      </span>
      <button type="button" disabled={disabled} onClick={onRotateLeft} title="Rotate left 45°" className={btnClass}>
        ⟲ Left
      </button>
      <button type="button" disabled={disabled} onClick={onRotateRight} title="Rotate right 45°" className={btnClass}>
        Right ⟳
      </button>
      <button type="button" disabled={disabled} onClick={onRotateUp} title="Tilt up 45°" className={btnClass}>
        ⬆ Tilt
      </button>
      <button type="button" disabled={disabled} onClick={onRotateDown} title="Tilt down 45°" className={btnClass}>
        ⬇ Tilt
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onResetModelRotation}
        title="Reset model rotation and height"
        className={btnClass}
      >
        Reset Pose
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleAutoRotate}
        title="Continuously spin the model"
        className={`rounded border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          autoRotate
            ? 'border-industrial-accent bg-industrial-accentDim text-white'
            : 'border-industrial-border bg-industrial-panelAlt text-industrial-text hover:border-industrial-accent hover:text-white'
        }`}
      >
        Auto Rotate
      </button>

      <span className="mx-1 h-4 w-px bg-industrial-border" />

      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-industrial-muted">
        Height
      </span>
      <button type="button" disabled={disabled} onClick={onMoveUp} title="Move model up" className={btnClass}>
        ↑ Raise
      </button>
      <button type="button" disabled={disabled} onClick={onMoveDown} title="Move model down" className={btnClass}>
        ↓ Lower
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onPlaceOnGround}
        title="Place model bottom on ground"
        className={btnClass}
      >
        On Ground
      </button>

      <div className="ml-auto hidden text-[11px] text-industrial-muted 2xl:block">
        LMB Orbit · Wheel Zoom · RMB Pan · Raise/Lower after tilt
      </div>
    </div>
  )
}

import './FocusTimer.css';

export type PomodoroDisplayMode = 'digital' | 'dots';

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_RADIUS = 100;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 628.318

// Per-phase display config (used for labels, colours, and default durations).
const PHASE_CONFIG = {
  focus: {
    label: '',
    short: 'Focus',
    color: '#3a7bd5',
    trackColor: 'rgba(58, 123, 213, 0.15)',
    defaultMins: 25,
  },
  break: {
    label: '🌿 Short Break',
    short: 'Break',
    color: '#00b894',
    trackColor: 'rgba(0, 184, 148, 0.15)',
    defaultMins: 5,
  },
  longBreak: {
    label: '☕ Long Break',
    short: 'Long Break',
    color: '#6c5ce7',
    trackColor: 'rgba(108, 92, 231, 0.15)',
    defaultMins: 15,
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * All props are optional with sensible defaults so the component renders
 * as a visual placeholder now (Phase 2.2) and can be driven by `usePomodoro`
 * in Phase 2.3 without API changes.
 */
export interface FocusTimerProps {
  /** Phase currently active. */
  phase?: keyof typeof PHASE_CONFIG;
  /** Seconds remaining in the current phase (drives display + ring). */
  secondsRemaining?: number;
  /** Total seconds for the current phase (used to compute ring fill). */
  totalSeconds?: number;
  /** Current completed Pomodoro cycle count (0 = none completed yet). */
  cycleIndex?: number;
  /** Total Pomodoro cycles before a long break. */
  totalCycles?: number;
  /** Whether the countdown is currently ticking. */
  isRunning?: boolean;
  /** Start / resume the timer. */
  onStart?: () => void;
  /** Pause the timer. */
  onPause?: () => void;
  /** Skip to the next phase. */
  onSkip?: () => void;
  /** Reset the current phase back to its full duration. */
  onReset?: () => void;
  /** Layout style: 'ring' (default) or 'bar' (horizontal progress) */
  layout?: 'ring' | 'bar';
  /** Display mode: digital timer or dot-grid progress indicator. */
  displayMode?: PomodoroDisplayMode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FocusTimer = ({
  phase = 'focus',
  secondsRemaining,
  totalSeconds,
  cycleIndex = 0,
  totalCycles = 4,
  isRunning = false,
  onStart,
  onPause,
  onSkip,
  onReset,
  layout = 'ring',
  displayMode = 'digital',
}: FocusTimerProps) => {
  const cfg = PHASE_CONFIG[phase];

  // Fall back to the phase default when no live values are provided yet.
  const defaultSecs = cfg.defaultMins * 60;
  const remaining = secondsRemaining ?? defaultSecs;
  const total = totalSeconds ?? defaultSecs;

  // Ring progress: 1.0 = full ring (timer just started), 0.0 = empty (expired)
  const progress = total > 0 ? remaining / total : 1;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const handleToggle = () => {
    if (isRunning) onPause?.();
    else onStart?.();
  };

  const percentElapsed = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
  const totalDots = 150;
  const secondsPerDot = 10;
  const activeDots = Math.min(totalDots, Math.ceil(remaining / secondsPerDot));

  const renderDotGrid = () => (
    <div className="focus-dots-view">
      <div
        className="focus-dot-grid"
        aria-label={`${cfg.short} timer progress with ${activeDots} of ${totalDots} dots active`}
        role="img"
      >
        {Array.from({ length: totalDots }).map((_, index) => {
          const isActive = index < activeDots;
          return <span key={index} className={`focus-dot${isActive ? '' : ' focus-dot--active'}`} />;
        })}
      </div>
    </div>
  );

  if (displayMode === 'dots') {
    return (
      <div className={`focus-timer focus-timer--${phase} focus-timer--dots`}>
        <p className="focus-phase-label">{cfg.label}</p>

        {renderDotGrid()}

        <div className="focus-controls">
          <button
            className="focus-ctrl-btn focus-ctrl-btn--secondary"
            onClick={onSkip}
            disabled={!onSkip}
            aria-label="Skip to next phase"
            title="Skip to next phase"
          >
            ⏭
          </button>

          <button
            className={`focus-ctrl-btn focus-ctrl-btn--primary focus-ctrl-btn--${phase}`}
            onClick={handleToggle}
            disabled={isRunning ? !onPause : !onStart}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
            title={isRunning ? 'Pause' : 'Start timer'}
          >
            {isRunning ? '⏸ Pause' : '▶ Start'}
          </button>

          <button
            className="focus-ctrl-btn focus-ctrl-btn--secondary"
            onClick={onReset}
            disabled={!onReset}
            aria-label="Reset timer"
            title="Reset to start of current phase"
          >
            ↺
          </button>
        </div>
      </div>
    );
  }

  if (layout === 'bar') {
    return (
      <div className={`focus-timer focus-timer--${phase} focus-timer--bar`}>
        <p className="focus-phase-label">{cfg.label}</p>

        <div className="focus-bar-main">
          <div className="focus-bar-time" aria-hidden>
            {formatSeconds(remaining)}
          </div>

          <div
            className="focus-bar-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={total - remaining}
            aria-label={`${cfg.short} progress`}
          >
            <div
              className="focus-bar-fill"
              style={{ width: `${percentElapsed}%`, background: cfg.color }}
            />
          </div>
        </div>

        <div
          className="focus-cycle-dots"
          aria-label={`Pomodoro ${cycleIndex} of ${totalCycles} completed`}
        >
          {Array.from({ length: totalCycles }).map((_, i) => (
            <span
              key={i}
              className={[
                'focus-cycle-dot',
                i < cycleIndex ? 'focus-cycle-dot--done' : '',
                i === cycleIndex ? 'focus-cycle-dot--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>

        <div className="focus-controls">
          <button
            className="focus-ctrl-btn focus-ctrl-btn--secondary"
            onClick={onSkip}
            disabled={!onSkip}
            aria-label="Skip to next phase"
            title="Skip to next phase"
          >
            ⏭
          </button>

          <button
            className={`focus-ctrl-btn focus-ctrl-btn--primary focus-ctrl-btn--${phase}`}
            onClick={handleToggle}
            disabled={isRunning ? !onPause : !onStart}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
            title={isRunning ? 'Pause' : 'Start timer'}
          >
            {isRunning ? '⏸ Pause' : '▶ Start'}
          </button>

          <button
            className="focus-ctrl-btn focus-ctrl-btn--secondary"
            onClick={onReset}
            disabled={!onReset}
            aria-label="Reset timer"
            title="Reset to start of current phase"
          >
            ↺
          </button>
        </div>
      </div>
    );
  }
  return (

    <div className={`focus-timer focus-timer--${phase}`}>

      {/* ── Phase label ── */}
      <p className="focus-phase-label">{cfg.label}</p>

      {/* ── Ring + countdown overlay ── */}
      <div className="focus-ring-wrapper">
        <svg
          className="focus-ring-svg"
          viewBox="0 0 240 240"
          aria-label={`${cfg.short} timer: ${formatSeconds(remaining)} remaining`}
          role="img"
        >
          {/* Track ring (full circle) */}
          <circle
            className="focus-ring-track"
            cx="120"
            cy="120"
            r={RING_RADIUS}
            fill="none"
            stroke={cfg.trackColor}
            strokeWidth="12"
          />
          {/* Progress ring (shrinks as time runs out) */}
          <circle
            className="focus-ring-progress"
            cx="120"
            cy="120"
            r={RING_RADIUS}
            fill="none"
            stroke={cfg.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{
              transformOrigin: '120px 120px',
              transform: 'rotate(-90deg)',
            }}
          />
        </svg>

        {/* Overlaid digit + phase text */}
        <div className="focus-ring-overlay">
          <span className="focus-timer-digits">{formatSeconds(remaining)}</span>
          <span className="focus-timer-phase-text">{cfg.short}</span>
        </div>
      </div>

      {/* ── Cycle progress dots ── */}
      <div
        className="focus-cycle-dots"
        aria-label={`Pomodoro ${cycleIndex} of ${totalCycles} completed`}
      >
        {Array.from({ length: totalCycles }).map((_, i) => (
          <span
            key={i}
            className={[
              'focus-cycle-dot',
              i < cycleIndex ? 'focus-cycle-dot--done' : '',
              i === cycleIndex ? 'focus-cycle-dot--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="focus-controls">
        {/* Skip — left secondary */}
        <button
          className="focus-ctrl-btn focus-ctrl-btn--secondary"
          onClick={onSkip}
          disabled={!onSkip}
          aria-label="Skip to next phase"
          title="Skip to next phase"
        >
          ⏭
        </button>

        {/* Start / Pause — primary */}
        <button
          className={`focus-ctrl-btn focus-ctrl-btn--primary focus-ctrl-btn--${phase}`}
          onClick={handleToggle}
          disabled={isRunning ? !onPause : !onStart}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          title={isRunning ? 'Pause' : 'Start timer'}
        >
          {isRunning ? '⏸ Pause' : '▶ Start'}
        </button>

        {/* Reset — right secondary */}
        <button
          className="focus-ctrl-btn focus-ctrl-btn--secondary"
          onClick={onReset}
          disabled={!onReset}
          aria-label="Reset timer"
          title="Reset to start of current phase"
        >
          ↺
        </button>
      </div>
    </div>
  );
};

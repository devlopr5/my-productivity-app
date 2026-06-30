import { useEffect, useState, type CSSProperties } from 'react';
import './App.css';
import { TaskList } from './components/TaskList';
import { FocusTimer } from './components/FocusTimer';
import { useClock } from './hooks/useClock';
import { usePomodoro } from './hooks/usePomodoro';
import { useDashboardLayout } from './hooks/useDashboardLayout';
import {
  useThemePreferences,
  type CuratedThemeId,
  type CuratedThemeOption,
  type ThemeMode,
} from './hooks/useThemePreferences';
import { AppContextProvider, useAppContext } from './context/AppContext';

// ─── Focus Mode View ──────────────────────────────────────────────────────────

/**
 * Displayed when appMode === 'FOCUS_MODE'.
 *
 * Step 2.2 deliverable:
 *  - Task list and all dashboard/setup elements are completely absent
 *    (achieved by swapping the whole view, not by hiding elements).
 *  - FocusTimer is the dominant visual element.
 *  - Active task is shown in a prominent banner above the timer.
 *  - Clock remains visible in the header at all times (PRD §3A).
 *  - Phase-aware background gradient signals the current mode.
 *
 * The FocusTimer's onStart / onPause / onSkip callbacks are left unset here
 * intentionally — they will be wired to `usePomodoro` in Phase 2.3.
 */
interface FocusModeViewProps {
  ambientMotionEnabled: boolean;
  onToggleAmbientMotion: () => void;
}

const FocusModeView = ({ ambientMotionEnabled, onToggleAmbientMotion }: FocusModeViewProps) => {
  const { selectedTask, changeAppMode, setSelectedTask } = useAppContext();
  const { formattedTime, formattedDate } = useClock();
  const pomodoro = usePomodoro();

  const handleExit = () => {
    pomodoro.pause(); // persist remaining time before unmounting
    changeAppMode('DASHBOARD');
    setSelectedTask(null);
  };

  return (
    // Phase-aware gradient class swaps automatically as the timer cycles.
    <div className={`app-shell${ambientMotionEnabled ? ' app-shell--ambient-motion' : ''} focus-shell focus-shell--${pomodoro.phase}`}>

      {/* ── Header: clock always visible (PRD §3A) ── */}
      <header className="app-header app-header--focus glass-card">
        <div className="app-header-left">
          <span className="app-logo">🌸</span>
          <h1 className="app-title">FocusFlow</h1>
          <span className="focus-active-badge">Focus Mode</span>
        </div>
        <div className="app-header-right app-header-right--focus">
          <button
            className="ambient-motion-toggle"
            type="button"
            onClick={onToggleAmbientMotion}
            aria-pressed={ambientMotionEnabled}
          >
            {ambientMotionEnabled ? 'Animation on' : 'Animation off'}
          </button>
          {/* <button
            className="pomodoro-view-toggle"
            type="button"
            onClick={pomodoro.toggleDisplayMode}
            aria-pressed={pomodoro.displayMode === 'dots'}
          >
            {pomodoro.displayMode === 'dots' ? 'Dot grid' : 'Digital'}
          </button> */}
          <div className="app-header-clock">
            <span className="app-header-time">{formattedTime}</span>
            <span className="app-header-date">{formattedDate}</span>
          </div>
        </div>
      </header>

      {/* ── Focus main area ── */}
      <main className="focus-main">

        {/* Active task banner — prominent, above the timer */}
        {selectedTask ? (
          <div className="focus-task-banner">
            <span className="focus-task-banner-icon">📌</span>
            <span className="focus-task-banner-title">{selectedTask.title}</span>
            <span
              className={`focus-task-banner-priority focus-task-banner-priority--${selectedTask.priority}`}
            >
              {selectedTask.priority}
            </span>
          </div>
        ) : (
          <div className="focus-task-banner focus-task-banner--empty">
            <span className="focus-task-banner-icon">💡</span>
            <span className="focus-task-banner-title">No task linked — free focus session</span>
          </div>
        )}

        {/* ── Dominant timer card ── */}
        <section className="focus-center glass-card">
          <FocusTimer
            phase={pomodoro.phase}
            secondsRemaining={pomodoro.secondsRemaining}
            totalSeconds={pomodoro.totalSeconds}
            cycleIndex={pomodoro.cycleIndex}
            totalCycles={pomodoro.totalCycles}
            isRunning={pomodoro.isRunning}
            displayMode={pomodoro.displayMode}
            onStart={pomodoro.start}
            onPause={pomodoro.pause}
            onSkip={pomodoro.skip}
            onReset={pomodoro.reset}
          />
        </section>

        {/* Exit link — intentionally subtle so it doesn't compete with timer */}
        <button className="exit-focus-btn" onClick={handleExit}>
          ← Back to Dashboard
        </button>

      </main>
    </div>
  );
};

// ─── Dashboard View ───────────────────────────────────────────────────────────

/**
 * Displayed when appMode === 'DASHBOARD'.
 * Layout:
 *   Left  35% → Task List
 *   Right 65% → Clock (hero display, default) or Pomodoro Timer (user-switchable)
 *
 * The header no longer duplicates the clock — the main right panel owns it.
 */
interface DashboardViewProps {
  themeMode: ThemeMode;
  themeId: CuratedThemeId;
  curatedThemes: CuratedThemeOption[];
  ambientMotionEnabled: boolean;
  onThemeModeChange: (mode: ThemeMode) => void;
  onThemeChange: (themeId: CuratedThemeId) => void;
  onToggleAmbientMotion: () => void;
}

const DashboardView = ({
  themeMode,
  themeId,
  curatedThemes,
  ambientMotionEnabled,
  onThemeModeChange,
  onThemeChange,
  onToggleAmbientMotion,
}: DashboardViewProps) => {
  const [mainMode, setMainMode] = useState<'clock' | 'pomodoro'>('clock');
  const { formattedTime, formattedDate } = useClock();
  const pomodoro = usePomodoro();
  const layout = useDashboardLayout();

  const gridStyle: CSSProperties | undefined = layout.isCompact
    ? undefined
    : {
        gridTemplateColumns: `${layout.widths.left}fr 10px ${100 - layout.widths.left}fr`,
      };

  return (
    <div className={`app-shell${ambientMotionEnabled ? ' app-shell--ambient-motion' : ''}`}>
      {/* ── Top header (date + layout presets) ── */}
      <header className="app-header glass-card">
        <div className="app-header-left">
          <span className="app-logo">🌸</span>
          <h1 className="app-title">FocusFlow</h1>
        </div>
        <div className="app-header-right">
          <div className="theme-controls" aria-label="Appearance settings">
            <label className="theme-select-label" htmlFor="theme-mode-select">Mode</label>
            <select
              id="theme-mode-select"
              className="theme-select"
              value={themeMode}
              onChange={(e) => onThemeModeChange(e.target.value as 'light' | 'dark' | 'system')}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>

            <label className="theme-select-label" htmlFor="theme-palette-select">Theme</label>
            <select
              id="theme-palette-select"
              className="theme-select"
              value={themeId}
              onChange={(e) => onThemeChange(e.target.value as CuratedThemeId)}
            >
              {curatedThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>

            <button
              className="ambient-motion-toggle"
              type="button"
              onClick={onToggleAmbientMotion}
              aria-pressed={ambientMotionEnabled}
            >
              {ambientMotionEnabled ? 'Animation on' : 'Animation off'}
            </button>
            {/* <button
              className="pomodoro-view-toggle"
              type="button"
              onClick={pomodoro.toggleDisplayMode}
              aria-pressed={pomodoro.displayMode === 'dots'}
            >
              {pomodoro.displayMode === 'dots' ? 'Dot grid' : 'Digital'}
            </button> */}
          </div>

          <div className="layout-presets" aria-label="Dashboard layout presets">
            <button
              className={`layout-preset-btn${layout.activePreset === 'focus' ? ' active' : ''}`}
              onClick={() => layout.applyPreset('focus')}
            >
              [&nbsp;|&nbsp;&nbsp;&nbsp;]
            </button>
            <button
              className={`layout-preset-btn${layout.activePreset === 'tasks-first' ? ' active' : ''}`}
              onClick={() => layout.applyPreset('tasks-first')}
            >
              [&nbsp;&nbsp;|&nbsp;&nbsp;]
            </button>
          </div>
          <div className="main-panel-toggle">
            <button
              className={`main-panel-toggle-btn${mainMode === 'clock' ? ' active' : ''}`}
              onClick={() => setMainMode('clock')}
            >
              🕐 
            </button>
            <button
              className={`main-panel-toggle-btn${mainMode === 'pomodoro' ? ' active' : ''}`}
              onClick={() => setMainMode('pomodoro')}
            >
              🍅 + 🕐
            </button>
          </div>

          <span className="app-subtitle">{formattedDate}</span>
        </div>
      </header>

      {/* ── Resizable dashboard ── */}
      <main
        ref={layout.containerRef}
        className={`dashboard-grid${layout.isCompact ? ' dashboard-grid--compact' : ''}`}
        style={gridStyle}
      >
        {/* Left panel — Task List */}
        <section className="panel panel--left">
          <TaskList />
        </section>

        {!layout.isCompact && (
          <div
            className="panel-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize task and main panels"
            onPointerDown={(e) => layout.startResize('left-center', e.clientX)}
          />
        )}

        {/* Main panel — Pomodoro + Clock together (as before) */}
        <section className="panel panel--main glass-card">

          {mainMode === 'clock' ? (
            <div className="hero-clock hero-clock--huge">
              <div className="hero-clock-time">{formattedTime}</div>
              <div className="hero-clock-date">{formattedDate}</div>
            </div>
          ) : (
            <div className="pomodoro-panel">
              <div className="pomodoro-split pomodoro-split--stacked">
                <div className="pomodoro-split-item pomodoro-split-item--timer">
                  <FocusTimer
                    layout="bar"
                    phase={pomodoro.phase}
                    secondsRemaining={pomodoro.secondsRemaining}
                    totalSeconds={pomodoro.totalSeconds}
                    cycleIndex={pomodoro.cycleIndex}
                    totalCycles={pomodoro.totalCycles}
                    isRunning={pomodoro.isRunning}
                    displayMode={pomodoro.displayMode}
                    onStart={pomodoro.start}
                    onPause={pomodoro.pause}
                    onSkip={pomodoro.skip}
                    onReset={pomodoro.reset}
                  />
                </div>
                <div className="pomodoro-divider" />
                <div className="pomodoro-split-item pomodoro-split-item--clock">
                  <div className="hero-clock">
                    <div className="hero-clock-time">{formattedTime}</div>
                    <div className="hero-clock-date">{formattedDate}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

/** Selects the correct view based on the current AppMode. */
const AppShell = () => {
  const { appMode } = useAppContext();
  const {
    mode,
    themeId,
    curatedThemes,
    setMode,
    setThemeId,
  } = useThemePreferences();
  const [ambientMotionEnabled, setAmbientMotionEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('focusflow_ambient_motion_enabled_v1');
      if (stored !== null) {
        setAmbientMotionEnabled(stored === 'true');
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('focusflow_ambient_motion_enabled_v1', String(ambientMotionEnabled));
    } catch {
      // ignore storage failures
    }
  }, [ambientMotionEnabled]);

  if (appMode === 'FOCUS_MODE') {
    return (
      <FocusModeView
        ambientMotionEnabled={ambientMotionEnabled}
        onToggleAmbientMotion={() => setAmbientMotionEnabled((current) => !current)}
      />
    );
  }

  return (
    <DashboardView
      themeMode={mode}
      themeId={themeId}
      curatedThemes={curatedThemes}
      ambientMotionEnabled={ambientMotionEnabled}
      onThemeModeChange={setMode}
      onThemeChange={setThemeId}
      onToggleAmbientMotion={() => setAmbientMotionEnabled((current) => !current)}
    />
  );
};

function App() {
  return (
    <AppContextProvider>
      <AppShell />
    </AppContextProvider>
  );
}

export default App;

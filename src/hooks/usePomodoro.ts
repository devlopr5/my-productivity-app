import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PomodoroPhase = 'focus' | 'break' | 'longBreak';
export type PomodoroDisplayMode = 'digital' | 'dots';

interface PomodoroState {
  phase: PomodoroPhase;
  /**
   * How many focus cycles have been completed within the current set.
   * Range: 0 → TOTAL_CYCLES.
   * Used to drive the cycle-progress dots and to detect when a long break
   * is due (when cycleIndex reaches TOTAL_CYCLES).
   */
  cycleIndex: number;
  /** Seconds remaining at the moment the timer was last paused/saved. */
  pausedRemaining: number;
  /** Total seconds for the current phase — kept for the ring-progress ratio. */
  totalSeconds: number;
  /**
   * Unix-ms timestamp when the current run segment began.
   * Kept as null when the timer is paused.
   * Because the remaining time is always derived as
   *   pausedRemaining - ⌊(Date.now() - startEpoch) / 1000⌋
   * the countdown is perfectly drift-free and survives app restarts.
   */
  startEpoch: number | null;
  isRunning: boolean;
}

export interface UsePomodoroReturn {
  phase: PomodoroPhase;
  secondsRemaining: number;
  totalSeconds: number;
  /** Completed focus cycles within the current set (0–TOTAL_CYCLES). */
  cycleIndex: number;
  totalCycles: number;
  isRunning: boolean;
  displayMode: PomodoroDisplayMode;
  toggleDisplayMode: () => void;
  /** Start or resume the current phase. */
  start: () => void;
  /** Pause the timer, recording remaining seconds. */
  pause: () => void;
  /** Immediately jump to the next phase. */
  skip: () => void;
  /** Reset the current phase back to its full duration. */
  reset: () => void;
}

// ─── Configuration ────────────────────────────────────────────────────────────

export const TOTAL_CYCLES = 4;

export const PHASE_DURATIONS: Record<PomodoroPhase, number> = {
  focus:     25 * 60,   // 1 500 s
  break:      5 * 60,   //   300 s
  longBreak: 15 * 60,   //   900 s
};

const PHASE_NOTIFICATIONS: Record<PomodoroPhase, { title: string; body: string }> = {
  focus: {
    title: '🎯 Focus Time!',
    body: "Break's over — let's get back to work.",
  },
  break: {
    title: '🌿 Short Break',
    body: 'Great work! Rest for 5 minutes.',
  },
  longBreak: {
    title: '☕ Long Break Earned!',
    body: `All ${TOTAL_CYCLES} Pomodoros done — take 15 minutes.`,
  },
};

const STORAGE_KEY = 'focusflow_pomodoro_v1';
const DISPLAY_MODE_STORAGE_KEY = 'focusflow_pomodoro_display_mode_v1';

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadState(): PomodoroState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PomodoroState;
  } catch {
    return null;
  }
}

function saveState(s: PomodoroState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / private-mode — ignore */
  }
}

function loadDisplayMode(): PomodoroDisplayMode {
  try {
    const raw = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
    return raw === 'dots' ? 'dots' : 'digital';
  } catch {
    return 'digital';
  }
}

// ─── Notification helper ──────────────────────────────────────────────────────

async function sendNotification(phase: PomodoroPhase): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    const { title, body } = PHASE_NOTIFICATIONS[phase];
    new Notification(title, { body, silent: false });
  }
}

// ─── Default / next-phase state factories ────────────────────────────────────

function defaultState(): PomodoroState {
  return {
    phase: 'focus',
    cycleIndex: 0,
    pausedRemaining: PHASE_DURATIONS.focus,
    totalSeconds: PHASE_DURATIONS.focus,
    startEpoch: null,
    isRunning: false,
  };
}

/**
 * Given the current state, compute what the next phase should be.
 *
 * Sequence:
 *   focus → break (auto-start)          if cycleIndex+1 < TOTAL_CYCLES
 *   focus → longBreak (auto-start)      if cycleIndex+1 >= TOTAL_CYCLES
 *   break → focus (manual start)
 *   longBreak → focus (manual start, reset cycleIndex)
 */
function computeNextPhase(prev: PomodoroState): PomodoroState {
  const { phase, cycleIndex } = prev;

  if (phase === 'focus') {
    const next = cycleIndex + 1;
    if (next >= TOTAL_CYCLES) {
      // All cycles complete → long break, auto-start
      return {
        phase: 'longBreak',
        cycleIndex: next,                           // = TOTAL_CYCLES; all dots filled
        pausedRemaining: PHASE_DURATIONS.longBreak,
        totalSeconds: PHASE_DURATIONS.longBreak,
        startEpoch: Date.now(),
        isRunning: true,
      };
    }
    // Short break, auto-start
    return {
      phase: 'break',
      cycleIndex: next,
      pausedRemaining: PHASE_DURATIONS.break,
      totalSeconds: PHASE_DURATIONS.break,
      startEpoch: Date.now(),
      isRunning: true,
    };
  }

  // break / longBreak → next focus; require manual start
  return {
    phase: 'focus',
    cycleIndex: phase === 'longBreak' ? 0 : cycleIndex, // reset set counter after long break
    pausedRemaining: PHASE_DURATIONS.focus,
    totalSeconds: PHASE_DURATIONS.focus,
    startEpoch: null,
    isRunning: false,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePomodoro(): UsePomodoroReturn {
  // ── Initialise from localStorage, handling time elapsed while app was closed
  const [state, setState] = useState<PomodoroState>(() => {
    const saved = loadState();
    if (!saved) return defaultState();

    if (saved.isRunning && saved.startEpoch !== null) {
      const elapsed = Math.floor((Date.now() - saved.startEpoch) / 1000);
      const remaining = Math.max(0, saved.pausedRemaining - elapsed);

      if (remaining === 0) {
        // Time ran out while app was closed → advance to next phase
        const next = computeNextPhase(saved);
        // If next phase is a break (auto-start), it's already set up correctly.
        // If it's focus (manual start), isRunning = false.
        return next;
      }
      // Still time left — startEpoch is still valid, tick formula handles it
      return saved;
    }

    return saved;
  });

  // ── Live display value (updated by the tick interval) ────────────────────
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    state.pausedRemaining
  );
  const [displayMode, setDisplayMode] = useState<PomodoroDisplayMode>(loadDisplayMode);

  // ── Ref to latest state (used by the unmount-save cleanup effect) ─────────
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Guard: prevents double-advancing when the tick fires twice at zero ────
  const advancedRef = useRef(false);

  // ── Stable ref to advancePhase (avoids stale closure inside interval) ────
  const advancePhaseRef = useRef<() => void>(() => {});

  // ── Persist to localStorage on every state change ─────────────────────────
  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, displayMode);
    } catch {
      /* ignore storage failures */
    }
  }, [displayMode]);

  // ── Save-on-unmount: handles the "exit focus mode" edge case ──────────────
  // When the user navigates back to the dashboard, React unmounts FocusModeView
  // before the [state] effect can fire for the pause() call. This cleanup
  // ensures the paused state is always persisted correctly.
  useEffect(() => {
    return () => {
      const s = stateRef.current;
      if (s.isRunning && s.startEpoch !== null) {
        const elapsed = Math.floor((Date.now() - s.startEpoch) / 1000);
        const remaining = Math.max(0, s.pausedRemaining - elapsed);
        saveState({ ...s, isRunning: false, startEpoch: null, pausedRemaining: remaining });
      } else {
        saveState(s);
      }
    };
  }, []); // empty deps → fires only on unmount

  // ── Tick interval — epoch-based, no drift ────────────────────────────────
  useEffect(() => {
    advancedRef.current = false;

    if (!state.isRunning || state.startEpoch === null) {
      // Timer is paused — keep display in sync with stored remaining
      setSecondsRemaining(state.pausedRemaining);
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - state.startEpoch!) / 1000);
      const remaining = Math.max(0, state.pausedRemaining - elapsed);
      setSecondsRemaining(remaining);

      if (remaining === 0 && !advancedRef.current) {
        advancedRef.current = true;
        advancePhaseRef.current();
      }
    };

    tick();                          // fire immediately so display is instant
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.isRunning, state.startEpoch, state.pausedRemaining]);

  // ── Phase advance ─────────────────────────────────────────────────────────
  const advancePhase = useCallback(() => {
    setState(prev => {
      const next = computeNextPhase(prev);
      sendNotification(next.phase); // fire-and-forget
      saveState(next);              // persist immediately (covers unmount edge)
      return next;
    });
  }, []);

  // Keep the ref current so the interval closure always calls the latest fn
  advancePhaseRef.current = advancePhase;

  // ── Public controls ───────────────────────────────────────────────────────

  const start = useCallback(() => {
    setState(prev => {
      if (prev.isRunning) return prev;
      const next = { ...prev, isRunning: true, startEpoch: Date.now() };
      saveState(next);
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    setState(prev => {
      if (!prev.isRunning || prev.startEpoch === null) return prev;
      const elapsed = Math.floor((Date.now() - prev.startEpoch) / 1000);
      const remaining = Math.max(0, prev.pausedRemaining - elapsed);
      const next = {
        ...prev,
        isRunning: false,
        startEpoch: null,
        pausedRemaining: remaining,
      };
      saveState(next); // persist synchronously (covers unmount edge)
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    advancePhase();
  }, [advancePhase]);

  const reset = useCallback(() => {
    setState(prev => {
      const next = {
        ...prev,
        isRunning: false,
        startEpoch: null,
        pausedRemaining: PHASE_DURATIONS[prev.phase],
        totalSeconds: PHASE_DURATIONS[prev.phase],
      };
      saveState(next);
      return next;
    });
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((current) => (current === 'digital' ? 'dots' : 'digital'));
  }, []);

  return {
    phase: state.phase,
    secondsRemaining,
    totalSeconds: state.totalSeconds,
    cycleIndex: state.cycleIndex,
    totalCycles: TOTAL_CYCLES,
    isRunning: state.isRunning,
    displayMode,
    toggleDisplayMode,
    start,
    pause,
    skip,
    reset,
  };
}

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Task } from '../types/electron';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The two primary modes the application can be in. */
export type AppMode = 'DASHBOARD' | 'FOCUS_MODE';

interface AppState {
  appMode: AppMode;
  /** The task the user has selected/linked to a focus session. */
  selectedTask: Task | null;
}

type AppAction =
  | { type: 'CHANGE_MODE'; mode: AppMode }
  | { type: 'SET_SELECTED_TASK'; task: Task | null };

export interface AppContextValue extends AppState {
  /** Transition the application to a new mode. */
  changeAppMode: (mode: AppMode) => void;
  /** Set (or clear) the task linked to the current/upcoming focus session. */
  setSelectedTask: (task: Task | null) => void;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const initialState: AppState = {
  appMode: 'DASHBOARD',
  selectedTask: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CHANGE_MODE':
      return { ...state, appMode: action.mode };
    case 'SET_SELECTED_TASK':
      return { ...state, selectedTask: action.task };
    default:
      return state;
  }
}

// ─── Context & Provider ───────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const changeAppMode = (mode: AppMode) =>
    dispatch({ type: 'CHANGE_MODE', mode });

  const setSelectedTask = (task: Task | null) =>
    dispatch({ type: 'SET_SELECTED_TASK', task });

  return (
    <AppContext.Provider value={{ ...state, changeAppMode, setSelectedTask }}>
      {children}
    </AppContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Consume the AppContext. Must be used inside an <AppContextProvider>. */
export const useAppContext = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return ctx;
};

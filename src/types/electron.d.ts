// Type definitions for the Electron API exposed to the renderer process

// Task type definition — mirrors electron/types.ts and the SQLite schema
export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  estimatedPomodoros?: number;
  actualPomodoros?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// TimeLog type definition
export interface TimeLog {
  id: number;
  taskId: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
}

// PomodoroSprint type definition
export interface PomodoroSprint {
  id: number;
  taskId: number;
  startTime: string;
  endTime?: string;
  duration: number;
  completed: boolean;
  interrupted: boolean;
  createdAt: string;
}

export interface DatabaseAPI {
  // Task operations
  getTodayTasks: () => Promise<Task[]>;
  getAllTasks: () => Promise<Task[]>;
  getTaskById: (id: number) => Promise<Task | null>;
  upsertTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<number>;
  deleteTask: (id: number) => Promise<void>;
  completeTask: (id: number) => Promise<void>;
  
  // TimeLog operations
  createTimeLog: (timeLog: Omit<TimeLog, 'id' | 'createdAt'>) => Promise<number>;
  getTimeLogsForTask: (taskId: number) => Promise<TimeLog[]>;
  getTodayTimeLogs: () => Promise<TimeLog[]>;
  
  // PomodoroSprint operations
  createPomodoroSprint: (sprint: Omit<PomodoroSprint, 'id' | 'createdAt'>) => Promise<number>;
  completePomodoroSprint: (id: number) => Promise<void>;
  interruptPomodoroSprint: (id: number) => Promise<void>;
  getSprintsForTask: (taskId: number) => Promise<PomodoroSprint[]>;
  getTodaySprints: () => Promise<PomodoroSprint[]>;
}

export interface ElectronAPI {
  db: DatabaseAPI;
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

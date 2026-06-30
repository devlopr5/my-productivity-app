// Database entity types

export interface Task {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  estimatedPomodoros?: number;
  actualPomodoros?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TimeLog {
  id?: number;
  taskId: number;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  type: 'work' | 'break';
  createdAt: string;
}

export interface PomodoroSprint {
  id?: number;
  taskId: number;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds (25 minutes = 1500 seconds)
  completed: boolean;
  interrupted: boolean;
  createdAt: string;
}

// IPC API types
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

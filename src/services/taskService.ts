import { Task } from '../types/electron';

/**
 * taskService — thin wrapper around window.electronAPI.db IPC calls.
 * All DB access goes through the Electron contextBridge; never call SQLite
 * directly from the renderer.
 */
export const taskService = {
  /** Fetch all tasks created today (filtered in the main process by createdAt date). */
  getTodayTasks: (): Promise<Task[]> => {
    if (!window.electronAPI?.db) {
      return Promise.reject(new Error('Database API not available'));
    }
    return window.electronAPI.db.getTodayTasks();
  },

  /** Fetch every task regardless of date. */
  getAllTasks: (): Promise<Task[]> => {
    if (!window.electronAPI?.db) {
      return Promise.reject(new Error('Database API not available'));
    }
    return window.electronAPI.db.getAllTasks();
  },

  /** Fetch a single task by its primary key. */
  getTaskById: (id: number): Promise<Task | null> => {
    if (!window.electronAPI?.db) {
      return Promise.reject(new Error('Database API not available'));
    }
    return window.electronAPI.db.getTaskById(id);
  },

  /**
   * Insert or update a task.
   * Omit `id` for a new task; include it to update an existing one.
   * Returns the task's id.
   */
  upsertTask: (
    task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }
  ): Promise<number> => {
    if (!window.electronAPI?.db) {
      return Promise.reject(new Error('Database API not available'));
    }
    return window.electronAPI.db.upsertTask(task);
  },

  /** Permanently remove a task. */
  deleteTask: (id: number): Promise<void> => {
    if (!window.electronAPI?.db) {
      return Promise.reject(new Error('Database API not available'));
    }
    return window.electronAPI.db.deleteTask(id);
  },

  /** Mark a task as completed (sets completed = true and records completedAt). */
  completeTask: (id: number): Promise<void> => {
    if (!window.electronAPI?.db) {
      return Promise.reject(new Error('Database API not available'));
    }
    return window.electronAPI.db.completeTask(id);
  },
};

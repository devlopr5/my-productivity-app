import { contextBridge, ipcRenderer } from 'electron';
import { Task, TimeLog, PomodoroSprint, DatabaseAPI } from './types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database API
  db: {
    // Task operations
    getTodayTasks: (): Promise<Task[]> => 
      ipcRenderer.invoke('db:getTodayTasks'),
    
    getAllTasks: (): Promise<Task[]> => 
      ipcRenderer.invoke('db:getAllTasks'),
    
    getTaskById: (id: number): Promise<Task | null> => 
      ipcRenderer.invoke('db:getTaskById', id),
    
    upsertTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }): Promise<number> => 
      ipcRenderer.invoke('db:upsertTask', task),
    
    deleteTask: (id: number): Promise<void> => 
      ipcRenderer.invoke('db:deleteTask', id),
    
    completeTask: (id: number): Promise<void> => 
      ipcRenderer.invoke('db:completeTask', id),
    
    // TimeLog operations
    createTimeLog: (timeLog: Omit<TimeLog, 'id' | 'createdAt'>): Promise<number> => 
      ipcRenderer.invoke('db:createTimeLog', timeLog),
    
    getTimeLogsForTask: (taskId: number): Promise<TimeLog[]> => 
      ipcRenderer.invoke('db:getTimeLogsForTask', taskId),
    
    getTodayTimeLogs: (): Promise<TimeLog[]> => 
      ipcRenderer.invoke('db:getTodayTimeLogs'),
    
    // PomodoroSprint operations
    createPomodoroSprint: (sprint: Omit<PomodoroSprint, 'id' | 'createdAt'>): Promise<number> => 
      ipcRenderer.invoke('db:createPomodoroSprint', sprint),
    
    completePomodoroSprint: (id: number): Promise<void> => 
      ipcRenderer.invoke('db:completePomodoroSprint', id),
    
    interruptPomodoroSprint: (id: number): Promise<void> => 
      ipcRenderer.invoke('db:interruptPomodoroSprint', id),
    
    getSprintsForTask: (taskId: number): Promise<PomodoroSprint[]> => 
      ipcRenderer.invoke('db:getSprintsForTask', taskId),
    
    getTodaySprints: (): Promise<PomodoroSprint[]> => 
      ipcRenderer.invoke('db:getTodaySprints'),
  } as DatabaseAPI,
  
  // Placeholder to ensure the context bridge is working
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// TypeScript type definitions for the exposed API
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

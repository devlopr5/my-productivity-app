import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseService } from './database';
import { Task, TimeLog, PomodoroSprint } from './types';

let mainWindow: BrowserWindow | null = null;
let dbService: DatabaseService;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'FocusFlow',
    backgroundColor: '#ffffff'
  });

  // In development, load from Vite dev server
  // In production, load from built files
  const isDev = !app.isPackaged;
  
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  
  if (isDev) {
    const devURL = 'http://localhost:5173';
    console.log('Loading dev URL:', devURL);
    mainWindow.loadURL(devURL);
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading prod file:', prodPath);
    mainWindow.loadFile(prodPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC handlers for database operations
function setupIPCHandlers(): void {
  // Task operations
  ipcMain.handle('db:getTodayTasks', async () => {
    try {
      return dbService.getTodayTasks();
    } catch (error) {
      console.error('Error getting today tasks:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getAllTasks', async () => {
    try {
      return dbService.getAllTasks();
    } catch (error) {
      console.error('Error getting all tasks:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getTaskById', async (_event, id: number) => {
    try {
      return dbService.getTaskById(id);
    } catch (error) {
      console.error('Error getting task by id:', error);
      throw error;
    }
  });

  ipcMain.handle('db:upsertTask', async (_event, task: Omit<Task, 'createdAt' | 'updatedAt'> & { id?: number }) => {
    try {
      return dbService.upsertTask(task);
    } catch (error) {
      console.error('Error upserting task:', error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteTask', async (_event, id: number) => {
    try {
      return dbService.deleteTask(id);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  });

  ipcMain.handle('db:completeTask', async (_event, id: number) => {
    try {
      return dbService.completeTask(id);
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  });

  // TimeLog operations
  ipcMain.handle('db:createTimeLog', async (_event, timeLog: Omit<TimeLog, 'id' | 'createdAt'>) => {
    try {
      return dbService.createTimeLog(timeLog);
    } catch (error) {
      console.error('Error creating time log:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getTimeLogsForTask', async (_event, taskId: number) => {
    try {
      return dbService.getTimeLogsForTask(taskId);
    } catch (error) {
      console.error('Error getting time logs for task:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getTodayTimeLogs', async () => {
    try {
      return dbService.getTodayTimeLogs();
    } catch (error) {
      console.error('Error getting today time logs:', error);
      throw error;
    }
  });

  // PomodoroSprint operations
  ipcMain.handle('db:createPomodoroSprint', async (_event, sprint: Omit<PomodoroSprint, 'id' | 'createdAt'>) => {
    try {
      return dbService.createPomodoroSprint(sprint);
    } catch (error) {
      console.error('Error creating pomodoro sprint:', error);
      throw error;
    }
  });

  ipcMain.handle('db:completePomodoroSprint', async (_event, id: number) => {
    try {
      return dbService.completePomodoroSprint(id);
    } catch (error) {
      console.error('Error completing pomodoro sprint:', error);
      throw error;
    }
  });

  ipcMain.handle('db:interruptPomodoroSprint', async (_event, id: number) => {
    try {
      return dbService.interruptPomodoroSprint(id);
    } catch (error) {
      console.error('Error interrupting pomodoro sprint:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getSprintsForTask', async (_event, taskId: number) => {
    try {
      return dbService.getSprintsForTask(taskId);
    } catch (error) {
      console.error('Error getting sprints for task:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getTodaySprints', async () => {
    try {
      return dbService.getTodaySprints();
    } catch (error) {
      console.error('Error getting today sprints:', error);
      throw error;
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize database
  dbService = new DatabaseService();
  await dbService.initialize();
  
  // Setup IPC handlers
  setupIPCHandlers();
  
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no other windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Close database before quitting
    if (dbService) {
      dbService.close();
    }
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (dbService) {
    dbService.close();
  }
});

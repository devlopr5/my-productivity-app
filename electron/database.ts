import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Task, TimeLog, PomodoroSprint } from './types';

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    // Store database in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'focusflow.db');
    console.log('Database path:', this.dbPath);
  }

  /**
   * Initialize the database connection and create tables if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      const SQL = await initSqlJs();
      
      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
        console.log('Loaded existing database');
      } else {
        this.db = new SQL.Database();
        console.log('Created new database');
      }

      // Create tables
      await this.initializeTables();
      
      // Save to disk
      this.saveDatabase();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private initializeTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Tasks table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        estimatedPomodoros INTEGER,
        actualPomodoros INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        completedAt TEXT
      )
    `);

    // TimeLogs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        duration INTEGER NOT NULL,
        type TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // PomodoroSprints table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pomodoro_sprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        duration INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        interrupted INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables initialized');
  }

  /**
   * Save database to disk
   */
  private saveDatabase(): void {
    if (!this.db) throw new Error('Database not initialized');
    
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ===== Task Operations =====

  /**
   * Get all tasks created today
   */
  getTodayTasks(): Task[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const today = this.getTodayDate();
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE date(createdAt) = date(?)
      ORDER BY createdAt DESC
    `);
    
    stmt.bind([today]);
    const tasks: Task[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      tasks.push(this.rowToTask(row));
    }
    
    stmt.free();
    return tasks;
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC');
    const tasks: Task[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      tasks.push(this.rowToTask(row));
    }
    
    stmt.free();
    return tasks;
  }

  /**
   * Get task by ID
   */
  getTaskById(id: number): Task | null {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    stmt.bind([id]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToTask(row);
    }
    
    stmt.free();
    return null;
  }

  /**
   * Insert or update a task
   */
  upsertTask(task: Omit<Task, 'createdAt' | 'updatedAt'> & { id?: number }): number {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    
    if (task.id) {
      // Update existing task
      this.db.run(`
        UPDATE tasks 
        SET title = ?, description = ?, completed = ?, priority = ?, 
            estimatedPomodoros = ?, actualPomodoros = ?, updatedAt = ?,
            completedAt = ?
        WHERE id = ?
      `, [
        task.title,
        task.description || null,
        task.completed ? 1 : 0,
        task.priority || 'medium',
        task.estimatedPomodoros || null,
        task.actualPomodoros || 0,
        now,
        task.completedAt || null,
        task.id
      ]);
      
      this.saveDatabase();
      return task.id;
    } else {
      // Insert new task
      this.db.run(`
        INSERT INTO tasks (title, description, completed, priority, estimatedPomodoros, actualPomodoros, createdAt, updatedAt, completedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        task.title,
        task.description || null,
        task.completed ? 1 : 0,
        task.priority || 'medium',
        task.estimatedPomodoros || null,
        task.actualPomodoros || 0,
        now,
        now,
        task.completedAt || null
      ]);
      
      const stmt = this.db.prepare('SELECT last_insert_rowid() as id');
      stmt.step();
      const row = stmt.getAsObject();
      stmt.free();
      
      this.saveDatabase();
      return row.id as number;
    }
  }

  /**
   * Delete a task
   */
  deleteTask(id: number): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run('DELETE FROM tasks WHERE id = ?', [id]);
    this.saveDatabase();
  }

  /**
   * Mark a task as complete
   */
  completeTask(id: number): void {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    this.db.run('UPDATE tasks SET completed = 1, completedAt = ?, updatedAt = ? WHERE id = ?', [now, now, id]);
    this.saveDatabase();
  }

  // ===== TimeLog Operations =====

  /**
   * Create a new time log entry
   */
  createTimeLog(timeLog: Omit<TimeLog, 'id' | 'createdAt'>): number {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    this.db.run(`
      INSERT INTO time_logs (taskId, startTime, endTime, duration, type, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      timeLog.taskId,
      timeLog.startTime,
      timeLog.endTime,
      timeLog.duration,
      timeLog.type,
      now
    ]);
    
    const stmt = this.db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    
    this.saveDatabase();
    return row.id as number;
  }

  /**
   * Get all time logs for a specific task
   */
  getTimeLogsForTask(taskId: number): TimeLog[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM time_logs WHERE taskId = ? ORDER BY startTime DESC');
    stmt.bind([taskId]);
    const logs: TimeLog[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      logs.push(this.rowToTimeLog(row));
    }
    
    stmt.free();
    return logs;
  }

  /**
   * Get today's time logs
   */
  getTodayTimeLogs(): TimeLog[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const today = this.getTodayDate();
    const stmt = this.db.prepare(`
      SELECT * FROM time_logs 
      WHERE date(startTime) = date(?)
      ORDER BY startTime DESC
    `);
    stmt.bind([today]);
    const logs: TimeLog[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      logs.push(this.rowToTimeLog(row));
    }
    
    stmt.free();
    return logs;
  }

  // ===== PomodoroSprint Operations =====

  /**
   * Create a new pomodoro sprint
   */
  createPomodoroSprint(sprint: Omit<PomodoroSprint, 'id' | 'createdAt'>): number {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    this.db.run(`
      INSERT INTO pomodoro_sprints (taskId, startTime, endTime, duration, completed, interrupted, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      sprint.taskId,
      sprint.startTime,
      sprint.endTime || null,
      sprint.duration,
      sprint.completed ? 1 : 0,
      sprint.interrupted ? 1 : 0,
      now
    ]);
    
    const stmt = this.db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    
    this.saveDatabase();
    return row.id as number;
  }

  /**
   * Mark a pomodoro sprint as completed
   */
  completePomodoroSprint(id: number): void {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    this.db.run('UPDATE pomodoro_sprints SET completed = 1, endTime = ? WHERE id = ?', [now, id]);
    this.saveDatabase();
  }

  /**
   * Mark a pomodoro sprint as interrupted
   */
  interruptPomodoroSprint(id: number): void {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    this.db.run('UPDATE pomodoro_sprints SET interrupted = 1, endTime = ? WHERE id = ?', [now, id]);
    this.saveDatabase();
  }

  /**
   * Get all sprints for a specific task
   */
  getSprintsForTask(taskId: number): PomodoroSprint[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM pomodoro_sprints WHERE taskId = ? ORDER BY startTime DESC');
    stmt.bind([taskId]);
    const sprints: PomodoroSprint[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      sprints.push(this.rowToSprint(row));
    }
    
    stmt.free();
    return sprints;
  }

  /**
   * Get today's pomodoro sprints
   */
  getTodaySprints(): PomodoroSprint[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const today = this.getTodayDate();
    const stmt = this.db.prepare(`
      SELECT * FROM pomodoro_sprints 
      WHERE date(startTime) = date(?)
      ORDER BY startTime DESC
    `);
    stmt.bind([today]);
    const sprints: PomodoroSprint[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      sprints.push(this.rowToSprint(row));
    }
    
    stmt.free();
    return sprints;
  }

  // ===== Helper Methods =====

  private rowToTask(row: any): Task {
    return {
      id: row.id as number,
      title: row.title as string,
      description: row.description as string | undefined,
      completed: Boolean(row.completed),
      priority: row.priority as 'low' | 'medium' | 'high',
      estimatedPomodoros: row.estimatedPomodoros as number | undefined,
      actualPomodoros: row.actualPomodoros as number | undefined,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
      completedAt: row.completedAt as string | undefined,
    };
  }

  private rowToTimeLog(row: any): TimeLog {
    return {
      id: row.id as number,
      taskId: row.taskId as number,
      startTime: row.startTime as string,
      endTime: row.endTime as string,
      duration: row.duration as number,
      type: row.type as 'work' | 'break',
      createdAt: row.createdAt as string,
    };
  }

  private rowToSprint(row: any): PomodoroSprint {
    return {
      id: row.id as number,
      taskId: row.taskId as number,
      startTime: row.startTime as string,
      endTime: row.endTime as string | undefined,
      duration: row.duration as number,
      completed: Boolean(row.completed),
      interrupted: Boolean(row.interrupted),
      createdAt: row.createdAt as string,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.db = null;
      console.log('Database closed');
    }
  }
}

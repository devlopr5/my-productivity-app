import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/electron';
import { taskService } from '../services/taskService';

/** Fields required to create a brand-new task. */
export type NewTaskInput = Pick<Task, 'title' | 'priority'> & {
  description?: string;
  estimatedPomodoros?: number;
};

/** Fields that can be changed when editing an existing task. */
export type TaskUpdate = Partial<
  Pick<Task, 'title' | 'description' | 'priority' | 'estimatedPomodoros'>
>;

export interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  /** Re-fetch today's tasks from the database. */
  refresh: () => void;
  /** Mark a task as complete and re-fetch. */
  completeTask: (id: number) => Promise<void>;
  /** Insert a new task and re-fetch. */
  addTask: (input: NewTaskInput) => Promise<void>;
  /** Update fields of an existing task and re-fetch. */
  editTask: (id: number, updates: TaskUpdate) => Promise<void>;
  /** Permanently remove a task. */
  deleteTask: (id: number) => Promise<void>;
}

export const useTasks = (): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const todayTasks = await taskService.getTodayTasks();
      setTasks(todayTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCompleteTask = useCallback(
    async (id: number) => {
      try {
        await taskService.completeTask(id);
        // Optimistically update local state first for snappy UI, then re-fetch
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, completed: true, completedAt: new Date().toISOString() }
              : t
          )
        );
        await fetchTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete task');
      }
    },
    [fetchTasks]
  );

  const handleAddTask = useCallback(
    async (input: NewTaskInput) => {
      try {
        await taskService.upsertTask({
          title: input.title,
          description: input.description,
          priority: input.priority,
          completed: false,
          estimatedPomodoros: input.estimatedPomodoros,
        });
        await fetchTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add task');
      }
    },
    [fetchTasks]
  );

  const handleEditTask = useCallback(
    async (id: number, updates: TaskUpdate) => {
      try {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        await taskService.upsertTask({
          id,
          title: updates.title ?? task.title,
          description:
            updates.description !== undefined
              ? updates.description
              : task.description,
          priority: updates.priority ?? task.priority,
          completed: task.completed,
          estimatedPomodoros:
            updates.estimatedPomodoros !== undefined
              ? updates.estimatedPomodoros
              : task.estimatedPomodoros,
          actualPomodoros: task.actualPomodoros,
          completedAt: task.completedAt,
        });
        // Optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
        await fetchTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to edit task');
      }
    },
    [tasks, fetchTasks]
  );

  const handleDeleteTask = useCallback(async (id: number) => {
    try {
      await taskService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    completeTask: handleCompleteTask,
    addTask: handleAddTask,
    editTask: handleEditTask,
    deleteTask: handleDeleteTask,
  };
};

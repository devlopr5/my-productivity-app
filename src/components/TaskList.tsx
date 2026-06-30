import { useState } from 'react';
import { Task } from '../types/electron';
import { useTasks, NewTaskInput, TaskUpdate } from '../hooks/useTasks';
import { useAppContext } from '../context/AppContext';
import './TaskList.css';

// ─── Priority badge ──────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
};

// ─── Add Task Form ────────────────────────────────────────────────────────────

interface AddTaskFormProps {
  onAdd: (input: NewTaskInput) => Promise<void>;
  onCancel: () => void;
}

const AddTaskForm = ({ onAdd, onCancel }: AddTaskFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onAdd({
        title: trimmed,
        description: description.trim() || undefined,
        priority,
      });
      setTitle('');
      setDescription('');
      setPriority('medium');
      onCancel();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        className="task-form-input"
        type="text"
        placeholder="Task title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        required
      />
      <input
        className="task-form-input"
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="task-form-row">
        <select
          className="task-form-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Task['priority'])}
        >
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
        <div className="task-form-actions">
          <button
            type="button"
            className="task-form-btn task-form-btn--cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="task-form-btn task-form-btn--submit"
            disabled={submitting || !title.trim()}
          >
            {submitting ? '…' : 'Add'}
          </button>
        </div>
      </div>
    </form>
  );
};

// ─── Single task row ─────────────────────────────────────────────────────────

interface TaskItemProps {
  task: Task;
  onComplete: (id: number) => void;
  onEdit: (id: number, updates: TaskUpdate) => Promise<void>;
  onDelete: (id: number) => void;
  isSelected?: boolean;
  onSelect?: (task: Task) => void;
}

const TaskItem = ({ task, onComplete, onEdit, onDelete, isSelected = false, onSelect }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? '');
  const [editPriority, setEditPriority] = useState<Task['priority']>(task.priority);
  const [saving, setSaving] = useState(false);

  const isCompleted = task.completed;

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onEdit(task.id, {
        title: trimmed,
        description: editDescription.trim() || undefined,
        priority: editPriority,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditPriority(task.priority);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form
        className={`task-item task-item--editing task-item--${editPriority}`}
        onSubmit={handleEditSave}
      >
        <div className="task-edit-inputs">
          <input
            className="task-form-input"
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            required
          />
          <input
            className="task-form-input"
            type="text"
            placeholder="Description (optional)"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <div className="task-form-row">
            <select
              className="task-form-select"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Task['priority'])}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <div className="task-form-actions">
              <button
                type="button"
                className="task-form-btn task-form-btn--cancel"
                onClick={handleEditCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="task-form-btn task-form-btn--submit"
                disabled={saving || !editTitle.trim()}
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div
      className={[
        'task-item',
        isCompleted ? 'task-item--completed' : '',
        `task-item--${task.priority}`,
        !isCompleted && isSelected ? 'task-item--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => !isCompleted && onSelect?.(task)}
      role={!isCompleted ? 'button' : undefined}
      aria-pressed={!isCompleted ? isSelected : undefined}
      tabIndex={!isCompleted ? 0 : undefined}
      onKeyDown={(e) => { if (!isCompleted && (e.key === 'Enter' || e.key === ' ')) onSelect?.(task); }}
    >
      {/* Completion checkbox */}
      <button
        className={`task-checkbox ${isCompleted ? 'task-checkbox--checked' : ''}`}
        onClick={() => !isCompleted && onComplete(task.id)}
        aria-label={isCompleted ? 'Task completed' : 'Mark task as complete'}
        disabled={isCompleted}
      >
        {isCompleted && <span className="task-checkbox-tick">✓</span>}
      </button>

      {/* Text content */}
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.description && (
          <span className="task-description">{task.description}</span>
        )}
      </div>

      {/* Priority badge */}
      <span className={`task-priority task-priority--${task.priority}`}>
        {PRIORITY_LABEL[task.priority]}
      </span>

      {/* Action buttons — revealed on hover */}
      {!isCompleted && (
        <div className="task-actions">
          <button
            className="task-action-btn task-action-btn--edit"
            onClick={() => setIsEditing(true)}
            aria-label="Edit task"
            title="Edit task"
          >
            ✎
          </button>
          <button
            className="task-action-btn task-action-btn--delete"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// ─── TaskList panel ──────────────────────────────────────────────────────────

export const TaskList = () => {
  const { tasks, loading, error, completeTask, addTask, editTask, deleteTask } = useTasks();
  const { selectedTask, setSelectedTask, changeAppMode } = useAppContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const handleSelectTask = (task: Task) => {
    // Toggle selection: clicking the already-selected task deselects it
    setSelectedTask(selectedTask?.id === task.id ? null : task);
    setStartError(null);
  };

  const handleStartFocusSession = () => {
    if (!selectedTask) {
      setStartError('Please select a task first to start a Focus Session.');
      return;
    }
    setStartError(null);
    changeAppMode('FOCUS_MODE');
  };

  return (
    <div className="task-list-panel glass-panel">
      {/* Header */}
      <div className="task-list-header">
        <h2 className="task-list-title">Today's Tasks</h2>
        <div className="task-list-header-actions">
          <span className="task-list-count">
            {pendingTasks.length} remaining
          </span>
          {!showAddForm && (
            <button
              className="task-add-trigger"
              onClick={() => setShowAddForm(true)}
              aria-label="Add new task"
              title="Add task"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <AddTaskForm onAdd={addTask} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Loading state */}
      {loading && (
        <div className="task-list-status">Loading tasks…</div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="task-list-status task-list-status--error">{error}</div>
      )}

      {/* Task lists */}
      {!loading && !error && (
        <>
          {/* Pending tasks */}
          <div className="task-list-section">
            {pendingTasks.length === 0 ? (
              <p className="task-list-empty">
                No pending tasks for today&nbsp;🎉
              </p>
            ) : (
              pendingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onEdit={editTask}
                  onDelete={deleteTask}
                  isSelected={selectedTask?.id === task.id}
                  onSelect={handleSelectTask}
                />
              ))
            )}
          </div>

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="task-list-section task-list-section--completed">
              <h3 className="task-list-section-title">Completed</h3>
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onEdit={editTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Daily focus footer */}
      <div className="task-list-footer">
        <p className="task-focus-summary">
          Today's Focus: {pendingTasks.length} Task
          {pendingTasks.length !== 1 ? 's' : ''} Remaining
        </p>

        {/* Validation hint */}
        {startError && (
          <p className="task-start-error" role="alert">{startError}</p>
        )}

        {/* Start Focus Session CTA */}
        <button
          className={`start-focus-btn ${
            selectedTask ? 'start-focus-btn--ready' : 'start-focus-btn--idle'
          }`}
          onClick={handleStartFocusSession}
          aria-label="Start Focus Session"
          title={selectedTask ? `Focus on: ${selectedTask.title}` : 'Select a task first'}
        >
          🍅&nbsp;&nbsp;{selectedTask ? `Focus: ${selectedTask.title}` : 'Start Focus Session'}
        </button>
      </div>
    </div>
  );
};

This plan is optimized for maximum efficiency when utilizing an AI coding assistant like Copilot. It is structured into five highly self-contained phases. You will prompt Copilot to complete the deliverables for each step sequentially, ensuring that the code built in one phase is fully stable before moving to the next.

***

## 🚀 The Comprehensive Development Plan: FocusFlow v1.0

### 💡 Core Architectural Principle: State Management
We are no longer building a static webpage. We are building a **State Machine**. The application must operate based on a single, central `AppMode` state variable.

*   **State 1:** `DASHBOARD` (Default View: Tasks, Setup, Clock visible)
*   **State 2:** `FOCUS_MODE` (Work View: Timer full-screen, Task list hidden, Clock visible)

---

### 🔵 Phase 0: Setup & Foundation (The Boilerplate)
*(Goal: Establish the physical connection between the three technologies.)*

| Step | Task Description | Deliverable | Copilot Prompt Focus |
| :--- | :--- | :--- | :--- |
| **0.1** | **Project Initialization:** Set up the Electron main process and initialize the basic React + TypeScript application. | Running Electron desktop window shell. | `Initialize Electron and create the main entry point that bootstraps the React + TypeScript application (renderer) and serves the HTML content via a secure context bridge.` |
| **0.2** | **DB Connection Service:** Create the `DatabaseService` module that handles all SQLite interactions from the Electron main process and exposes a safe IPC API to the renderer via the `contextBridge`. | Service module in main process that validates the database connection and defines methods for `initializeTables()` (Tasks, TimeLogs, PomodoroSprints) and a clear IPC contract for `db:getTodayTasks`, `db:upsertTask`, etc. | `Write the DatabaseService in the Electron main process (using better-sqlite3 or sqlite3) and expose IPC-safe functions via `contextBridge` rather than calling SQLite directly from renderer.` |
| **0.3** | **Global State Service:** Implement a central `AppContext` (React Context + reducer) responsible for managing the global `AppMode` state (`DASHBOARD` vs. `FOCUS_MODE`). | A React Context that exposes `changeAppMode(mode)` and provides hooks for components to subscribe to mode and session state. | `Create the `AppContext` and implement state management using `useReducer` (or Zustand). Ensure the provider updates UI visibility for all major component containers based on the current mode.` |

### 🟡 Phase 1: Dashboard View & Task Management (The Setup Area)
*(Goal: Build the initial view where the user sets up tasks and tracks their schedule.)*

| Step | Task Description | Deliverable | Copilot Prompt Focus |
| :--- | :--- | :--- | :--- |
| **1.1** | **Task Display Component:** Build a `TaskList` React component and integrate it into the `DASHBOARD` view. | View that displays fetched tasks for the current day. | `Write the `TaskList` React component. Implement `taskService.getTodayTasks()` to call the `DatabaseService` IPC and render tasks using `.map()` from state/hooks.` |
| **1.2** | **Task CRUD Logic:** Implement forms and hooks for adding, editing, and marking tasks as complete. | Fully functional Task List (Add/Edit/Complete). | `Develop form handling using React controlled components to save new tasks (INSERT) and update completion status (UPDATE) via the DatabaseService IPC methods.` |
| **1.3** | **Time Clock Integration (Dashboard):** Build the primary clock component and ensure it is always visible, regardless of the app state. | Clock widget that displays real-time time and is visible in the `DASHBOARD` view. | `Create a `useClock` hook or `Clock` component using `useEffect` + `setInterval` (or timestamps for accuracy). Ensure the component is rendered in the designated Dashboard panel area.` |

### 🟢 Phase 2: The Focus Core (The State Transition)
*(Goal: Implement the core logic that transforms the app from a setup tool to a dedicated workspace.)*

| Step | Task Description | Deliverable | Copilot Prompt Focus |
| :--- | :--- | :--- | :--- |
| **2.1** | **Initiation Button:** Add a prominent "Start Focus Session" button that links a task and initiates the focus mode. | Button element that triggers the `AppContext.changeAppMode('FOCUS_MODE')`. | `Implement the button click handler using React hooks. Validate that a task is selected before calling `changeAppMode` from `AppContext` to transition the state.` |
| **2.2** | **Focus State Logic:** On state change to `FOCUS_MODE`, the Task List and Setup elements must disappear, and the Focus Timer must become dominant. | The UI hides all non-essential elements, making the timer and the active task visible. | `Write the view logic to conditionally show/hide components based on the application state.` |
| **2.3** | **Timer & Countdown:** Implement the core logic for the Pomodoro timer. It must handle countdown, cycle management (e.g., 25 minutes work, 5 minutes break), and alerts. | The functional timer component with progress visualizer. | `Develop the timer logic as a React hook (e.g., `usePomodoro`) that uses epoch timestamps (start/end) to avoid drift, persists the session state to the DB or local disk, and triggers UI transitions/notifications.` |

### 🔵 Phase 3: Polish & Polish (UX/UI)

| Area | Focus | Action |
| :--- | :--- | :--- |
| **UI/UX** | **Visual State Changes** | Apply distinct visual styling when the timer enters a "Break" or "Focus" phase (e.g., changing background colors, adjusting fonts). |
| **Interactions** | **Start/Pause Logic** | Implement robust controls for starting, pausing, and resuming the timer, which correctly updates the underlying countdown state. |
| **Persistence** | **Data Saving** | Save the last viewed project/task and the current timer state locally using browser storage (`localStorage`) so that closing and reopening the app doesn't lose progress. |
| **Final Review** | **Error Handling** | Add feedback mechanisms for unsupported actions (e.g., "Please select a task first," or "Session complete!"). |

***

### 🟣 Phase 4: Refreshing UI Personalization (Layout, Theme, Comfort)
*(Goal: Make the app feel modern, calming, and user-controlled without sacrificing clarity.)*

| Step | Task Description | Deliverable | Copilot Prompt Focus |
| :--- | :--- | :--- | :--- |
| **4.1** | **Resizable Dashboard Sections:** Implement drag-resize between Task, Pomodoro, and Clock panels. | Adjustable panel widths with constraints and persisted values. | `Add a resizable split layout (left/center/right) with drag handles, min/max widths, and persisted dimensions in localStorage. Preserve a stable layout for small screens.` |
| **4.2** | **Layout Presets:** Add one-click presets for common working styles. | Preset buttons such as `Focus`, `Balanced`, and `Tasks-first` that immediately update panel widths. | `Create layout presets and wire them to the resizable state model so users can switch instantly while still allowing manual fine-tuning.` |
| **4.3** | **Night Mode + System Sync:** Add reliable dark mode handling with optional system follow. | Theme mode options: `Light`, `Dark`, `System`. Default follows OS preference. | `Implement a theme mode state with CSS variables/tokens and auto-detect using prefers-color-scheme. Ensure contrast remains readable in all modes.` |
| **4.4** | **Curated Theme Selector:** Add a small set of calming prebuilt palettes. | 6-10 curated themes (e.g., Lavender Sky, Mint Peach, Night Ocean). | `Build a theme picker UI backed by token sets (background gradient, card glass opacity, text, accent, border). Apply theme instantly and persist selection.` |
| **4.6** | **Micro-interactions & Motion:** Improve perceived quality with subtle transitions. | Smooth hover/focus/press states and panel-resize animation feel. | `Add consistent motion tokens (120-200ms), easing standards, and reduced-motion fallbacks for interactive elements.` |



***

### ✅ Prioritized Implementation Sequence (Recommended)

1. **Night mode + theme tokens** (foundation for all visual changes).
2. **Resizable layout + presets** (highest usability impact).
3. **Curated themes** (quick personalization with quality control).
4. **Optional color picker** (advanced users only).
5. **Micro-interactions + accessibility polish** (final pass).

***

### Summary Flow:

1.  **Setup:** User interacts with Task List (Phase 3 Polish) $\rightarrow$ Selects a Task.
2.  **Start:** User clicks "Start Timer" $\rightarrow$ Triggers the Timer Service (Phase 2).
3.  **Focus:** State changes to `FOCUS` $\rightarrow$ UI enters Focus Mode (Phase 2/3) $\rightarrow$ Timer counts down (Phase 2).
4.  **Cycle:** Timer hits zero $\rightarrow$ State changes to `BREAK` $\rightarrow$ UI enters Break Mode (Phase 2/3).
5.  **Personalize:** User selects theme/layout preset (Phase 4) $\rightarrow$ Preferences persist across restarts.
6.  **End:** Cycle completes $\rightarrow$ Alerts user $\rightarrow$ Saves session and UI preferences for next launch (Phase 3/4).
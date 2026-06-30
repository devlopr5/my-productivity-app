This document serves as a comprehensive **Product Requirement Document (PRD)** for your personalized local productivity application. It outlines the functional requirements, technical specifications, and detailed UI/UX guidelines necessary to build the application.

***

# 🧘 FocusFlow: Productivity App Blueprint
**Version:** 1.0
**Platform:** Local Desktop Application (Windows, macOS, Linux)
**Database:** SQLite

## 🚀 1. Overview & Goal
The goal of FocusFlow is to create a highly aesthetic, distraction-free, and minimalist desktop application that centralizes time tracking, task management, and focused work sessions in one intuitive interface. The application must feel calming, refreshing, and modern.

## 💻 2. Technical Specifications & Database Design

### A. Tech Stack Recommendation
*   **Frontend Framework:** React + TypeScript (primary). Vue is listed as an alternative for rapid prototyping.
    *   **Why React+TypeScript:** large ecosystem (Electron + React tooling), strong TypeScript support, mature state-management patterns (Context, Zustand, Redux), and easy access to libraries and components for timers, charts, and UI kits.
*   **Styling:** Tailwind CSS or Styled Components (to manage complex glass/blur effects).
*   **Local Database:** SQLite (Handles all persistent data storage).

### B. Database Schema (SQLite Tables)

| Table | Purpose | Key Fields | Notes |
| :--- | :--- | :--- | :--- |
| **`Tasks`** | Stores all to-do list items. | `task_id` (PK), `title` (TEXT), `description` (TEXT), `due_date` (DATE), `is_completed` (BOOLEAN), `date_created` (DATETIME) | The `due_date` field is critical for filtering today's tasks. |
| **`TimeLogs`** | Stores time clock entries (sessions). | `log_id` (PK), `user_id` (INT), `start_time` (DATETIME), `end_time` (DATETIME), `project` (TEXT), `duration_minutes` (INT) | Allows history tracking and reporting. |
| **`PomodoroSprints`** | Tracks completed Pomodoro cycles. | `sprint_id` (PK), `date_completed` (DATE), `focus_duration` (INT), `break_duration` (INT) | Good for daily progress visualization. |

**Notes on implementation:** Database access must run in the Electron main process; the renderer should call a narrow IPC API exposed via `contextBridge`. Use `better-sqlite3` for synchronous, reliable access in main, and include a migration/version table to manage schema updates. Provide explicit CREATE TABLE statements in the dev plan and a migration strategy before development.

***

## ✨ 3. Feature Specifications (Core Modules)

### A. 🕰️ Time Clock Module (The Tracker)
**Functionality:** Simple start/stop mechanism to log billable or work time.
*   **Start Session:** A large, easily clickable button ("Start Work"). On click, it logs the current date and time into the `TimeLogs` table and activates a visible timer.
*   **Stop Session:** A dedicated button ("Stop Work"). On click, it calculates the elapsed time, logs the end time, and saves the total duration to the database.
*   **Logging:** Must display a running total for the current day/week.
*   **History View:** A simple view displaying the last 5-10 logged sessions, showing Start Date/Time, End Date/Time, and Total Duration (e.g., "2 hours 15 mins").

### B. 🍅 Pomodoro Timer Module (The Focus)
**Functionality:** Structured timing for deep work and mandatory breaks.
*   **Cycle:** The core cycle (default: 25 mins work / 5 mins break / 15 mins long break after 4 cycles).
*   **Interface:** A prominent, visual countdown timer that dominates this module when active.
*   **Controls:** Clear "Start," "Pause," and "Skip" buttons.
*   **State Management:** When a cycle ends (e.g., Focus time ends), the UI must automatically prompt/transition to the next phase (e.g., "Time for your 5-minute break!").
*   **Persistence:** Should remember the session state if the app is closed and reopened (or show the next scheduled cycle).

### C. ✅ Task List Module (The Organizer)
**Functionality:** Focused task management with strict date filtering.
*   **Scope Restriction:** This list **must only** display tasks where the `due_date` matches today's date.
*   **Input/CRUD:** Standard functionality to Add, Edit, and Delete tasks.
*   **Task Entry:**
    *   Title (Mandatory)
    *   Description (Optional)
    *   *Due Date Selector:* (Crucial for future planning)
*   **Completion:** Tapping a task toggles its `is_completed` status. Completed tasks should be visually dimmed or moved to a "Completed" section within the panel, keeping the main list clean.
*   **Daily Focus:** A small section should summarize the day: "Today’s Focus: 3 Tasks Remaining | 1 Pomodoro Session Available."

***

## 🎨 4. UI/UX & Aesthetics Specification

This section guides the visual feel of the app, ensuring the "refreshing" and "minimal" aesthetic is met.

### A. Design Principles
1.  **Minimalism:** Utilize ample whitespace. Never clutter the interface. Limit color palette use to the pastel gradient and system accents.
2.  **Focus:** Each module should feel like its own dedicated "card" or container, visually separating the time clock, pomodoro, and tasks.
3.  **Clarity:** Use high-contrast text (dark text on light, transparent background) to ensure readability regardless of the background gradient.

### B. Visual Styling: Glassmorphism
*   **Effect:** All functional containers (Task Card, Time Clock Panel, Pomodoro Display) must utilize the glass effect.
    *   *Implementation:* Use a `backdrop-filter: blur(10px);` CSS property.
    *   *Background:* Give the containers a subtle, high-opacity white/light color (e.g., `rgba(255, 255, 255, 0.3)`).
    *   *Depth:* Add a soft, diffused box-shadow underneath the glass containers to make them appear floating above the background.

### C. Color Palette: Pastel Gradient Background
*   **Background:** The primary background of the entire application window must be a soft, soothing gradient.
    *   *Recommendation:* A seamless blend between two soft hues (e.g., Lavender $\rightarrow$ Sky Blue, or Mint Green $\rightarrow$ Pale Peach).
    *   *Example Gradient:* `linear-gradient(135deg, #b3e0ff 0%, #fce9e7 100%)`
*   **Accent Colors (Active State):** Use soft, desaturated versions of the background colors for active buttons or highlights, maintaining the calm tone.
*   **Text:** Primary text should be a deep, but not harsh, gray (e.g., `#333333`).

### D. Layout Concept (Conceptual Flow)

| Area | Content | Visual Treatment | Notes |
| :--- | :--- | :--- | :--- |
| **Top Header** | App Name, Date, User Greeting | Clean, minimalist text. | Quick status check. |
| **Left Panel (35%)** | **Task List** (Today’s only) | Glass Panel. | Primary interaction point. The fastest content to scan. |
| **Center Panel (45%)** | **Pomodoro Timer** (Dominant feature) | Large Glass Panel. | Must have maximum visual prominence when running. |
| **Right Panel (20%)** | **Time Clock** (Summary/History) | Glass Panel. | Simple status display (e.g., "Currently Focused on: Project X"). |

***

## 📐 5. User Workflow Example

**Scenario:** The user opens the app in the morning.

1.  **Visual Check:** The user sees the soothing pastel gradient background, and three floating glass panels.
2.  **Task Review (Left Panel):** The user immediately sees only tasks due today, confirming their priorities for the day.
3.  **Focus Kick-off (Center Panel):** The user clicks the "Start Pomodoro" button. The center timer becomes active, dominating the screen, and a soft, audible chime signals the start.
4.  **Time Logging (Right Panel):** While working, the user clicks the "Start Work" button in the time clock panel. The right panel updates to show "Active: ⏱️ 00:00:00 – Focus Session."
5.  **Completion:** The user completes the cycle, the timer transitions to the break, and the user checks off the corresponding task in the Task List.

***
*(End of Document)*
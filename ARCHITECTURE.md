# Architecture Specification — Race Timer PWA

This document outlines the system architecture, state management principles, timer engine design, and local storage schema for **Race Timer**.

---

## 1. System Architecture Overview

```mermaid
graph TD
    UI["React 19 Presentation Layer<br/>(Tailwind CSS, Lucide Icons)"]
    Hooks["Custom Reactive Hooks<br/>(useTimerEngine, useRaces, useSettings)"]
    TimerEngine["TimerEngine<br/>(Pure Timestamp State Machine)"]
    Storage["IndexedDB Service Layer<br/>(RaceTimerDB)"]
    Audio["Web Audio Synthesizer<br/>(Zero-dep Oscillators)"]
    WakeLock["Screen Wake Lock API<br/>(Auto Reacquisition)"]
    Portability["Import & Export Service<br/>(JSON, CSV, JSZip)"]

    UI --> Hooks
    Hooks --> TimerEngine
    Hooks --> Storage
    TimerEngine --> Audio
    TimerEngine --> WakeLock
    TimerEngine -. Persists Active Runtime State .-> Storage
    Portability <--> Storage
```

---

## 2. Race State Machine

The timer transitions through well-defined, explicit operational states:

```mermaid
stateDiagram-v2
    [*] --> IDLE: Initialize Run
    IDLE --> RUNNING: Start
    RUNNING --> PAUSED: Pause
    PAUSED --> RUNNING: Resume
    
    RUNNING --> WARNING: Remaining <= Threshold
    WARNING --> RUNNING: Threshold passed
    WARNING --> PAUSED: Pause

    RUNNING --> OVERTIME: Remaining <= 0 (AutoAdvance OFF)
    OVERTIME --> PAUSED: Pause
    PAUSED --> OVERTIME: Resume
    
    RUNNING --> TASK_EXPIRED: Remaining <= 0 (AutoAdvance ON)
    TASK_EXPIRED --> RUNNING: Advance to Next Task

    RUNNING --> TASK_COMPLETED: Complete Task
    TASK_COMPLETED --> RUNNING: Advance to Next Task

    RUNNING --> TASK_SKIPPED: Skip Task
    TASK_SKIPPED --> RUNNING: Advance to Next Task

    RUNNING --> RACE_COMPLETED: Last Task Finished
    OVERTIME --> RACE_COMPLETED: Complete / Finish
    TASK_EXPIRED --> RACE_COMPLETED: Final Task Expired

    RACE_COMPLETED --> [*]
```

---

## 3. Separation of Concerns: Template vs. Run

One of the fundamental design decisions in Race Timer is treating a **Race Template** and a **Race Run** as decoupled entities:

```mermaid
erDiagram
    RaceTemplate ||--o{ Task : contains
    RaceTemplate ||--o{ RaceRun : instantiates
    RaceRun ||--o{ TaskRun : tracks

    RaceTemplate {
        string id PK
        string name
        string category
        string description
        string[] tags
        string createdAt
        string updatedAt
        boolean isArchived
        boolean isSample
    }

    Task {
        string id PK
        string name
        number durationSeconds
        string notes
        number order
        boolean enabled
        string color
    }

    RaceRun {
        string id PK
        string templateId FK
        RaceTemplate templateSnapshot
        string startedAt
        string completedAt
        string status
        number totalAllocatedSeconds
        number totalActualSeconds
        number totalOvertimeSeconds
        number totalPausedSeconds
    }

    TaskRun {
        string taskId FK
        Task taskSnapshot
        number allocatedSeconds
        number actualSeconds
        number overtimeSeconds
        string status
        string startedAt
        string completedAt
    }
```

### Why Snapshots Matter
When a user begins a race, a full deep snapshot of the template is embedded into `RaceRun.templateSnapshot`. If the user later edits the template's task durations or names, past historical runs remain immutable and authentic.

---

## 4. State Classification

The application strictly separates state into three tiers:

| Tier | Type | Storage | Examples |
| :--- | :--- | :--- | :--- |
| **Persistent State** | Domain entities | IndexedDB (`RaceTimerDB`) | Race templates, past runs, user settings, backup timestamps. |
| **Runtime State** | High-precision timers | In-Memory + Lightweight IDB sync | `taskStartedAt`, `taskPausedAt`, `raceAccumulatedPausedMs`, active task index. |
| **Derived State** | Computed on-the-fly | Reactive getters | `taskRemainingSeconds`, `progressPercent`, `isOvertime`, `estimatedFinishTime`. |

---

## 5. Interruption Recovery Architecture

When an active race is in progress, the engine periodically persists an `ActiveRunRuntimeState` into IndexedDB.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant Engine as TimerEngine
    participant DB as IndexedDB

    User->>Engine: Start Race
    Engine->>DB: Save ActiveRunRuntimeState (taskStartedAt, raceStartedAt)
    Note over Browser: Browser closed / Laptop closed / Device sleep
    User->>Browser: Reopen Race Timer
    Browser->>DB: getActiveRuntimeState()
    DB-->>Browser: Found running/paused state
    Browser->>User: Display Interruption Modal<br/>("Resume Race? Elapsed: 18:42")
    alt User clicks Resume
        User->>Engine: recover(savedState)
        Engine->>Engine: Recalculate true elapsed = now - startedAt - pausedMs
        Engine->>User: Live countdown resumes seamlessly
    else User clicks Restart
        User->>Engine: initializeRun(templateSnapshot)
        Engine->>User: Race restarts from 00:00
    else User clicks Discard
        User->>DB: clearActiveRuntimeState()
    end
```

---

## 6. Offline PWA Strategy

- **Service Worker**: Generated via `vite-plugin-pwa` with Workbox caching.
- **Cache Strategy**: Pre-caches HTML, JS, CSS, SVG, and web fonts. Once loaded, the application operates 100% offline without needing an active internet connection.
- **Data Locality**: Zero external API endpoints, zero tracking scripts, zero hosted assets. All audio is synthesized on the fly via the browser's native `AudioContext`.

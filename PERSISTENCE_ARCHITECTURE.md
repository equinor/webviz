# Persistence Architecture

## Overview

The Webviz persistence feature enables users to save, restore, and share their workbench sessions and snapshots. It provides automatic local storage recovery, backend persistence via CosmosDB, and comprehensive session management.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Architecture Overview](#architecture-overview)
- [Data Flow](#data-flow)
- [Frontend Components](#frontend-components)
- [Backend Services](#backend-services)
- [Persistence Flow Diagrams](#persistence-flow-diagrams)
- [Module State Persistence](#module-state-persistence-for-developers)

---

## Core Concepts

### Sessions vs Snapshots

- **Sessions**: Mutable workbench states that can be created, updated, and deleted by their owner. Sessions are private to the user.
- **Snapshots**: Immutable point-in-time captures that can be shared with others via a URL. Anyone with the snapshot ID can view it.

### Persistence Layers

1. **Local Storage**: Automatic recovery buffer for unsaved changes
2. **Backend Storage**: Permanent persistence in CosmosDB with full CRUD operations
3. **URL-based Loading**: Direct loading via session/snapshot IDs in the URL

### Key Features

- **Auto-save to Local Storage**: Changes are automatically persisted to browser's local storage with debouncing (200ms)
- **Manual Backend Persistence**: Users explicitly save sessions to backend
- **Save As**: Create a new session from an existing one with a different title
- **Crash Recovery**: On application start, users can recover unsaved sessions from local storage
- **Change Tracking**: Hash-based change detection using SHA-256
- **Conflict Detection**: Periodic backend polling (every 10 seconds) to detect external changes
- **Snapshot Sharing**: Immutable snapshots with visit tracking and access logs
- **Smart Polling**: Backend polling pauses when window is hidden, resumes when active
- **Content Size Validation**: Both frontend and backend enforce 1.5MB limit

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   Workbench (Main Coordinator)                                │  │
│  │  - Delegates to SessionManager, NavigationManager, Services   │  │
│  │  - Manages initialization and lifecycle                       │  │
│  │  - Provides clean API surface via getters                     │  │
│  └────────┬──────────────────────┬───────────────────────────────┘  │
│           │                      │                                  │
│  ┌────────▼──────────┐  ┌────────▼──────────────────────────────┐   │
│  │ NavigationManager │  │  WorkbenchSessionManager              │   │
│  │                   │  │  - Session lifecycle & CRUD           │   │
│  │ - beforeunload    │  │  - Navigation handling                │   │
│  │ - popstate events │  │  - Recovery from localStorage         │   │
│  │ - Callback-based  │  │  - Toast management                   │   │
│  │ - Instance pattern│  │  - Metadata operations                │   │
│  └───────────────────┘  └───────────┬───────────────┬────────────┘   │
│                                     │               │                │
│                      ┌──────────────▼──┐  ┌─────────▼────────────┐   │
│                      │ PrivateWorkbench│  │ PersistenceOrchestrator│ │
│                      │ Session         │  │ - Auto-save (200ms)  │   │
│                      │ - Serialization │  │ - Polling (10s)      │   │
│                      │ - AtomStoreMaster│  │ - Result Type Pattern│  │
│                      │ - Dashboards    │  └──────────┬───────────┘   │
│                      │ - Modules       │             │               │
│                      └─────────────────┘    ┌────────┼───────┐       │
│                                             │        │       │       │
│                                     ┌───────▼──┐ ┌───▼───┐ ┌▼─────┐ │
│                                     │ Session  │ │Backend│ │Local │ │
│                                     │ State    │ │ Sync  │ │Backup│ │
│                                     │ Tracker  │ │Manager│ │Mgr   │ │
│                                     └──────────┘ └───────┘ └──────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS/REST API
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                          Backend Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              FastAPI Router Layer                            │   │
│  │  /persistence/sessions     - CRUD operations                 │   │
│  │  /persistence/snapshots    - Create/Read/Delete              │   │
│  │  /persistence/snapshot_access_logs - Visit tracking          │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │              Store Layer                                     │   │
│  │  SessionStore          - Session CRUD + Validation           │   │
│  │  SnapshotStore         - Snapshot CRUD + Validation          │   │
│  │  SnapshotAccessLogStore - Visit tracking + Logging           │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │              CosmosDB Container Layer                        │   │
│  │  - Query/Insert/Update/Delete/Patch                          │   │
│  │  - Error Handling & Mapping                                  │   │
│  │  - Pagination Support                                        │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    Azure CosmosDB                                   │
│                                                                     │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │   sessions     │  │   snapshots      │  │ snapshot_access  │     │
│  │   container    │  │   container      │  │ _logs container  │     │
│  │                │  │                  │  │                  │     │
│  │ PK: owner_id   │  │ PK: id           │  │ PK: visitor_id   │     │
│  └────────────────┘  └──────────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Creating a New Session

```
User creates workbench content
         │
         ▼
Local changes trigger SERIALIZED_STATE event
         │
         ▼
PersistenceOrchestrator schedules refresh (200ms debounce)
         │
         ▼
SessionStateTracker.refresh() - Serialize & Hash
         │
         ├─► LocalBackupManager.persist() - Save to localStorage
         └─► hasChanges = (currentHash !== lastPersistedHash)
```

### 2. Saving Session to Backend

```
User clicks "Save Session"
         │
         ▼
SaveSessionDialog (Get title/description if needed)
         │
         ▼
WorkbenchSessionManager.saveActiveSession()
         │
         ├─► PersistenceOrchestrator.persistNow()
         │    │
         │    ├─► Validate content size (<1.5MB)
         │    │
         │    ├─► NEW Session:
         │    │    └─► BackendSyncManager.createSession()
         │    │         └─► POST /persistence/sessions
         │    │              └─► SessionStore.create_async()
         │    │                   ├─► Generate nanoid (12 chars)
         │    │                   ├─► Hash content (SHA-256)
         │    │                   └─► CosmosContainer.insert_item_async()
         │    │
         │    └─► EXISTING Session:
         │         └─► BackendSyncManager.updateSession()
         │              └─► PUT /persistence/sessions/{session_id}
         │                   └─► SessionStore.update_async()
         │                        ├─► Verify ownership
         │                        ├─► Increment version
         │                        ├─► Update timestamp
         │                        ├─► Hash content (SHA-256)
         │                        └─► CosmosContainer.update_item_async()
         │
         └─► Return PersistResult { success: true/false, reason?, message? }
              │
              └─► WorkbenchSessionManager shows appropriate toast
                   ├─► Success: "Session saved successfully"
                   ├─► No changes: "No changes to save"
                   ├─► Too large: "Session too large: X MB (max 1.5 MB)"
                   └─► Error: "Failed to save session"
```

### 3. Save As (Creating Copy)

```
User clicks "Save As" in dropdown
         │
         ▼
SaveSessionDialog opens (with title pre-filled)
         │
         ▼
WorkbenchSessionManager.saveAsNewSession(title, description)
         │
         ├─► PrivateWorkbenchSession.createCopy()
         │    ├─► Deep copy via serialize/deserialize
         │    ├─► Reset ID to null
         │    └─► Mark as unpersisted
         │
         ├─► Update metadata (BEFORE setting active to avoid dirty state)
         │
         ├─► Close current session
         │
         ├─► Set new session as active
         │
         └─► PersistenceOrchestrator.persistNow()
              └─► Save to backend as new session
```

### 4. Creating a Snapshot

```
User clicks "Create Snapshot"
         │
         ▼
CreateSnapshotDialog (Get title/description)
         │
         ▼
WorkbenchSessionManager.createSnapshot()
         │
         ▼
PersistenceOrchestrator.createSnapshot()
         │
         ├─► Serialize current session content
         ├─► BackendSyncManager.createSnapshot()
         │    └─► POST /persistence/snapshots
         │         ├─► SnapshotStore.create_async()
         │         │    ├─► Generate nanoid (12 chars)
         │         │    ├─► Hash content (SHA-256)
         │         │    └─► CosmosContainer.insert_item_async()
         │         │
         │         └─► SnapshotAccessLogStore.log_snapshot_visit_async()
         │              ├─► Create initial access log (implicit visit)
         │              ├─► Set visit count = 1
         │              └─► Record first_visited_at & last_visited_at
         │
         └─► Return CreateSnapshotResult { success: true/false, message? }
              │
              └─► WorkbenchSessionManager shows toast and refetches queries
```

### 5. Loading a Session from Backend

```
URL contains ?session={sessionId}
         │
         ▼
Workbench.initialize() or handleNavigation()
         │
         ▼
WorkbenchSessionManager.openSession(sessionId)
         │
         ├─► GET /persistence/sessions/{session_id}
         │    └─► SessionStore.get_async()
         │         ├─► Verify ownership
         │         └─► CosmosContainer.get_item_async()
         │
         ├─► Deserialize & validate content (AJV/JTD schema)
         ├─► PrivateWorkbenchSession.fromDataContainer()
         │    ├─► Load ensemble metadata
         │    ├─► Deserialize dashboards
         │    ├─► Restore module state
         │    └─► Restore settings
         │
         ├─► PersistenceOrchestrator.start()
         │    ├─► Initialize SessionStateTracker with backend hash
         │    ├─► Start backend polling (10s interval, window-aware)
         │    └─► Subscribe to session changes
         │
         └─► Check for local storage recovery
              └─► Show ActiveSessionRecoveryDialog if found
```

### 6. Loading a Snapshot

```
URL contains ?snapshot={snapshotId}
         │
         ▼
Workbench.initialize() or handleNavigation()
         │
         ▼
WorkbenchSessionManager.openSnapshot(snapshotId)
         │
         ├─► GET /persistence/snapshots/{snapshot_id}
         │    ├─► SnapshotStore.get_async() - No ownership check!
         │    │    └─► CosmosContainer.get_item_async()
         │    │
         │    └─► SnapshotAccessLogStore.log_snapshot_visit_async()
         │         ├─► Get or create access log
         │         ├─► Increment visit count
         │         ├─► Update last_visited_at
         │         └─► CosmosContainer.update_item_async()
         │
         ├─► Deserialize & validate content
         └─► PrivateWorkbenchSession.fromDataContainer()
              └─► Mark as isSnapshot = true (read-only)
```

### 7. Session Recovery Flow

```
Application starts (Workbench.initialize())
         │
         ▼
loadAllWorkbenchSessionsFromLocalStorage()
         │
         ├─► Find all keys matching "webviz:session:*"
         ├─► Deserialize & validate each
         └─► Return array of WorkbenchSessionDataContainer
         │
         ▼
Check URL for session/snapshot ID
         │
         ├─► IF URL has session ID:
         │    ├─► Load session from backend
         │    └─► IF local storage has matching ID:
         │         └─► Show ActiveSessionRecoveryDialog
         │              ├─► "Recover" - Load from local storage
         │              └─► "Discard" - Remove from local storage
         │
         └─► ELSE IF local storage sessions exist:
              └─► Show MultiSessionsRecoveryDialog
                   ├─► Display all recoverable sessions
                   ├─► User selects one to open
                   └─► User can discard individual sessions
```

### 8. Change Detection & Auto-Save

```
User makes changes to dashboard/modules/settings
         │
         ▼
Module/Dashboard/Settings notifies via PublishSubscribe
         │
         ▼
PersistenceOrchestrator.scheduleRefresh()
         │
         ├─► Clear existing timeout (if any)
         └─► Set new timeout (200ms debounce)
         │
         ▼
SessionStateTracker.refresh()
         │
         ├─► Serialize session content
         ├─► Calculate SHA-256 hash
         ├─► Compare with last persisted hash
         │
         └─► IF different:
              ├─► Update currentHash & currentStateString
              ├─► Update lastModifiedMs
              ├─► LocalBackupManager.persist() to localStorage
              └─► Notify subscribers (hasChanges = true)
```

### 9. Backend Conflict Detection

```
Every 10 seconds (when window is visible)
         │
         ▼
PersistenceOrchestrator polling
         │
         ├─► Check WindowActivityObserver.isVisible()
         │    └─► Skip if hidden
         │
         ├─► BackendSyncManager.fetchUpdatedAt(sessionId)
         │    └─► GET /persistence/sessions/metadata/{session_id}
         │
         ├─► SessionStateTracker.updateBackendTimestamp()
         └─► Notify subscribers
         │
         ▼
UI components subscribe to PERSISTENCE_INFO
         │
         └─► Display warning if:
              backendLastUpdatedMs > lastPersistedMs
              (Indicates external changes)
```

---

## Frontend Components

### Core Services

#### Workbench
[frontend/src/framework/Workbench.ts](frontend/src/framework/Workbench.ts)

**Responsibilities:**
- Main coordinator that delegates to specialized managers
- Provides clean API surface via getter methods
- Manages initialization and lifecycle
- Coordinates between SessionManager, NavigationManager, and Services

**Architecture Philosophy:**
- Workbench is a thin coordination layer
- All business logic delegated to specialized managers
- Clean separation of concerns
- Easy to test and maintain

#### NavigationManager
[frontend/src/framework/internal/NavigationManager.ts](frontend/src/framework/internal/NavigationManager.ts)

**Responsibilities:**
- Monitors browser navigation events (beforeunload, popstate)
- Provides callback-based API for navigation handling
- Instance-based pattern (NOT singleton) for proper isolation
- Manages event listener lifecycle

**Why Instance-Based (Not Singleton):**
- No pub/sub possible due to requirement for direct response

#### WorkbenchSessionManager
[frontend/src/framework/internal/WorkbenchSession/WorkbenchSessionManager.ts](frontend/src/framework/internal/WorkbenchSession/WorkbenchSessionManager.ts)

**Responsibilities:**
- Session lifecycle (create, open, close)
- Save operations (save, save as new)
- Snapshot operations (create, delete)
- Session/snapshot CRUD operations (update metadata, delete)
- Navigation handling with dirty state protection
- Recovery from localStorage

#### PersistenceOrchestrator
[frontend/src/framework/internal/persistence/core/PersistenceOrchestrator.ts](frontend/src/framework/internal/persistence/core/PersistenceOrchestrator.ts)

**Responsibilities:**
- Coordinates auto-save to localStorage (200ms debounce)
- Smart backend polling (10s interval, window-aware)
- Change detection using SessionStateTracker
- Publishes PersistenceInfo updates

#### SessionStateTracker
[frontend/src/framework/internal/persistence/core/SessionStateTracker.ts](frontend/src/framework/internal/persistence/core/SessionStateTracker.ts)

**Responsibilities:**
- SHA-256 hash-based state comparison
- Deterministic JSON serialization
- Separate metadata and content tracking
- Backend hash as source of truth for persisted sessions

#### BackendSyncManager
[frontend/src/framework/internal/persistence/core/BackendSyncManager.ts](frontend/src/framework/internal/persistence/core/BackendSyncManager.ts)

**Responsibilities:**
- All backend API communication
- Cache invalidation after CRUD operations
- Polling for session metadata updates

#### LocalBackupManager
[frontend/src/framework/internal/persistence/core/LocalBackupManager.ts](frontend/src/framework/internal/persistence/core/LocalBackupManager.ts)

**Responsibilities:**
- Auto-save to localStorage
- Recovery data management

#### PrivateWorkbenchSession
[frontend/src/framework/internal/WorkbenchSession/PrivateWorkbenchSession.ts](frontend/src/framework/internal/WorkbenchSession/PrivateWorkbenchSession.ts)

**Responsibilities:**
- State management (dashboards, modules, settings, ensembles)
- Serialization/deserialization of workbench state
- AtomStoreMaster integration for reactive state
- Metadata management (title, description, timestamps)
- Read-only snapshot mode enforcement
- Session copying for "Save As" functionality

### Dialogs

#### CreateSnapshotDialog
[frontend/src/framework/internal/components/CreateSnapshotDialog/createSnapshotDialog.tsx](frontend/src/framework/internal/components/CreateSnapshotDialog/createSnapshotDialog.tsx)

Creates immutable snapshots with title and description. Displays shareable URL on success.

#### SaveSessionDialog
[frontend/src/framework/internal/components/SaveSessionDialog/saveSessionDialog.tsx](frontend/src/framework/internal/components/SaveSessionDialog/saveSessionDialog.tsx)

Prompts for title/description when:
- Saving a session for the first time (not yet persisted)
- Saving an existing session as a new session (Save As)

#### ActiveSessionRecoveryDialog
[frontend/src/framework/internal/components/ActiveSessionRecoveryDialog/activeSessionRecoveryDialog.tsx](frontend/src/framework/internal/components/ActiveSessionRecoveryDialog/activeSessionRecoveryDialog.tsx)

Shown when local storage has unsaved changes for the currently active session loaded from backend.

#### MultiSessionsRecoveryDialog
[frontend/src/framework/internal/components/MultiSessionsRecoveryDialog/multiSessionsRecoveryDialog.tsx](frontend/src/framework/internal/components/MultiSessionsRecoveryDialog/multiSessionsRecoveryDialog.tsx)

Shown on app start when multiple sessions with unsaved changes are found in local storage.

#### PersistenceManagementDialog
[frontend/src/framework/internal/components/PersistenceManagementDialog/persistenceManagementDialog.tsx](frontend/src/framework/internal/components/PersistenceManagementDialog/persistenceManagementDialog.tsx)

Tabbed dialog for managing sessions and snapshots. Provides CRUD operations and search/filter capabilities.

### Utilities

#### Loaders
[frontend/src/framework/internal/WorkbenchSession/utils/loaders.ts](frontend/src/framework/internal/WorkbenchSession/utils/loaders.ts)

- `loadWorkbenchSessionFromBackend()` - Fetch session via API
- `loadSnapshotFromBackend()` - Fetch snapshot via API
- `loadWorkbenchSessionFromLocalStorage()` - Load from localStorage by ID
- `loadAllWorkbenchSessionsFromLocalStorage()` - Load all recovery sessions

#### CRUD Helpers
[frontend/src/framework/internal/WorkbenchSession/utils/crudHelpers.ts](frontend/src/framework/internal/WorkbenchSession/utils/crudHelpers.ts)

- `createSessionWithCacheUpdate()` - Create session & refetch React Query cache
- `updateSessionAndCache()` - Update session & refetch cache
- `createSnapshotWithCacheUpdate()` - Create snapshot & refetch cache (includes access logs)
- `removeSessionQueryData()` - Remove deleted session from cache
- `removeSnapshotQueryData()` - Remove deleted snapshot from cache
- `replaceSessionQueryData()` - Update session in cache

**Note:** Uses `refetchQueries()` instead of `invalidateQueries()` for immediate UI updates after creation.

#### Deserialization
[frontend/src/framework/internal/WorkbenchSession/utils/deserialization.ts](frontend/src/framework/internal/WorkbenchSession/utils/deserialization.ts)

- Schema validation using AJV (JSON Typedef)
- Conversion between API types and internal data containers
- Error handling for corrupted/invalid data

---

## Backend Services

### API Router Layer
[backend_py/primary/primary/routers/persistence/router.py](backend_py/primary/primary/routers/persistence/router.py)

FastAPI endpoints with comprehensive OpenAPI documentation:

**Session Endpoints:**
- `GET /sessions` - List sessions with pagination, sorting, filtering
- `GET /sessions/{session_id}` - Get full session with content
- `GET /sessions/metadata/{session_id}` - Get metadata only (lightweight)
- `POST /sessions` - Create new session
- `PUT /sessions/{session_id}` - Update existing session
- `DELETE /sessions/{session_id}` - Delete session

**Snapshot Endpoints:**
- `GET /snapshots` - List owned snapshots
- `GET /snapshots/{snapshot_id}` - Get snapshot (any user) + log visit
- `POST /snapshots` - Create snapshot + implicit visit log
- `DELETE /snapshots/{snapshot_id}` - Delete snapshot + mark logs deleted

**Snapshot Access Log Endpoints:**
- `GET /snapshot_access_logs` - List visited snapshots with filtering

### Store Layer

#### SessionStore
[backend_py/primary/primary/persistence/session_store/session_store.py](backend_py/primary/primary/persistence/session_store/session_store.py)

**Responsibilities:**
- Session CRUD operations
- Ownership verification
- Automatic metadata management (version, timestamps, hash)
- Query support (pagination, sorting, filtering)
- Content size validation (1.5MB limit)

**Security:**
- Partition key: `owner_id` (ensures data isolation)
- Ownership checks on all read/update/delete operations

#### SnapshotStore
[backend_py/primary/primary/persistence/snapshot_store/snapshot_store.py](backend_py/primary/primary/persistence/snapshot_store/snapshot_store.py)

**Responsibilities:**
- Snapshot creation and deletion
- Public read access (no ownership check on GET)
- Query support for owned snapshots
- Content size validation (1.5MB limit)

**Security:**
- Partition key: `id` (snapshot_id) - allows cross-user access
- Ownership check only on DELETE
- Immutable after creation

#### SnapshotAccessLogStore
[backend_py/primary/primary/persistence/snapshot_store/snapshot_access_log_store.py](backend_py/primary/primary/persistence/snapshot_store/snapshot_access_log_store.py)

**Responsibilities:**
- Track snapshot visits per user
- Maintain visit counts and timestamps
- Support query/filtering of visited snapshots

**Features:**
- Composite ID: `{snapshot_id}__{visitor_id}`
- Partition key: `visitor_id` (ensures efficient user queries)
- Automatic metadata enrichment from SnapshotStore

### Database Layer

#### CosmosContainer
[backend_py/primary/primary/persistence/cosmosdb/cosmos_container.py](backend_py/primary/primary/persistence/cosmosdb/cosmos_container.py)

Generic container wrapper with:
- Pydantic model validation
- Error mapping (404, 409, 412, 429, etc.)
- Query operations (with pagination tokens)
- CRUD operations (create, read, update, delete, patch)
- Async context management

#### FilterFactory & QueryCollationOptions
[backend_py/primary/primary/persistence/cosmosdb/filter_factory.py](backend_py/primary/primary/persistence/cosmosdb/filter_factory.py)

SQL query builder with:
- Type-safe filters (EQUALS, CONTAINS, MORE, LESS)
- Case-insensitive sorting
- Pagination support
- Parameter binding for SQL injection prevention
- Support for Pydantic `@computed_field` properties

### Background Tasks

#### mark_logs_deleted_task
[backend_py/primary/primary/persistence/tasks/mark_logs_deleted_task.py](backend_py/primary/primary/persistence/tasks/mark_logs_deleted_task.py)

Asynchronously marks all access logs as deleted when a snapshot is deleted.
- Bounded concurrency (32 concurrent PATCH operations)
- Idempotent (safe to re-run)
- Graceful failure handling (continues even if some operations fail)

---

## Persistence Flow Diagrams

### Session Lifecycle

```
┌─────────────────┐
│   New Session   │
│  (Unsaved)      │
└────────┬────────┘
         │
         │ User makes changes
         │
         ▼
┌─────────────────┐
│  Local Storage  │◄───────────────┐
│  (Auto-save)    │                │
└────────┬────────┘                │
         │                         │
         │ User clicks "Save"      │ User makes more changes
         │                         │
         ▼                         │
┌─────────────────┐                │
│ Backend Session │                │
│  (Persisted)    │                │
└────────┬────────┘                │
         │                         │
         │ User makes changes      │
         │                         │
         └─────────────────────────┘
         │
         │ User clicks "Update" or "Save As"
         │
         ▼
┌─────────────────┐
│ Backend Session │
│  (Updated or    │
│   New Copy)     │
└─────────────────┘
```

### Snapshot Sharing Flow

```
User A                  Backend                  User B
   │                       │                        │
   │  Create Snapshot      │                        │
   ├──────────────────────►│                        │
   │                       │                        │
   │  Return snapshot_id   │                        │
   │◄──────────────────────┤                        │
   │                       │                        │
   │  Log implicit visit   │                        │
   ├──────────────────────►│                        │
   │                       │                        │
   │  Share URL            │                        │
   ├───────────────────────┼───────────────────────►│
   │                       │                        │
   │                       │  GET /snapshots/{id}   │
   │                       │◄───────────────────────┤
   │                       │                        │
   │                       │  Return content        │
   │                       ├───────────────────────►│
   │                       │                        │
   │                       │  Log visit (User B)    │
   │                       │◄───────────────────────┤
```

### Crash Recovery Flow

```
Application Start
        │
        ▼
Check localStorage
        │
        ├─► No sessions found
        │    └─► Normal startup
        │
        └─► Sessions found
             │
             ├─► Check URL
             │    │
             │    ├─► Has session ID
             │    │    ├─► Load from backend
             │    │    └─► Show ActiveSessionRecoveryDialog
             │    │         ├─► Recover: Load from localStorage
             │    │         └─► Discard: Delete from localStorage
             │    │
             │    └─► No session/snapshot ID
             │         └─► Show MultiSessionsRecoveryDialog
             │              ├─► User selects session to open
             │              └─► User can discard any/all sessions
             │
             └─► Continue to main app
```

---

## Module State Persistence for Developers

This system enables individual modules to persist their state as part of session/snapshot serialization. Module developers can opt-in to persistence by following these patterns.

### Overview

Each module can persist two separate state objects:
- **Settings State**: State from the settings component
- **View State**: State from the view component

Both use the same pattern: define a serialized state type, create a JTD schema, implement serialize/deserialize functions, and register with the module.

### Step-by-Step Implementation

#### 1. Define Persistable Atoms

Use `persistableFixableAtom` for atoms that need validation when deserializing. This ensures data integrity when loading sessions created with different data or module versions.

**Example** ([2DViewer/settings/atoms/persistableAtoms.ts](frontend/src/modules/2DViewer/settings/atoms/persistableAtoms.ts)):

```typescript
import { persistableFixableAtom } from "@framework/utils/PersistableFixableAtom";

export const fieldIdentifierAtom = persistableFixableAtom<string | null>({
    initialValue: null,

    // Validate deserialized value against current application state
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return (
            value !== null &&
            ensembleSet.getRegularEnsembleArray().some((ens) =>
                ens.getFieldIdentifier() === value
            )
        );
    },

    // Provide fallback value if validation fails
    fixupFunction: ({ get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return ensembleSet.getRegularEnsembleArray().at(0)?.getFieldIdentifier() ?? null;
    },
});
```

**Key Concepts:**
- `initialValue`: Default value for new instances
- `isValidFunction`: Validates deserialized values against current app state (e.g., ensemble still exists)
- `fixupFunction`: Provides sensible fallback when validation fails (e.g., select first available ensemble)

#### 2. Define Serialized State Type

Create a type representing the serialized state structure. Keep it simple - only primitives, arrays, and plain objects.

**Example** ([2DViewer/settings/persistence.ts](frontend/src/modules/2DViewer/settings/persistence.ts)):

```typescript
export type SerializedSettings = {
    dataProviderData: string;
    fieldIdentifier: string | null;
    preferredViewLayout: PreferredViewLayout;
    mapExtent: {
        x: number[];
        y: number[];
    } | null;
};
```

#### 3. Create JTD Schema

Use `SchemaBuilder` to create a JSON Type Definition schema. This provides runtime validation and type safety.

**Example** ([2DViewer/settings/persistence.ts](frontend/src/modules/2DViewer/settings/persistence.ts)):

```typescript
import { SchemaBuilder } from "@framework/SchemaBuilder";

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        dataProviderData: { type: "string" },
        fieldIdentifier: { type: "string", nullable: true },
        preferredViewLayout: {
            enum: [PreferredViewLayout.VERTICAL, PreferredViewLayout.HORIZONTAL],
        },
        mapExtent: {
            properties: {
                x: { elements: { type: "float64" } },
                y: { elements: { type: "float64" } },
            },
            nullable: true,
        },
    },
}));

export const SERIALIZED_SETTINGS = schemaBuilder.build();
```

**Supported JTD Types:**
- Primitives: `string`, `float64`, `int32`, `boolean`, `timestamp`
- Arrays: `{ elements: { type: "..." } }`
- Objects: `{ properties: { ... } }`
- Enums: `{ enum: [...] }`
- Nullable: `{ type: "...", nullable: true }`

#### 4. Implement Serialize Function

Extract state from atoms using the provided `get` function.

**Example** ([2DViewer/settings/persistence.ts](frontend/src/modules/2DViewer/settings/persistence.ts)):

```typescript
import type { SerializeStateFunction } from "@framework/Module";

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const dataProviderData = get(dataProviderStateAtom);
    const fieldIdentifier = get(fieldIdentifierAtom);
    const preferredViewLayout = get(preferredViewLayoutAtom);
    const mapExtent = get(mapExtentAtom);

    return {
        dataProviderData,
        fieldIdentifier: fieldIdentifier.value, // Extract value from persistableFixableAtom
        preferredViewLayout,
        mapExtent,
    };
};
```

**Important:** For `persistableFixableAtom`, access `.value` to get the underlying value.

#### 5. Implement Deserialize Function

Restore state to atoms using the provided `set` function. Use `setIfDefined` helper to skip undefined values.

**Example** ([2DViewer/settings/persistence.ts](frontend/src/modules/2DViewer/settings/persistence.ts)):

```typescript
import type { DeserializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/SerializationUtils";

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, dataProviderStateAtom, raw.dataProviderData);
    setIfDefined(set, fieldIdentifierAtom, raw.fieldIdentifier);
    setIfDefined(set, preferredViewLayoutAtom, raw.preferredViewLayout);
    setIfDefined(set, mapExtentAtom, raw.mapExtent);
};
```

**Important:** When deserializing to `persistableFixableAtom`, the validation and fixup functions run automatically.

#### 6. Combine Settings and View State

Create a combined state definition in [persistence.ts](frontend/src/modules/2DViewer/persistence.ts):

```typescript
import {
    SERIALIZED_SETTINGS,
    serializeSettings,
    deserializeSettings,
    type SerializedSettings
} from "./settings/persistence";
import {
    SERIALIZED_VIEW,
    serializeView,
    deserializeView,
    type SerializedView
} from "./view/persistence";

export type SerializedState = {
    settings: SerializedSettings;
    view: SerializedView;
};

export const SERIALIZED_STATE = {
    settings: SERIALIZED_SETTINGS,
    view: SERIALIZED_VIEW,
};
```

#### 7. Register with Module

Register the schema and serialization functions when registering the module.

**Example** ([2DViewer/registerModule.ts](frontend/src/modules/2DViewer/registerModule.ts)):

```typescript
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SERIALIZED_STATE, type SerializedState } from "./persistence";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    defaultTitle: "2D Viewer",
    serializedStateSchema: SERIALIZED_STATE,
    // ... other options
});
```

#### 8. Register Serialization Functions in loadModule

In your module's `loadModule.tsx`, register the serialize/deserialize functions:

```typescript
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { serializeSettings, deserializeSettings } from "./settings/persistence";
import { serializeView, deserializeView } from "./view/persistence";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>(MODULE_NAME, {
    settingsFC,
    viewFC,
});

module.setSerializationFunctions({
    serializeStateFunctions: {
        settings: serializeSettings,
        view: serializeView,
    },
    deserializeStateFunctions: {
        settings: deserializeSettings,
        view: deserializeView,
    },
});
```

### Complete File Structure

```
src/modules/YourModule/
├── registerModule.ts          # Register schema
├── loadModule.tsx             # Register serialize/deserialize functions
├── persistence.ts             # Combine settings + view state
├── settings/
│   ├── atoms/
│   │   └── persistableAtoms.ts  # Define persistableFixableAtom instances
│   └── persistence.ts           # Settings serialization
└── view/
│   ├── atoms/
│   │   └── persistableAtoms.ts  # Define persistableFixableAtom instances
|   └── persistence.ts           # View serialization
```

### Best Practices

1. **Keep Serialized State Simple**: Only primitives, arrays, and plain objects. No class instances or functions.

2. **Always Use Validation**: Use `persistableFixableAtom` for any data that depends on external state (ensembles, fields, realizations, etc.). This prevents crashes when loading sessions with missing/changed data.

3. **Provide Sensible Defaults**: The `fixupFunction` should always provide a reasonable fallback value. Users should never see a broken state after loading a session.

4. **Use `setIfDefined`**: This helper skips setting atoms when the serialized value is `undefined`, preserving the atom's default value.

5. **Test Across Versions**: Verify that sessions created with older module versions can still be loaded. The validation/fixup pattern handles most cases automatically.

6. **Minimize State Size**: Only persist essential state. Derived values should be recomputed on load. Remember the 1.5MB content size limit.

7. **Document Breaking Changes**: If you change the serialized state structure, document migration requirements in your module's changelog.

### How It Works

When a session is saved:
1. Framework calls `serializeSettings()` and `serializeView()` for each module instance
2. Results are validated against the JTD schema
3. Stringified JSON is stored in the session object
4. Total content size is checked against 1.5MB limit

When a session is loaded:
1. Framework deserializes the JSON for each module instance
2. Validates against the JTD schema
3. Calls `deserializeSettings()` and `deserializeView()` with the data
4. For `persistableFixableAtom`, runs validation → fixup if needed → sets value

### Module State in Serialized Sessions

The complete session state structure includes module instances:

```typescript
{
  sessionId: "abc123",
  metadata: { title: "My Session", ... },
  content: {
    dashboardState: { ... },
    moduleInstances: [
      {
        id: "module-1",
        name: "2DViewer",
        serializedState: {
          settings: "{\"fieldIdentifier\":\"DROGON\",\"preferredViewLayout\":\"vertical\",...}",
          view: "{\"viewMode\":\"map\",\"colorScale\":{...}}"
        }
      },
      // ... more module instances
    ]
  }
}
```

Each module instance's serialized state is stored as stringified JSON and validated independently.

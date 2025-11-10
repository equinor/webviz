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
- [Identified Issues](#identified-issues)
- [Recommendations](#recommendations)

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
- **Crash Recovery**: On application start, users can recover unsaved sessions from local storage
- **Change Tracking**: Hash-based change detection using SHA-256
- **Conflict Detection**: Periodic backend polling (every 10 seconds) to detect external changes
- **Snapshot Sharing**: Immutable snapshots with visit tracking and access logs

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐      ┌──────────────────────────────────┐   │
│  │   Workbench      │      │  WorkbenchSessionPersistence     │   │
│  │                  │◄─────┤  Service                         │   │
│  │  - Session Mgmt  │      │  - Change Detection (Hash)       │   │
│  │  - Navigation    │      │  - Local Storage                 │   │
│  │  - Dialogs       │      │  - Backend Polling (10s)         │   │
│  └──────────────────┘      └──────────────────────────────────┘   │
│           │                              │                         │
│           │                              │                         │
│  ┌────────▼──────────────────────────────▼─────────────────────┐  │
│  │          PrivateWorkbenchSession                            │  │
│  │  - Serialization/Deserialization                            │  │
│  │  - State Management (AtomStoreMaster)                       │  │
│  │  - Dashboard/Module Management                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS/REST API
                                 │
┌─────────────────────────────────▼───────────────────────────────────┐
│                          Backend Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              FastAPI Router Layer                            │  │
│  │  /persistence/sessions     - CRUD operations                 │  │
│  │  /persistence/snapshots    - Create/Read/Delete              │  │
│  │  /persistence/snapshot_access_logs - Visit tracking          │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐  │
│  │              Store Layer                                     │  │
│  │  SessionStore          - Session CRUD + Validation           │  │
│  │  SnapshotStore         - Snapshot CRUD + Validation          │  │
│  │  SnapshotAccessLogStore - Visit tracking + Logging           │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐  │
│  │              CosmosDB Container Layer                        │  │
│  │  - Query/Insert/Update/Delete/Patch                          │  │
│  │  - Error Handling & Mapping                                  │  │
│  │  - Pagination Support                                        │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
│                         │                                           │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    Azure CosmosDB                                   │
│                                                                     │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   sessions     │  │   snapshots      │  │ snapshot_access  │   │
│  │   container    │  │   container      │  │ _logs container  │   │
│  │                │  │                  │  │                  │   │
│  │ PK: owner_id   │  │ PK: id           │  │ PK: visitor_id   │   │
│  └────────────────┘  └──────────────────┘  └──────────────────┘   │
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
WorkbenchSessionPersistenceService debounces (200ms)
         │
         ▼
pullFullSessionState() - Serialize & Hash
         │
         ├─► localStorage.setItem() - Save to local storage
         └─► hasChanges = (currentHash !== lastPersistedHash)
```

### 2. Saving Session to Backend

```
User clicks "Save Session"
         │
         ▼
SaveSessionDialog (Get title/description)
         │
         ▼
workbench.saveCurrentSession()
         │
         ├─► WorkbenchSessionPersistenceService.persistSessionState()
         │    │
         │    ├─► NEW Session:
         │    │    └─► POST /persistence/sessions
         │    │         └─► SessionStore.create_async()
         │    │              ├─► Generate nanoid (8 chars)
         │    │              ├─► Hash content (SHA-256)
         │    │              └─► CosmosContainer.insert_item_async()
         │    │
         │    └─► EXISTING Session:
         │         └─► PUT /persistence/sessions/{session_id}
         │              └─► SessionStore.update_async()
         │                   ├─► Verify ownership
         │                   ├─► Increment version
         │                   ├─► Update timestamp
         │                   ├─► Hash content (SHA-256)
         │                   └─► CosmosContainer.update_item_async()
         │
         └─► On success:
              ├─► Remove from local storage
              ├─► Update lastPersistedHash
              └─► Invalidate React Query cache
```

### 3. Creating a Snapshot

```
User clicks "Create Snapshot"
         │
         ▼
CreateSnapshotDialog (Get title/description)
         │
         ▼
workbench.makeSnapshot()
         │
         ▼
WorkbenchSessionPersistenceService.makeSnapshot()
         │
         ├─► Serialize current session content
         ├─► POST /persistence/snapshots
         │    └─► SnapshotStore.create_async()
         │         ├─► Generate nanoid (8 chars)
         │         ├─► Hash content (SHA-256)
         │         └─► CosmosContainer.insert_item_async()
         │
         └─► SnapshotAccessLogStore.log_snapshot_visit_async()
              ├─► Create initial access log (implicit visit)
              ├─► Set visit count = 1
              └─► Record first_visited_at & last_visited_at
```

### 4. Loading a Session from Backend

```
URL contains ?session={sessionId}
         │
         ▼
Workbench.initialize() or handleNavigation()
         │
         ▼
openSession(sessionId)
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
         └─► Check for local storage recovery
              └─► Show ActiveSessionRecoveryDialog if found
```

### 5. Loading a Snapshot

```
URL contains ?snapshot={snapshotId}
         │
         ▼
Workbench.initialize() or handleNavigation()
         │
         ▼
openSnapshot(snapshotId)
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

### 6. Session Recovery Flow

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

### 7. Change Detection & Auto-Save

```
User makes changes to dashboard/modules/settings
         │
         ▼
Module/Dashboard/Settings fires SERIALIZED_STATE event
         │
         ▼
WorkbenchSessionPersistenceService.schedulePullFullSessionState()
         │
         ├─► Clear existing timeout
         └─► Set new timeout (200ms debounce)
         │
         ▼
pullFullSessionState()
         │
         ├─► makeWorkbenchSessionStateString() - Serialize
         ├─► hashSessionContentString() - SHA-256
         ├─► Compare newHash with oldHash
         │
         └─► IF different:
              ├─► Update currentHash & currentStateString
              ├─► Update lastModifiedMs
              ├─► Save to localStorage
              └─► Notify subscribers (hasChanges = true)
```

### 8. Backend Conflict Detection

```
Every 10 seconds (BACKEND_SESSION_FETCH_INTERVAL_MS)
         │
         ▼
repeatedlyFetchSessionFromBackend()
         │
         ├─► GET /persistence/sessions/metadata/{session_id}
         ├─► Extract updatedAt timestamp
         └─► Store in backendLastUpdatedMs
         │
         ▼
UI components subscribe to PERSISTENCE_INFO
         │
         └─► Can display warning if:
              backendLastUpdatedMs > lastPersistedMs
              (Indicates external changes)
```

---

## Frontend Components

### Core Services

#### WorkbenchSessionPersistenceService
[frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts](frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts)

**Responsibilities:**
- Change detection via SHA-256 hashing
- Auto-save to local storage (200ms debounce)
- Backend session persistence (create/update)
- Snapshot creation
- Conflict detection via backend polling (10s interval)
- Publish persistence info (hasChanges, lastModifiedMs, etc.)

**Key Methods:**
- `pullFullSessionState()` - Serialize, hash, and save to local storage
- `persistSessionState()` - Save session to backend
- `makeSnapshot()` - Create immutable snapshot
- `repeatedlyFetchSessionFromBackend()` - Check for external updates

#### PrivateWorkbenchSession
[frontend/src/framework/internal/WorkbenchSession/PrivateWorkbenchSession.ts](frontend/src/framework/internal/WorkbenchSession/PrivateWorkbenchSession.ts)

**Responsibilities:**
- State management (dashboards, modules, settings, ensembles)
- Serialization/deserialization of workbench state
- AtomStoreMaster integration for reactive state
- Metadata management (title, description, timestamps)
- Read-only snapshot mode enforcement

**Key Methods:**
- `serializeContentState()` - Convert state to JSON-serializable object
- `deserializeContentState()` - Restore state from serialized data
- `fromDataContainer()` - Factory method for creating sessions
- `loadAndSetupEnsembleSet()` - Load ensemble metadata from backend

### Dialogs

#### CreateSnapshotDialog
[frontend/src/framework/internal/components/CreateSnapshotDialog/createSnapshotDialog.tsx](frontend/src/framework/internal/components/CreateSnapshotDialog/createSnapshotDialog.tsx)

Creates immutable snapshots with title and description. Displays shareable URL on success.

#### SaveSessionDialog
[frontend/src/framework/internal/components/SaveSessionDialog/saveSessionDialog.tsx](frontend/src/framework/internal/components/SaveSessionDialog/saveSessionDialog.tsx)

Prompts for title/description when saving a session for the first time.

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

- `createSessionWithCacheUpdate()` - Create session & invalidate React Query cache
- `updateSessionAndCache()` - Update session & invalidate cache
- `createSnapshotWithCacheUpdate()` - Create snapshot & invalidate cache
- `removeSessionQueryData()` - Remove deleted session from cache
- `removeSnapshotQueryData()` - Remove deleted snapshot from cache

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

**Security:**
- Partition key: `owner_id` (ensures data isolation)
- Ownership checks on all read/update/delete operations

#### SnapshotStore
[backend_py/primary/primary/persistence/snapshot_store/snapshot_store.py](backend_py/primary/primary/persistence/snapshot_store/snapshot_store.py)

**Responsibilities:**
- Snapshot creation and deletion
- Public read access (no ownership check on GET)
- Query support for owned snapshots

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
         │ User clicks "Update"
         │
         ▼
┌─────────────────┐
│ Backend Session │
│  (Updated)      │
│  version++      │
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

## Identified Issues

### Critical Issues

#### 1. Race Condition in Session Update Flow
**Location:** [WorkbenchSessionPersistenceService.ts:334-336](frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts#L334-L336)

**Issue:** There's a potential race condition between `pullFullSessionState()` and the actual save operation. If the user makes changes during the save operation, those changes might be lost.

```typescript
// Make sure we pull the latest session before we save
this.maybeClearPullDebounceTimeout();
await this.pullFullSessionState();
```

**Impact:** Medium - Users might lose recent changes if they continue editing while save is in progress.

**Recommendation:** Add a lock/semaphore to prevent changes during save, or queue the save operation.

#### 2. Inconsistent Error Handling in Snapshot Deletion
**Location:** [router.py:414-419](backend_py/primary/primary/routers/persistence/router.py#L414-L419)

**Issue:** The background task for marking logs as deleted has no error recovery mechanism. If the task fails completely (not individual patches), access logs will remain in inconsistent state.

```python
# This is the fastest solution for the moment. As we are expecting <= 150 logs per snapshot
# and consistency is not critical, we can afford to do this in the background and without
# a safety net. We can later consider adding this to a queue for better reliability.
background_tasks.add_task(mark_logs_deleted_task, snapshot_id=snapshot_id)
```

**Impact:** Low-Medium - Access logs might show deleted snapshots indefinitely.

**Recommendation:** Add retry logic or use a proper task queue (Celery, Azure Functions, etc.).

#### 3. No Pagination Limit Enforcement
**Location:** Multiple backend stores

**Issue:** While there's a page_size parameter with validation (`ge=1, le=100`), the query itself doesn't enforce a maximum limit when page_size is None.

**Impact:** Medium - Large queries could cause performance issues or DoS.

**Recommendation:** Set a default and maximum page size in the store layer.

### Architectural Issues

#### 4. Tight Coupling Between Workbench and Persistence Service
**Location:** [Workbench.ts](frontend/src/framework/Workbench.ts), [WorkbenchSessionPersistenceService.ts](frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts)

**Issue:** The `WorkbenchSessionPersistenceService` holds a reference to the entire `Workbench` instance, creating bidirectional dependency.

```typescript
constructor(workbench: Workbench) {
    this._workbench = workbench;
}
```

**Impact:** Low-Medium - Makes testing harder, increases coupling.

**Recommendation:** Use dependency injection or pass only required methods (e.g., `getQueryClient()`).

#### 5. Implicit Visit Logging on Snapshot Creation
**Location:** [router.py:384-387](backend_py/primary/primary/routers/persistence/router.py#L384-L387)

**Issue:** Creating a snapshot automatically logs a visit. This is a side effect that's not obvious from the API endpoint name.

```python
# We count snapshot creation as implicit visit. This also makes it so we can get recently created ones alongside other shared screenshots
await log_store.log_snapshot_visit_async(
    snapshot_id=snapshot_id, snapshot_owner_id=authenticated_user.get_user_id()
)
```

**Impact:** Low - Could be confusing for API consumers.

**Recommendation:** Document this behavior prominently in OpenAPI docs, or make it explicit with a separate endpoint call.

#### 6. Duplicate State in WorkbenchSessionPersistenceService
**Location:** [WorkbenchSessionPersistenceService.ts:52-65](frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts#L52-L65)

**Issue:** Several fields are duplicated:
```typescript
private _persistenceInfo: WorkbenchSessionPersistenceInfo = {
    lastModifiedMs: 0,
    hasChanges: false,
    lastPersistedMs: null,
    backendLastUpdatedMs: null,
};
// ...
private _lastPersistedMs: number | null = null;
private _lastModifiedMs: number = 0;
private _backendLastUpdatedMs: number | null = null;
```

**Impact:** Low - Maintenance burden, potential for inconsistency.

**Recommendation:** Use only `_persistenceInfo` and remove duplicate fields.

### Code Quality Issues

#### 7. Magic Numbers Without Constants
**Location:** Multiple files

**Issue:** Several magic numbers appear without named constants:
- 200ms debounce in `schedulePullFullSessionState()`
- 10000ms (10 seconds) polling interval
- 8 character nanoid length
- 30 character title limit
- 250 character description limit

**Recommendation:** Define these as named constants at the top of files or in a shared config.

#### 8. Incomplete Type Annotations
**Location:** [crudHelpers.ts](frontend/src/framework/internal/WorkbenchSession/utils/crudHelpers.ts)

**Issue:** Some functions use `any` type or have incomplete error handling types.

```typescript
const snapshotGetter = (): any => {
```

**Recommendation:** Use proper TypeScript types throughout.

#### 9. Console.error Instead of Proper Error Handling
**Location:** Multiple frontend components

**Issue:** Many places use `console.error()` without proper error reporting or user notification.

```typescript
} catch (error) {
    console.error("Failed to save session:", error);
}
```

**Recommendation:** Implement centralized error handling/reporting service.

#### 10. Missing Validation for Content Size
**Location:** Backend session/snapshot stores

**Issue:** No validation on content size. Large sessions could cause issues with CosmosDB document size limits (2MB for non-partitioned, 4MB for partitioned).

**Recommendation:** Add content size validation before persisting.

### Flow/UX Issues

#### 11. Confusing Recovery Dialog Behavior
**Location:** [Workbench.ts:219-223](frontend/src/framework/Workbench.ts#L219-L223)

**Issue:** When opening a session from URL that has a local storage backup, both the backend session AND the recovery dialog are shown simultaneously. This could be confusing.

```typescript
if (storedSessions.find((el) => el.id === sessionId)) {
    this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, true);
}
```

**Recommendation:** Show recovery dialog BEFORE loading from backend, or provide clearer UI state.

#### 12. No Optimistic Updates
**Location:** Session/Snapshot CRUD operations

**Issue:** All operations wait for backend response before updating UI, causing perceived slowness.

**Recommendation:** Implement optimistic updates in React Query mutations.

#### 13. Polling Every 10 Seconds Always Active
**Location:** [WorkbenchSessionPersistenceService.ts:98-100](frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts#L98-L100)

**Issue:** Backend polling continues even when user is not actively using the app or when the window is not focused.

```typescript
this._fetchingInterval = setInterval(() => {
    this.repeatedlyFetchSessionFromBackend();
}, BACKEND_SESSION_FETCH_INTERVAL_MS);
```

**Recommendation:** Pause polling when window loses focus using Page Visibility API.

#### 14. No Visual Feedback for Auto-Save Status
**Location:** UI Components

**Issue:** Users have no way to see when auto-save to localStorage happens. Only backend persistence shows a toast.

**Recommendation:** Add subtle UI indicator (e.g., "Saved to local storage" or icon).

### Security/Privacy Issues

#### 15. Snapshot IDs Are Guessable
**Location:** [snapshot_store.py:66](backend_py/primary/primary/persistence/snapshot_store/snapshot_store.py#L66)

**Issue:** Using 8-character nanoid (~16 million combinations) for publicly accessible snapshots could be vulnerable to enumeration attacks.

```python
snapshot_id = generate(size=8)
```

**Impact:** Medium - Someone could potentially enumerate and discover snapshots they shouldn't see.

**Recommendation:** Increase to at least 12-16 characters, or implement rate limiting on snapshot access.

#### 16. No Rate Limiting on Visit Logging
**Location:** [snapshot_access_log_store.py:184-221](backend_py/primary/primary/persistence/snapshot_store/snapshot_access_log_store.py#L184-L221)

**Issue:** No rate limiting on visit logging. A malicious user could spam visit logs.

**Recommendation:** Implement rate limiting or deduplicate visits within a time window.

#### 17. Sensitive Data in Local Storage
**Location:** Local storage persistence

**Issue:** Complete session state is stored in localStorage without encryption. This includes all user data, module state, etc.

**Recommendation:** Consider encrypting localStorage data or warning users about browser privacy.

### Performance Issues

#### 18. Hash Computation on Every Change
**Location:** [WorkbenchSessionPersistenceService.ts:296](frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts#L296)

**Issue:** SHA-256 hash is computed on every change, even for large sessions. This is CPU-intensive.

```typescript
const newHash = await hashSessionContentString(newStateString);
```

**Recommendation:** Consider cheaper change detection (e.g., deep equality check, version counter) or hash only parts of the state.

#### 19. Full Session Serialization on Every Change
**Location:** [WorkbenchSessionPersistenceService.ts:295](frontend/src/framework/internal/WorkbenchSessionPersistenceService.ts#L295)

**Issue:** The entire session is serialized to JSON on every change, which could be expensive for large dashboards.

```typescript
const newStateString = makeWorkbenchSessionStateString(this._workbenchSession);
```

**Recommendation:** Implement partial serialization or dirty tracking.

#### 20. No Lazy Loading for Session Lists
**Location:** [PersistenceManagementDialog](frontend/src/framework/internal/components/PersistenceManagementDialog/persistenceManagementDialog.tsx)

**Issue:** Session/snapshot lists might load all data at once instead of using infinite scroll/virtual scrolling for large lists.

**Recommendation:** Implement virtual scrolling for large lists using react-window or similar.

### Testing Gaps

#### 21. No Unit Tests Visible
**Location:** Repository-wide

**Issue:** No visible test files for the persistence feature.

**Recommendation:** Add comprehensive unit and integration tests for:
- Serialization/deserialization
- Hash computation
- CRUD operations
- Recovery flows
- Error scenarios

---

## Recommendations

### High Priority

1. **Fix Race Condition in Save Flow**
   - Add proper locking mechanism
   - Queue save operations
   - Prevent user edits during save

2. **Increase Snapshot ID Length**
   - Change from 8 to 12-16 characters
   - Add rate limiting on snapshot access
   - Consider adding access tokens for sensitive snapshots

3. **Add Content Size Validation**
   - Implement max content size check (1.5MB recommended)
   - Provide user feedback before save fails
   - Consider compression for large sessions

4. **Implement Proper Error Handling**
   - Create centralized error service
   - Add error boundaries in React components
   - Log errors to monitoring service (Sentry, etc.)

### Medium Priority

5. **Improve Recovery Flow UX**
   - Show recovery dialog before loading from backend
   - Provide visual diff between localStorage and backend versions
   - Add "merge" option for advanced users

6. **Optimize Performance**
   - Implement partial serialization
   - Use cheaper change detection method
   - Add virtual scrolling for lists
   - Pause polling when window is inactive

7. **Reduce Coupling**
   - Refactor WorkbenchSessionPersistenceService to reduce dependencies
   - Use dependency injection
   - Create clear interfaces

8. **Add Visual Feedback**
   - Show auto-save indicator
   - Display sync status in UI
   - Add progress indicators for long operations

### Low Priority

9. **Improve Code Quality**
   - Replace magic numbers with constants
   - Add comprehensive TypeScript types
   - Remove duplicate state
   - Add JSDoc comments

10. **Add Tests**
    - Unit tests for serialization
    - Integration tests for API endpoints
    - E2E tests for recovery flows
    - Performance tests for large sessions

11. **Documentation**
    - Add inline code comments
    - Create API documentation
    - Add architecture decision records (ADRs)
    - Create user guide

12. **Security Enhancements**
    - Encrypt localStorage data
    - Add rate limiting
    - Implement audit logging
    - Add RBAC for shared sessions (future feature)

---

## Additional Observations

### Strengths

1. **Well-Structured Layering**: Clear separation between UI, services, and data access layers.
2. **Schema Validation**: Using AJV for runtime validation prevents corrupted data.
3. **Flexible Querying**: FilterFactory and QueryCollationOptions provide powerful query capabilities.
4. **User Experience**: Recovery dialogs provide excellent crash recovery UX.
5. **Immutable Snapshots**: Clear distinction between mutable sessions and immutable snapshots.
6. **Visit Tracking**: Access logs provide valuable insights for shared content.

### Potential Future Enhancements

1. **Real-time Collaboration**: Extend to multi-user editing with operational transformation or CRDTs.
2. **Version History**: Track and allow reverting to previous session versions.
3. **Partial Updates**: Support updating specific parts of a session without sending entire content.
4. **Export/Import**: Allow users to export sessions as files for backup/sharing.
5. **Session Templates**: Create reusable session templates.
6. **Snapshot Permissions**: Add optional access control for snapshots.
7. **Offline Support**: Implement proper offline-first architecture with sync.
8. **Compression**: Compress large session content before storage.

---

## Conclusion

The persistence feature is well-architected with clear separation of concerns and comprehensive functionality. The main areas for improvement are:

1. Race condition handling in concurrent operations
2. Security hardening (ID length, rate limiting)
3. Performance optimization (hashing, serialization)
4. Error handling and user feedback
5. Code quality (constants, types, tests)

With the recommended improvements, this feature would be production-ready for enterprise use.

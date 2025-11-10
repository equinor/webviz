# Persistence Feature - Flow Diagrams

This document contains detailed flow diagrams for the persistence feature using Mermaid syntax.

## Table of Contents
1. [Complete Architecture Overview](#complete-architecture-overview)
2. [Session Save Flow](#session-save-flow)
3. [Snapshot Creation Flow](#snapshot-creation-flow)
4. [Session Recovery Flow](#session-recovery-flow)
5. [Change Detection & Auto-Save](#change-detection--auto-save)
6. [Backend Conflict Detection](#backend-conflict-detection)

---

## Complete Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[UI Components<br/>Dialogs & Management]
        WB[Workbench<br/>Session Orchestration]
        PS[WorkbenchSessionPersistenceService<br/>Auto-save & Change Detection]
        PWS[PrivateWorkbenchSession<br/>State Management]
        LS[Local Storage<br/>Recovery Buffer]

        UI -->|User Actions| WB
        WB -->|Manage| PS
        WB -->|Controls| PWS
        PS -->|Serialize & Hash| PWS
        PS -->|Auto-save| LS
        PWS -->|State Changes| PS
    end

    subgraph "API Layer"
        API[REST API<br/>FastAPI Router]
    end

    subgraph "Backend Services"
        SessionStore[SessionStore<br/>Session CRUD]
        SnapshotStore[SnapshotStore<br/>Snapshot CRUD]
        LogStore[SnapshotAccessLogStore<br/>Visit Tracking]
        CosmosContainer[CosmosContainer<br/>Generic DB Layer]

        SessionStore --> CosmosContainer
        SnapshotStore --> CosmosContainer
        LogStore --> CosmosContainer
    end

    subgraph "Database"
        DB[(Azure CosmosDB)]

        Sessions[sessions container<br/>PK: owner_id]
        Snapshots[snapshots container<br/>PK: id]
        Logs[snapshot_access_logs<br/>PK: visitor_id]

        DB --> Sessions
        DB --> Snapshots
        DB --> Logs
    end

    WB -->|HTTP Requests| API
    API -->|Route to| SessionStore
    API -->|Route to| SnapshotStore
    API -->|Route to| LogStore

    CosmosContainer -->|Read/Write| DB

    style WB fill:#e1f5ff
    style PS fill:#e1f5ff
    style PWS fill:#e1f5ff
    style LS fill:#fff3cd
    style DB fill:#d4edda
```

---

## Session Save Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as SaveSessionDialog
    participant WB as Workbench
    participant PS as PersistenceService
    participant PWS as WorkbenchSession
    participant API as Backend API
    participant Store as SessionStore
    participant DB as CosmosDB
    participant Cache as React Query Cache
    participant LS as Local Storage

    User->>UI: Click "Save Session"
    UI->>UI: Prompt for title/description
    User->>UI: Enter metadata

    UI->>WB: workbench.saveCurrentSession()
    WB->>PS: persistSessionState()

    PS->>PS: maybeClearPullDebounceTimeout()
    PS->>PS: pullFullSessionState()

    PS->>PWS: serializeContentState()
    PWS-->>PS: serialized content

    PS->>PS: hash content (SHA-256)

    alt Session is NEW (not persisted)
        PS->>API: POST /persistence/sessions
        API->>Store: create_async(title, desc, content)
        Store->>Store: Generate nanoid (8 chars)
        Store->>Store: Hash content
        Store->>Store: Set timestamps
        Store->>DB: Insert document
        DB-->>Store: success
        Store-->>API: session_id
        API-->>PS: session_id

        PS->>PWS: setId(session_id)
        PS->>PWS: setIsPersisted(true)
        PS->>LS: Remove from localStorage
        PS->>PS: Update lastPersistedHash
        PS->>Cache: Invalidate sessions query

    else Session EXISTS (already persisted)
        PS->>API: PUT /persistence/sessions/{id}
        API->>Store: update_async(id, title, desc, content)
        Store->>DB: Get existing session
        DB-->>Store: current session
        Store->>Store: Verify ownership
        Store->>Store: Increment version
        Store->>Store: Update timestamp
        Store->>Store: Rehash content
        Store->>DB: Replace document
        DB-->>Store: success
        Store-->>API: updated session
        API-->>PS: updated session

        PS->>LS: Remove from localStorage
        PS->>PS: Update lastPersistedHash
        PS->>Cache: Invalidate sessions query
    end

    PS-->>WB: success
    WB->>UI: Show success toast
    UI-->>User: "Session saved successfully"
```

---

## Snapshot Creation Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as CreateSnapshotDialog
    participant WB as Workbench
    participant PS as PersistenceService
    participant PWS as WorkbenchSession
    participant API as Backend API
    participant SnapshotStore
    participant LogStore as SnapshotAccessLogStore
    participant DB as CosmosDB
    participant Cache as React Query Cache

    User->>UI: Click "Create Snapshot"
    UI->>UI: Prompt for title/description
    User->>UI: Enter metadata

    UI->>WB: workbench.makeSnapshot(title, desc)
    WB->>PS: makeSnapshot(title, desc)

    PS->>PS: pullFullSessionState({immediate: true})
    Note over PS: Ensure latest state

    PS->>PWS: serializeContentState()
    PWS-->>PS: content object
    PS->>PS: objectToJsonString(content)

    PS->>API: POST /persistence/snapshots

    API->>SnapshotStore: create_async(title, desc, content)
    SnapshotStore->>SnapshotStore: Generate nanoid (8 chars)
    SnapshotStore->>SnapshotStore: Hash content
    SnapshotStore->>SnapshotStore: Set created_at timestamp
    SnapshotStore->>DB: Insert snapshot document
    DB-->>SnapshotStore: success
    SnapshotStore-->>API: snapshot_id

    Note over API,LogStore: Implicit visit logging
    API->>LogStore: log_snapshot_visit_async(snapshot_id, owner_id)

    LogStore->>LogStore: _get_existing_or_new_async()
    LogStore->>DB: Check if log exists
    DB-->>LogStore: Not found

    LogStore->>SnapshotStore: get_async(snapshot_id)
    SnapshotStore->>DB: Get snapshot metadata
    DB-->>SnapshotStore: snapshot document
    SnapshotStore-->>LogStore: snapshot metadata

    LogStore->>LogStore: Create SnapshotAccessLogDocument
    LogStore->>LogStore: Set visits = 1
    LogStore->>LogStore: Set first_visited_at = now
    LogStore->>LogStore: Set last_visited_at = now
    LogStore->>DB: Insert access log
    DB-->>LogStore: success

    LogStore-->>API: access log
    API-->>PS: snapshot_id

    PS->>Cache: Invalidate snapshots query
    PS-->>WB: snapshot_id

    WB->>UI: buildSnapshotUrl(snapshot_id)
    UI->>UI: Display shareable URL
    UI-->>User: "Snapshot created! Share this URL"
```

---

## Session Recovery Flow

```mermaid
flowchart TD
    Start([Application Starts]) --> Init[Workbench.initialize]

    Init --> CheckLS{Check Local Storage}

    CheckLS -->|No sessions found| CheckURL1{Check URL}
    CheckLS -->|Sessions found| StoreFound[Store sessions list]

    CheckURL1 -->|Has session ID| LoadBackend1[Load session from backend]
    CheckURL1 -->|Has snapshot ID| LoadSnapshot1[Load snapshot from backend]
    CheckURL1 -->|No ID| NormalStart[Normal startup<br/>Show start page]

    StoreFound --> CheckURL2{Check URL}

    CheckURL2 -->|Has session ID| LoadBackend2[Load session from backend]
    CheckURL2 -->|Has snapshot ID| LoadSnapshot2[Load snapshot from backend]
    CheckURL2 -->|No ID| MultiDialog[Show MultiSessionsRecoveryDialog]

    LoadBackend2 --> CheckMatch{Matching session<br/>in localStorage?}

    CheckMatch -->|Yes| ActiveDialog[Show ActiveSessionRecoveryDialog]
    CheckMatch -->|No| Loaded1[Session loaded]

    ActiveDialog --> UserChoice1{User chooses}

    UserChoice1 -->|Recover| LoadFromLS1[Load from localStorage]
    UserChoice1 -->|Discard| DeleteLS1[Delete from localStorage]

    LoadFromLS1 --> Loaded2[Session loaded<br/>with local changes]
    DeleteLS1 --> Loaded1

    MultiDialog --> ShowTable[Display all sessions<br/>in table]

    ShowTable --> UserChoice2{User chooses}

    UserChoice2 -->|Open session| OpenSelected[Load selected session<br/>from localStorage]
    UserChoice2 -->|Discard session| DiscardOne[Delete specific session<br/>from localStorage]
    UserChoice2 -->|Cancel| NormalStart

    OpenSelected --> Loaded3[Session loaded<br/>from localStorage]
    DiscardOne --> ShowTable

    LoadBackend1 --> Loaded1
    LoadSnapshot1 --> Loaded4[Snapshot loaded<br/>read-only mode]
    LoadSnapshot2 --> Loaded4

    Loaded1 --> End([Application Ready])
    Loaded2 --> End
    Loaded3 --> End
    Loaded4 --> End
    NormalStart --> End

    style Start fill:#e1f5ff
    style End fill:#d4edda
    style ActiveDialog fill:#fff3cd
    style MultiDialog fill:#fff3cd
    style LoadFromLS1 fill:#ffc107
    style OpenSelected fill:#ffc107
```

---

## Change Detection & Auto-Save

```mermaid
sequenceDiagram
    actor User
    participant Module as Module/Dashboard
    participant PWS as WorkbenchSession
    participant PS as PersistenceService
    participant LS as Local Storage
    participant Subscribers as UI Components

    User->>Module: Make changes
    Note over User,Module: E.g., add visualization,<br/>change settings, etc.

    Module->>PWS: Update state
    PWS->>PWS: _publishSubscribeDelegate.notifySubscribers<br/>(SERIALIZED_STATE)

    PWS-->>PS: State change event

    PS->>PS: schedulePullFullSessionState(200ms)
    Note over PS: Debounce: Clear existing timeout

    Note over PS: Wait 200ms...

    PS->>PS: pullFullSessionState()

    alt Pull already in progress
        PS->>PS: Skip (avoid concurrent pulls)
    else Pull not in progress
        PS->>PS: Set _pullInProgress = true
        PS->>PS: Increment _pullCounter

        PS->>PWS: makeWorkbenchSessionStateString()
        PWS->>PWS: serializeContentState()
        PWS-->>PS: JSON string

        PS->>PS: hashSessionContentString(newStateString)
        Note over PS: Compute SHA-256 hash
        PS-->>PS: newHash

        alt newHash !== oldHash
            PS->>PS: _currentStateString = newStateString
            PS->>PS: _currentHash = newHash
            PS->>PS: _lastModifiedMs = Date.now()

            PS->>PWS: updateMetadata({lastModifiedMs}, false)
            Note over PWS: Update without notification

            PS->>LS: localStorage.setItem(key, serializedSession)
            Note over LS: Auto-save complete

            PS->>PS: updatePersistenceInfo()
            PS->>PS: hasChanges = (currentHash !== lastPersistedHash)

            PS->>Subscribers: Notify PERSISTENCE_INFO
            Subscribers->>Subscribers: Update UI<br/>(show "unsaved changes")

        else newHash === oldHash
            PS->>PS: No changes detected, skip save
        end

        PS->>PS: Set _pullInProgress = false
    end
```

---

## Backend Conflict Detection

```mermaid
sequenceDiagram
    participant Timer as setInterval<br/>(10 seconds)
    participant PS as PersistenceService
    participant API as Backend API
    participant Store as SessionStore
    participant DB as CosmosDB
    participant Subscribers as UI Components

    Note over Timer: Every 10 seconds

    Timer->>PS: repeatedlyFetchSessionFromBackend()

    PS->>PS: Check if session exists & is persisted

    alt No session or not persisted
        PS->>PS: Skip polling
    else Session is persisted
        PS->>API: GET /persistence/sessions/metadata/{session_id}

        API->>Store: get_async(session_id)
        Store->>Store: Verify ownership
        Store->>DB: Read session document
        DB-->>Store: session document
        Store-->>API: session
        API-->>PS: session.metadata

        PS->>PS: Extract updatedAt timestamp
        PS->>PS: _backendLastUpdatedMs = new Date(updatedAt).getTime()

        PS->>PS: updatePersistenceInfo()
        PS->>Subscribers: Notify PERSISTENCE_INFO

        Subscribers->>Subscribers: Compare timestamps

        alt backendLastUpdatedMs > lastPersistedMs
            Subscribers->>Subscribers: Show warning:<br/>"External changes detected"
            Note over Subscribers: User can choose to reload<br/>or continue working
        else backendLastUpdatedMs <= lastPersistedMs
            Subscribers->>Subscribers: No conflict, continue
        end
    end

    Note over Timer: Wait 10 seconds...
    Timer->>PS: repeatedlyFetchSessionFromBackend()
    Note over Timer,PS: Loop continues...
```

---

## Snapshot Sharing & Visit Tracking

```mermaid
sequenceDiagram
    actor OwnerUser as User A (Owner)
    actor VisitorUser as User B (Visitor)
    participant UI as Frontend
    participant API as Backend API
    participant SnapshotStore
    participant LogStore as SnapshotAccessLogStore
    participant DB as CosmosDB

    Note over OwnerUser,DB: Snapshot Creation (covered in detail above)

    OwnerUser->>OwnerUser: Create snapshot
    Note over OwnerUser: snapshot_id: "abc12345"

    OwnerUser->>VisitorUser: Share URL<br/>https://app.webviz.com?snapshot=abc12345

    VisitorUser->>UI: Open URL
    UI->>UI: readSnapshotIdFromUrl()
    UI->>API: GET /persistence/snapshots/abc12345

    Note over API,LogStore: Fetch snapshot & log visit

    par Fetch Snapshot
        API->>SnapshotStore: get_async("abc12345")
        SnapshotStore->>DB: Read snapshot<br/>(No ownership check!)
        DB-->>SnapshotStore: snapshot document
        SnapshotStore-->>API: snapshot
    and Log Visit
        API->>LogStore: log_snapshot_visit_async("abc12345", owner_id)

        LogStore->>LogStore: _get_existing_or_new_async()
        LogStore->>DB: Get access log<br/>ID: abc12345__user_b_id<br/>PK: user_b_id

        alt First visit by User B
            DB-->>LogStore: Not found

            LogStore->>SnapshotStore: get_async("abc12345")
            SnapshotStore->>DB: Read snapshot metadata
            DB-->>SnapshotStore: metadata
            SnapshotStore-->>LogStore: metadata

            LogStore->>LogStore: Create new log document
            LogStore->>LogStore: visits = 1
            LogStore->>LogStore: first_visited_at = now
            LogStore->>LogStore: last_visited_at = now
            LogStore->>DB: Insert log document
            DB-->>LogStore: success

        else User B visited before
            DB-->>LogStore: existing log document

            LogStore->>LogStore: Increment visits
            LogStore->>LogStore: Update last_visited_at = now
            LogStore->>DB: Update log document
            DB-->>LogStore: success
        end

        LogStore-->>API: updated log
    end

    API-->>UI: snapshot content
    UI->>UI: Deserialize & load
    UI->>UI: Mark as read-only (isSnapshot = true)
    UI-->>VisitorUser: Display workbench in read-only mode

    Note over VisitorUser,UI: User B can view but cannot edit

    Note over OwnerUser,DB: User A can later view access logs

    OwnerUser->>UI: Open "Snapshots" dialog
    UI->>API: GET /persistence/snapshot_access_logs
    API->>LogStore: get_many_for_user_async(user_a_id)
    LogStore->>DB: Query logs<br/>WHERE visitor_id = user_a_id
    DB-->>LogStore: list of logs
    LogStore-->>API: logs with visit counts
    API-->>UI: logs
    UI-->>OwnerUser: Display:<br/>- Snapshot "abc12345"<br/>- Visits: 2<br/>- Last visited: 5 mins ago
```

---

## Error Handling & Recovery Patterns

```mermaid
flowchart TD
    Start([Operation Starts]) --> Try{Try Operation}

    Try -->|Success| Success[Operation Successful]
    Try -->|Error| ErrorType{Error Type}

    ErrorType -->|Network/Timeout| NetworkError[Show retry dialog]
    ErrorType -->|Validation Error| ValidationError[Show error details to user]
    ErrorType -->|Auth Error| AuthError[Redirect to login]
    ErrorType -->|Not Found| NotFoundError[Show 'Resource not found' dialog]
    ErrorType -->|Conflict| ConflictError[Show merge/reload options]
    ErrorType -->|Unknown| UnknownError[Log to console<br/>Show generic error]

    NetworkError --> UserRetry{User chooses}
    UserRetry -->|Retry| Try
    UserRetry -->|Cancel| End

    ValidationError --> UserFix{User fixes input?}
    UserFix -->|Yes| Try
    UserFix -->|No| End

    AuthError --> Login[Re-authenticate]
    Login --> Try

    NotFoundError --> UserAck[User acknowledges]
    UserAck --> End

    ConflictError --> UserResolve{User chooses}
    UserResolve -->|Reload| Reload[Fetch latest from backend]
    UserResolve -->|Keep local| KeepLocal[Continue with local state]
    UserResolve -->|Merge| ManualMerge[Manual merge required]

    Reload --> Success
    KeepLocal --> Success
    ManualMerge --> End

    UnknownError --> End

    Success --> End([Operation Complete])

    style Success fill:#d4edda
    style End fill:#e1f5ff
    style NetworkError fill:#fff3cd
    style ConflictError fill:#fff3cd
    style UnknownError fill:#f8d7da
```

---

## State Machine: Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Empty: App starts

    Empty --> LocalRecovery: localStorage found
    Empty --> BackendLoading: URL has session ID
    Empty --> NewSession: User creates new session

    LocalRecovery --> Loaded: User recovers session
    LocalRecovery --> BackendLoading: User discards & loads from URL
    LocalRecovery --> Empty: User discards all

    BackendLoading --> Loaded: Successfully loaded
    BackendLoading --> Error: Load failed

    Error --> BackendLoading: User retries
    Error --> Empty: User cancels

    NewSession --> Dirty: User makes changes

    Loaded --> Dirty: User makes changes
    Loaded --> [*]: User closes/navigates away

    Dirty --> LocalSaved: Auto-save (200ms debounce)
    Dirty --> BackendSaving: User clicks "Save"

    LocalSaved --> Dirty: More changes
    LocalSaved --> BackendSaving: User clicks "Save"
    LocalSaved --> SnapshotCreating: User creates snapshot

    BackendSaving --> Clean: Save successful
    BackendSaving --> Dirty: Save failed

    Clean --> Dirty: User makes changes
    Clean --> Polling: Backend polling active
    Clean --> [*]: User closes/navigates away

    Polling --> ConflictDetected: External change detected
    Polling --> Clean: No conflicts

    ConflictDetected --> Dirty: User continues editing
    ConflictDetected --> BackendLoading: User reloads

    SnapshotCreating --> LocalSaved: Snapshot created
    SnapshotCreating --> Dirty: Snapshot creation failed

    state Dirty {
        [*] --> UnsavedChanges
        UnsavedChanges --> HasChanges: hasChanges = true
    }

    state Clean {
        [*] --> NoChanges
        NoChanges --> Persisted: isPersisted = true
    }
```

---

## Data Model Relationships

```mermaid
erDiagram
    USER ||--o{ SESSION : owns
    USER ||--o{ SNAPSHOT : owns
    USER ||--o{ ACCESS_LOG : visits
    SNAPSHOT ||--o{ ACCESS_LOG : tracked_by

    USER {
        string id PK
        string email
        string name
    }

    SESSION {
        string id PK
        string owner_id FK
        SessionMetadata metadata
        string content
        datetime created_at
        datetime updated_at
        int version
        string content_hash
    }

    SNAPSHOT {
        string id PK
        string owner_id FK
        SnapshotMetadata metadata
        string content
        datetime created_at
        string content_hash
    }

    ACCESS_LOG {
        string id PK "snapshot_id__visitor_id"
        string visitor_id FK
        string snapshot_id FK
        string snapshot_owner_id
        SnapshotMetadata snapshot_metadata
        int visits
        datetime first_visited_at
        datetime last_visited_at
        boolean snapshot_deleted
        datetime snapshot_deleted_at
    }

    SESSION_METADATA {
        string title
        string description
        datetime created_at
        datetime updated_at
        string content_hash
        int version
        int last_modified_ms
    }

    SNAPSHOT_METADATA {
        string title
        string description
        datetime created_at
        string content_hash
    }
```

---

## Local Storage Structure

```mermaid
graph TD
    subgraph "Browser Local Storage"
        KeyTemp["webviz:session:temp"]
        KeySession1["webviz:session:{session_id_1}"]
        KeySession2["webviz:session:{session_id_2}"]
        KeyOther["... other keys"]
    end

    subgraph "Session Data Structure"
        Metadata[metadata<br/>- title<br/>- description<br/>- createdAt<br/>- updatedAt<br/>- lastModifiedMs<br/>- hash]

        Content[content<br/>- activeDashboardId<br/>- settings<br/>- userCreatedItems<br/>- dashboards[]<br/>- ensembleSet<br/>- realizationFilterSet]

        Session[Session JSON]

        Session --> Metadata
        Session --> Content
    end

    KeyTemp -.->|Stores| Session
    KeySession1 -.->|Stores| Session
    KeySession2 -.->|Stores| Session

    style KeyTemp fill:#fff3cd
    style Session fill:#e1f5ff
```

---

## Performance Optimization Opportunities

```mermaid
mindmap
    root((Performance<br/>Optimization))
        Serialization
            Partial serialization
            Lazy evaluation
            Memoization
        Hashing
            Use cheaper algorithm
            Hash only changed parts
            Debounce longer
        Polling
            Pause when inactive
            Exponential backoff
            WebSocket alternative
        Rendering
            Virtual scrolling
            Lazy loading lists
            Code splitting
        Caching
            Aggressive caching
            Service worker
            IndexedDB for large data
        Network
            Request batching
            Compression
            HTTP/2 multiplexing
```

This completes the visual flow diagrams for the persistence feature!

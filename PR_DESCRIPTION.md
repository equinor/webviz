# Session and Snapshot Persistence System

## Overview

This PR implements a comprehensive persistence system for Webviz, enabling users to save, restore, and share their workbench sessions and snapshots. The system includes automatic crash recovery, change tracking, conflict detection, and a robust backend storage layer using Azure CosmosDB.

## Key Features

### 🎯 Core Functionality
- **Session Persistence**: Save and restore complete workbench states including dashboards, modules, and settings
- **Snapshot Sharing**: Create immutable snapshots that can be shared via URL
- **Auto Recovery**: Automatic localStorage backup with crash recovery on application restart
- **Change Detection**: SHA-256 hash-based change tracking with conflict detection
- **Visit Tracking**: Track snapshot access with visitor logs and metrics
- **Content Size Validation**: Both frontend and backend enforce 1.5MB limit

### 🔄 User Experience
- **Browser Navigation**: Full support for browser back/forward buttons with unsaved changes protection
- **URL-based Loading**: Direct session/snapshot loading via URL parameters
- **Session Management UI**: Comprehensive dialogs for managing sessions and snapshots
- **Smart Polling**: Backend polling (10s interval) that pauses when window is hidden
- **Dirty State Tracking**: Visual indicators for unsaved changes

### 🏗️ Architecture Improvements
- **Separation of Concerns**: Clear separation between session management, persistence orchestration, and navigation
- **NavigationManager**: Centralized navigation control for both observing and managing URL changes
- **PersistenceOrchestrator**: Coordinates auto-save, change detection, and backend synchronization
- **SessionStateTracker**: Deterministic state tracking with hash-based change detection
- **WindowActivityObserver Integration**: Efficient resource usage by pausing polling when window is hidden

## Architecture

### Frontend Components

#### Session Management Layer
```
Workbench
├── WorkbenchSessionManager      - Session lifecycle, CRUD operations
├── NavigationManager            - Browser navigation & URL management
└── PersistenceOrchestrator     - Change tracking & auto-save coordination
    ├── SessionStateTracker      - Hash-based state comparison
    ├── BackendSyncManager       - Backend communication
    ├── LocalBackupManager       - localStorage operations
    └── WindowActivityObserver   - Window visibility detection
```

#### Key Classes

**WorkbenchSessionManager** (`frontend/src/framework/internal/WorkbenchSession/WorkbenchSessionManager.ts`)
- Session creation, opening, closing
- Backend session/snapshot CRUD operations
- Navigation handling with dirty state protection
- Recovery from localStorage
- Returns boolean success/failure instead of throwing errors

**NavigationManager** (`frontend/src/framework/internal/NavigationManager.ts`)
- Browser navigation event handling (popstate, beforeunload)
- Programmatic navigation (pushState, replaceState)
- URL tracking for navigation cancellation
- Dual responsibility: observing + controlling navigation

**PersistenceOrchestrator** (`frontend/src/framework/internal/persistence/core/PersistenceOrchestrator.ts`)
- Coordinates auto-save to localStorage (200ms debounce)
- Smart backend polling (10s interval, pauses when window hidden)
- Change detection using SessionStateTracker
- Publishes PersistenceInfo updates
- Content size validation (1.5MB frontend check)
- Integrates with WindowActivityObserver for efficient resource usage

**SessionStateTracker** (`frontend/src/framework/internal/persistence/core/SessionStateTracker.ts`)
- SHA-256 hash-based state comparison
- Deterministic JSON serialization
- Separate metadata and content hashing
- Tracks state origin (URL, backend, localStorage)

**WindowActivityObserver** (`frontend/src/framework/internal/WindowActivityObserver.ts`)
- Singleton observer for window visibility and focus state
- Page Visibility API integration
- Notifies subscribers when window becomes active/hidden
- Enables efficient polling that pauses when user is away

### Backend Services

#### API Layer
```
/persistence/sessions/*              - Session CRUD operations
/persistence/snapshots/*             - Snapshot CRUD operations
/persistence/snapshot_access_logs/*  - Visit tracking & metrics
```

#### Store Layer
- **SessionStore**: Session validation, CRUD, ownership checks, content size validation (1.5MB)
- **SnapshotStore**: Snapshot creation, retrieval, deletion, content size validation (1.5MB)
- **SnapshotAccessLogStore**: Visit logging with aggregation and pagination

#### Database Layer
- **CosmosDB Integration**: Query, pagination, filtering with collation support
- **FilterFactory**: Type-safe query filter generation with Pydantic computed field support
- **Error Mapping**: Comprehensive error handling and conversion

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
│   └── persistence.ts         # Settings serialization
└── view/
    └── persistence.ts         # View serialization
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

## Major Changes

### 🔧 Bug Fixes

1. **Navigation Cancellation** (Fixed in this session)
   - Browser back/forward navigation now properly cancels when user clicks "Cancel"
   - NavigationManager tracks programmatic URL changes to enable proper restoration
   - Fixed history state management to avoid duplicate entries
   - Used `replaceState` pattern for cancellation to preserve history structure

2. **Error Handling**
   - All `openSession`/`openSnapshot` calls now have proper error handling
   - Changed return types from `Promise<PrivateWorkbenchSession>` to `Promise<boolean>`
   - Removed error re-throwing in favor of boolean return values
   - Eliminated unhandled promise rejections in UI event handlers (5 locations)

3. **Hash Mismatch Issues**
   - Sessions no longer marked dirty when opened from URL
   - Backend hash used as source of truth
   - Deterministic JSON serialization for consistent hashing
   - Separate metadata change tracking

4. **UI Consistency**
   - Snapshot deletion now updates UI immediately using query invalidation
   - "Hide deleted snapshots" checkbox state properly synchronized
   - Fixed checkbox state inversion issues

5. **Backend Filtering**
   - FilterFactory now properly handles Pydantic `@computed_field` properties
   - Case-insensitive filtering for title and description fields
   - Proper field existence validation for nested models
   - Accesses `model_computed_fields` using property descriptor protocol

### 🏗️ Architectural Improvements

1. **NavigationObserver → NavigationManager**
   - Renamed to reflect dual responsibility (observing + controlling)
   - Added `pushState()` and `replaceState()` methods
   - Centralized URL tracking for proper navigation cancellation
   - Updated all consumers (4 locations) to use centralized navigation
   - All `window.history.pushState()` calls now go through NavigationManager

2. **Session Manager Refactoring**
   - Simplified `handleNavigation()` (reduced from ~100 lines to ~20 lines)
   - Delegates to `maybeCloseCurrentSession()` instead of duplicating logic
   - Changed return types to `Promise<boolean>` for cleaner error handling
   - Improved error messages with Axios error extraction
   - Better localStorage error handling with context-aware retry options

3. **Removed Dead Code**
   - Removed unused `GuiState.SessionHasUnsavedChanges` (5 locations)
   - Replaced with PersistenceOrchestrator's state tracking
   - Cleaned up redundant state management

4. **Improved Confirmation Dialogs**
   - Better context-aware messages for localStorage recovery
   - Separate handling for persisted vs unpersisted sessions
   - Added retry options for transient failures
   - More descriptive error messages with Axios details

5. **Enhanced openFromLocalStorage**
   - Better error handling with `ConfirmationService.confirm()`
   - Context-aware messages: "discard and start fresh" vs "discard and load from server"
   - Added retry option for transient failures
   - Returns boolean instead of throwing errors

6. **Constants and Configuration**
   - All magic numbers now defined as named constants in `constants.ts`
   - `AUTO_SAVE_DEBOUNCE_MS = 200ms`
   - `BACKEND_POLLING_INTERVAL_MS = 10000ms (10s)`
   - `MAX_TITLE_LENGTH = 50`
   - `MAX_DESCRIPTION_LENGTH = 250`
   - `MAX_CONTENT_SIZE_BYTES = 1.5MB`
   - Session/Snapshot IDs: 12 characters (3.2 trillion combinations)

### 📦 New Dependencies

**Frontend:**
- `nanoid` - Secure ID generation
- Updated React Query for better cache management

**Backend:**
- `azure-cosmos` - CosmosDB SDK
- `nanoid` - ID generation
- Enhanced FastAPI with background tasks

## Testing Considerations

### Manual Testing Scenarios

1. **Session Lifecycle**
   - [ ] Create new session, add modules, save to backend
   - [ ] Close and reopen session from backend
   - [ ] Modify session and verify dirty state indicator
   - [ ] Test auto-save to localStorage (200ms debounce)
   - [ ] Try to save oversized session (>1.5MB) and verify error message

2. **Navigation**
   - [ ] Use browser back button with unsaved changes → Cancel → URL restores correctly
   - [ ] Use browser back button with unsaved changes → Save → Navigation proceeds
   - [ ] Use browser back button with unsaved changes → Discard → Navigation proceeds
   - [ ] Navigate between multiple sessions with browser buttons
   - [ ] Verify no duplicate history entries after cancelling navigation

3. **Snapshots**
   - [ ] Create snapshot from session
   - [ ] Share snapshot URL with another user
   - [ ] Delete snapshot and verify UI updates immediately (no refresh needed)
   - [ ] Verify visit tracking in access logs
   - [ ] Test "Hide deleted snapshots" checkbox
   - [ ] Try to create oversized snapshot (>1.5MB) and verify error

4. **Recovery**
   - [ ] Create unsaved session, refresh page → Recover from localStorage
   - [ ] Create saved session with changes, refresh → See recovery dialog
   - [ ] Test recovery with corrupted localStorage data → See helpful error message
   - [ ] Test "discard and start fresh" vs "discard and load from server" options

5. **Conflict Detection & Window Activity**
   - [ ] Open session in two tabs, modify in one → Other tab shows conflict warning
   - [ ] Verify 10-second polling interval when window is active
   - [ ] Switch to another window/tab → Verify polling stops (check network tab)
   - [ ] Return to window → Verify immediate fetch and polling resumes
   - [ ] Test conflict resolution options

6. **Backend Filtering**
   - [ ] Test case-insensitive search on session titles
   - [ ] Test case-insensitive search on snapshot descriptions
   - [ ] Verify computed fields work in filters
   - [ ] Test pagination with various page sizes

## Resolved Issues from Architecture Document

### ✅ Fully Resolved

1. **Issue #7**: Magic Numbers Without Constants
   - All timing values now use named constants from `constants.ts`
   - ID lengths defined as constants (12 characters)
   - Title/description limits defined as constants
   - Content size limit defined as constant

2. **Issue #10**: Missing Content Size Validation
   - Frontend validates before serialization (1.5MB limit)
   - Backend validates in both SessionStore and SnapshotStore (1.5MB limit)
   - Clear error messages with size information

3. **Issue #13**: Polling Always Active
   - Implemented WindowActivityObserver integration
   - Polling pauses when window is hidden
   - Immediate fetch when window becomes active
   - Significant resource savings

4. **Issue #15**: Snapshot IDs Guessable (8 chars)
   - Increased from 8 to 12 characters
   - Now provides ~3.2 trillion combinations
   - Significantly reduced enumeration risk

### 📋 Remaining Known Limitations

1. **No Optimistic Updates**: All operations wait for backend response (intentional for data consistency)
2. **Background Task Reliability**: Snapshot access log updates use fire-and-forget background tasks (could benefit from proper queue)
3. **No Visual Feedback for Auto-Save**: Users don't see localStorage auto-save status (only backend save shows toast)

## Breaking Changes

⚠️ **None** - This is a new feature with no breaking API changes

## Documentation

- [PERSISTENCE_ARCHITECTURE.md](PERSISTENCE_ARCHITECTURE.md) - Comprehensive architecture documentation
- To be updated with "Recent Improvements" section documenting fixes and enhancements
- Documents NavigationManager rename and rationale
- Explains resolution of identified issues (#7, #10, #13, #15)

## Deployment Notes

### Backend
- Requires CosmosDB database setup (see `backend_py/primary/primary/persistence/setup_local_database.py`)
- Environment variables: `WEBVIZ_DB_CONNECTION_STRING`
- Background task for marking deleted snapshot logs (fire-and-forget)
- Content size limit enforced: 1.5MB

### Frontend
- No special deployment requirements
- localStorage usage for auto-save (ensure quota is sufficient)
- Page Visibility API used (supported in all modern browsers)
- Content size check before persistence (1.5MB limit with user notification)

## Performance Optimizations

- **Smart Polling**: Backend polling pauses when window is hidden, resumes immediately when active
- **Debounced Auto-save**: 200ms debounce for localStorage writes to avoid excessive I/O
- **Query Invalidation**: Efficient cache updates using React Query's `invalidateQueries`
- **Deterministic Serialization**: Sorted object keys for consistent hashing
- **12-character IDs**: Secure randomness with minimal size overhead
- **Early Size Validation**: Frontend checks content size before attempting backend save

## Future Improvements

1. Implement proper task queue for snapshot access log updates (Azure Functions, Celery)
2. Consider optimistic updates for better perceived performance (with rollback handling)
3. Add session versioning for backward compatibility
4. Implement rate limiting on snapshot access endpoints
5. Add visual feedback for localStorage auto-save status
6. Consider increasing snapshot ID length to 16 characters for even better security
7. Add telemetry for tracking session/snapshot usage patterns

## Summary Statistics

- **118 commits** on this branch
- **243 files changed**
- New persistence backend with CosmosDB integration
- Complete frontend persistence system with multiple dialogs
- Comprehensive error handling and user feedback
- Smart resource management with window activity detection
- Secure 12-character IDs for sessions and snapshots
- Content size validation in both frontend and backend

---

🤖 Generated with assistance from Claude Code

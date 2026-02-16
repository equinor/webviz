import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

/**
 * Window activity state
 */
export enum WindowActivityState {
    ACTIVE = "active", // Window is visible and focused
    VISIBLE = "visible", // Window is visible but not focused
    HIDDEN = "hidden", // Window is hidden (minimized, different tab, etc.)
}

export enum WindowActivityObserverTopic {
    ACTIVITY_STATE = "ActivityState",
}

export type WindowActivityObserverTopicPayloads = {
    [WindowActivityObserverTopic.ACTIVITY_STATE]: WindowActivityState;
};

/**
 * Observes window activity state (visibility and focus) and notifies subscribers.
 *
 * This is a singleton that monitors:
 * - Document visibility (visibilitychange event)
 * - Window focus (focus/blur events)
 *
 * Use cases:
 * - Pause/resume polling when window is inactive
 * - Reduce resource usage when app is not visible
 * - Resume operations when user returns to the tab
 *
 * @example
 * ```typescript
 * const observer = WindowActivityObserver.getInstance();
 *
 * const unsubscribe = observer
 *   .getPublishSubscribeDelegate()
 *   .makeSubscriberFunction(WindowActivityObserverTopic.ACTIVITY_STATE)((state) => {
 *     if (state === WindowActivityState.ACTIVE) {
 *       console.log("Window is active - resume operations");
 *     } else {
 *       console.log("Window is inactive - pause operations");
 *     }
 *   });
 * ```
 */
export class WindowActivityObserver implements PublishSubscribe<WindowActivityObserverTopicPayloads> {
    private static _instance: WindowActivityObserver | null = null;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WindowActivityObserverTopicPayloads>();
    private _currentState: WindowActivityState;
    private _isInitialized = false;
    private _boundHandleVisibilityChange: () => void;
    private _boundHandleFocus: () => void;
    private _boundHandleBlur: () => void;

    private constructor() {
        this._currentState = this.calculateCurrentState();

        // Bind event handlers once in constructor for better traceability
        this._boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
        this._boundHandleFocus = this.handleFocus.bind(this);
        this._boundHandleBlur = this.handleBlur.bind(this);

        this.initialize();
    }

    /**
     * Get the singleton instance of WindowActivityObserver
     */
    static getInstance(): WindowActivityObserver {
        if (!WindowActivityObserver._instance) {
            WindowActivityObserver._instance = new WindowActivityObserver();
        }
        return WindowActivityObserver._instance;
    }

    /**
     * Calculate the current activity state based on document visibility and focus
     */
    private calculateCurrentState(): WindowActivityState {
        if (document.hidden) {
            return WindowActivityState.HIDDEN;
        }
        if (document.hasFocus()) {
            return WindowActivityState.ACTIVE;
        }
        return WindowActivityState.VISIBLE;
    }

    /**
     * Initialize event listeners
     */
    private initialize(): void {
        if (this._isInitialized) {
            return;
        }

        // Handle visibility changes (tab switched, window minimized, etc.)
        document.addEventListener("visibilitychange", this._boundHandleVisibilityChange);

        // Handle focus changes (window focused/blurred)
        window.addEventListener("focus", this._boundHandleFocus);
        window.addEventListener("blur", this._boundHandleBlur);

        this._isInitialized = true;
    }

    /**
     * Handle visibility change event
     */
    private handleVisibilityChange(): void {
        const newState = this.calculateCurrentState();
        if (newState !== this._currentState) {
            this._currentState = newState;
            this._publishSubscribeDelegate.notifySubscribers(WindowActivityObserverTopic.ACTIVITY_STATE);
        }
    }

    /**
     * Handle window focus event
     */
    private handleFocus(): void {
        const newState = this.calculateCurrentState();
        if (newState !== this._currentState) {
            this._currentState = newState;
            this._publishSubscribeDelegate.notifySubscribers(WindowActivityObserverTopic.ACTIVITY_STATE);
        }
    }

    /**
     * Handle window blur event
     */
    private handleBlur(): void {
        const newState = this.calculateCurrentState();
        if (newState !== this._currentState) {
            this._currentState = newState;
            this._publishSubscribeDelegate.notifySubscribers(WindowActivityObserverTopic.ACTIVITY_STATE);
        }
    }

    /**
     * Get the current activity state
     */
    getCurrentState(): WindowActivityState {
        return this._currentState;
    }

    /**
     * Check if the window is currently active (visible and focused)
     */
    isActive(): boolean {
        return this._currentState === WindowActivityState.ACTIVE;
    }

    /**
     * Check if the window is currently visible (may not be focused)
     */
    isVisible(): boolean {
        return this._currentState === WindowActivityState.ACTIVE || this._currentState === WindowActivityState.VISIBLE;
    }

    /**
     * Check if the window is currently hidden
     */
    isHidden(): boolean {
        return this._currentState === WindowActivityState.HIDDEN;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<WindowActivityObserverTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends WindowActivityObserverTopic.ACTIVITY_STATE>(
        topic: T,
    ): () => WindowActivityObserverTopicPayloads[T] {
        return (): WindowActivityObserverTopicPayloads[T] => {
            if (topic === WindowActivityObserverTopic.ACTIVITY_STATE) {
                return this._currentState as WindowActivityObserverTopicPayloads[T];
            }
            throw new Error(`Unknown topic: ${topic}`);
        };
    }

    /**
     * Clean up event listeners (typically not needed for singleton, but provided for completeness)
     */
    destroy(): void {
        if (!this._isInitialized) {
            return;
        }

        document.removeEventListener("visibilitychange", this._boundHandleVisibilityChange);
        window.removeEventListener("focus", this._boundHandleFocus);
        window.removeEventListener("blur", this._boundHandleBlur);

        this._isInitialized = false;
        WindowActivityObserver._instance = null;
    }
}

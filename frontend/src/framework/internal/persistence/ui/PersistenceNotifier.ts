/**
 * A UI-agnostic notification interface for persistence-related user feedback.
 * All methods return a notification ID so that notifications can be updated or dismissed later.
 */
export interface PersistenceNotifier {
    /**
     * Display a loading indicator.
     * @returns an id representing this notification.
     */
    loading(message: string): string | number;

    /**
     * Display a success message.
     * @returns an id representing this notification.
     */
    success(message: string): string | number;

    /**
     * Display an error message.
     * @returns an id representing this notification.
     */
    error(message: string): string | number;

    /**
     * Display an informational or warning message.
     * @returns an id representing this notification.
     */
    info(message: string): string | number;

    /**
     * Dismiss a notification by its id.
     */
    dismiss(id: string | number): void;
}

/**
 * Format a UTC-millisecond timestamp as YYYY-MM-DD.
 */
export function formatDate(utcMs: number): string {
    return new Date(utcMs).toISOString().slice(0, 10);
}

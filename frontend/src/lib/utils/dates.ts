export function timeAgo(msDiff: number): string {
    const seconds = Math.floor(msDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
    if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
    return `${years} year${years === 1 ? "" : "s"} ago`;
}

/**
 * Format a timestamp with day, month, and year.
 * @param timestamp - Date object or timestamp in milliseconds
 * @returns Formatted date string like "24 Dec 2023"
 */
export function formatDate(timestamp: Date | number): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    const options: Intl.DateTimeFormatOptions = {
        // weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    return date.toLocaleDateString(undefined, options);
}

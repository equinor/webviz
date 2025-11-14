import { pluralize } from "./strings";

const LONG_NAMES = {
    seconds: " second",
    minutes: " minute",
    hours: " hour",
    days: " day",
    weeks: " week",
    months: " month",
    years: " year",
} as const;

const SHORT_NAMES = {
    seconds: "sec",
    minutes: "min",
    hours: "hr",
    days: "day",
    weeks: "wk",
    months: "mth",
    years: "yr",
} as const;

export function timeAgo(msDiff: number, shorten: boolean = false): string {
    const seconds = Math.floor(msDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    const names = shorten ? SHORT_NAMES : LONG_NAMES;

    if (seconds < 5) return "just now";
    if (seconds < 60) return `${pluralize(names.seconds, seconds)} ago`;
    if (minutes < 60) return `${pluralize(names.minutes, minutes)} ago`;
    if (hours < 24) return `${pluralize(names.hours, hours)} ago`;
    if (days < 7) return `${pluralize(names.days, days)} ago`;
    if (weeks < 5) return `${pluralize(names.weeks, weeks)} ago`;
    if (months < 12) return `${pluralize(names.months, months)} ago`;
    return `${pluralize(names.years, years)} ago`;
}

/**
 * Format a timestamp with day, month, and year.
 * @param timestamp - Date object or timestamp in milliseconds
 * @returns Formatted date string like "24 Dec 2023"
 */
export function formatDate(timestamp: Date | number, formatOptions?: Intl.DateTimeFormatOptions): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    const options: Intl.DateTimeFormatOptions = formatOptions ?? {
        year: "numeric",
        month: "2-digit",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    return date.toLocaleDateString(undefined, options);
}

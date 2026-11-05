export const MIN_CALENDAR_YEAR = 1900;
export const MAX_CALENDAR_YEAR = 2200;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonthIndex(monthIndex: number): string {
    return `${MONTH_NAMES[monthIndex % 12]} ${Math.floor(monthIndex / 12)}`;
}

/** A whole calendar year within the accepted bounds, or null for anything else. */
export function parseCalendarYear(text: string): number | null {
    const trimmed = text.trim();
    if (!/^\d{4}$/.test(trimmed)) {
        return null;
    }
    const year = Number(trimmed);
    return year >= MIN_CALENDAR_YEAR && year <= MAX_CALENDAR_YEAR ? year : null;
}

/** The label for an evaluation start year, which always begins on 1 January. */
export function formatYearStart(year: number): string {
    return `1 Jan ${year}`;
}

/** A year typed alone or with a "1 Jan"/"1 January" prefix, as shown in the evaluation start options. */
export function parseYearStart(text: string): number | null {
    return parseCalendarYear(text.trim().replace(/^1\s+jan(uary)?\s+/i, ""));
}

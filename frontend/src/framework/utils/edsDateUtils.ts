export type EdsDateRange = { from: Date | null; to: Date | null };
export type FilterIsoStringRange = { from?: string; to?: string };
export type FilterTimeSinceEpochMsRange = { from?: number; to?: number };

// Generic utility to convert EdsDateRange to a range of another type using a converter function.
// The eds DateRange always use hour 0 for the time, but when converting the "to" date we set the time to 23:59:59,
// to make the range inclusive for the entire "to" day.
function convertEdsDateRange<T>(
    edsDateRangeChoice: null | EdsDateRange,
    converter: (date: Date) => T,
): { from?: T; to?: T } | undefined {
    if (edsDateRangeChoice?.from || edsDateRangeChoice?.to) {
        const filterRange: { from?: T; to?: T } = {};

        if (edsDateRangeChoice.from) filterRange.from = converter(edsDateRangeChoice.from);
        if (edsDateRangeChoice.to) {
            // The range component always uses hour 0 for the time
            // We set the time to 23:59:59 to range inclusive
            const toDate = new Date(edsDateRangeChoice.to);
            toDate.setHours(23, 59, 59);
            filterRange.to = converter(toDate);
        }

        return filterRange;
    }

    return undefined;
}

// Utility to convert range of Date objects to range of ISO strings
export function edsDateRangeChoiceToFilterIsoStringRange(
    edsDateRangeChoice: null | EdsDateRange,
): undefined | FilterIsoStringRange {
    return convertEdsDateRange(edsDateRangeChoice, (date) => date.toISOString());
}

// Utility to convert range of Date objects to range of time since epoch in milliseconds
export function edsDateRangeChoiceToTimeSinceEpochMs(
    edsDateRangeChoice: null | EdsDateRange,
): FilterTimeSinceEpochMsRange | undefined {
    return convertEdsDateRange(edsDateRangeChoice, (date) => date.getTime());
}

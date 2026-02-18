export type EdsDateRange = { from: Date | null; to: Date | null };
export type IsoStringRange = { from?: string; to?: string };
export type EpochMsRange = { from?: number; to?: number };

// Generic utility to convert EdsDateRange to a range of another type using a converter function.
// The eds DateRange always use hour 0 for the time, but when converting the "to" date we set the time to 23:59:59,
// to make the range inclusive for the entire "to" day.
function convertEdsDateRange<T>(
    edsDateRangeChoice: EdsDateRange | null,
    converter: (date: Date) => T,
): { from?: T; to?: T } | null {
    if (edsDateRangeChoice?.from || edsDateRangeChoice?.to) {
        const filterRange: { from?: T; to?: T } = {};

        if (edsDateRangeChoice.from) filterRange.from = converter(edsDateRangeChoice.from);
        if (edsDateRangeChoice.to) {
            // The range component always uses hour 0 for the time
            // We set the time to 23:59:59 to make the range inclusive
            const toDate = new Date(edsDateRangeChoice.to);
            toDate.setHours(23, 59, 59);
            filterRange.to = converter(toDate);
        }

        return filterRange;
    }

    return null;
}

// Utility to convert range of Date objects to range of ISO strings
export function edsDateRangeToIsoStringRange(edsDateRangeChoice: EdsDateRange | null): IsoStringRange | null {
    return convertEdsDateRange(edsDateRangeChoice, (date) => date.toISOString());
}

// Utility to convert range of Date objects to range of time since epoch in milliseconds
export function edsDateRangeToEpochMsRange(edsDateRangeChoice: EdsDateRange | null): EpochMsRange | null {
    return convertEdsDateRange(edsDateRangeChoice, (date) => date.getTime());
}

export function isoRangeToEdsDateRange(isoRange: IsoStringRange | null): EdsDateRange {
    if (isoRange === null) return { from: null, to: null };

    let from: Date | null = null;
    let to: Date | null = null;

    if (isoRange.from) from = new Date(isoRange.from);
    if (isoRange.to) to = new Date(isoRange.to);

    return { from, to };
}

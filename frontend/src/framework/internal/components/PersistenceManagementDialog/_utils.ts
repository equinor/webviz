export type EdsFilterRange = { from: Date | null; to: Date | null };
export type FilterRange = { from?: string; to?: string };

export function edsRangeChoiceToFilterRange(edsRangeChoice: null | EdsFilterRange): undefined | FilterRange {
    if (edsRangeChoice?.from || edsRangeChoice?.to) {
        const filterRange: FilterRange = {};

        if (edsRangeChoice.from) filterRange.from = edsRangeChoice.from.toISOString();
        if (edsRangeChoice.to) {
            // The range component always uses hour 0 for the time
            // We set the time to 23:59:59 to range inclusive
            const toDate = new Date(edsRangeChoice.to);
            toDate.setHours(23, 59, 59);
            filterRange.to = toDate.toISOString();
        }

        return filterRange;
    }

    return undefined;
}

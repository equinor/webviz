// Check if the date-time string contains time
// According to spec, only the hour part of time is mandatory
export function hasTime(isoDateTimeString: string): boolean {
    // Regular expression to match time portion in ISO 8601 format
    const regex = /T\d{2}/;
    return regex.test(isoDateTimeString);
}

// Check if specified date-time string contains timezone information
export function hasTimezone(isoDateTimeString: string): boolean {
    const regex = /T.*(Z|[+-]\d{2})/
    return regex.test(isoDateTimeString);
}

// Convert ISO 8601 string to timestamp in milliseconds UTC
// Note that for date-time strings that do not contain timezone information, this function assumes that the date-time string is in UTC
export function isoStringToTimestampUtcMs(isoDateTimeString: string): number {
    if (hasTime(isoDateTimeString) && !hasTimezone(isoDateTimeString)) {
        isoDateTimeString += "Z";
    }

    return Date.parse(isoDateTimeString);
}

// Convert timestamp in milliseconds UTC to ISO 8601 string
// The returned string will always be on the format YYYY-MM-DDTHH:mm:ss.sssZ
export function timestampUtcMsToIsoString(timestampUtcMs: number): string {
    const date = new Date(timestampUtcMs);
    // According to the toISOString() doc, the timezone is always UTC (with the suffix Z)
    return date.toISOString();
}

// Convert timestamp in milliseconds UTC to a compacted ISO 8601 string.
// Depending on the input value, the returned string may be in one of the following formats:
//  YYYY-MM-DDTHH:mm:ss.sssZ
//  YYYY-MM-DDTHH:mm:ssZ
//  YYYY-MM-DD
export function timestampUtcMsToCompactIsoString(timestampUtcMs: number): string {
    const date = new Date(timestampUtcMs);

    // According to the toISOString() doc, the timezone is always UTC (with the suffix Z)
    const fullIsoString = date.toISOString();

    const hasMilliseconds = date.getUTCMilliseconds() !== 0;
    const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || hasMilliseconds;

    if (!hasTime) {
        return fullIsoString.split("T")[0];
    }

    if (!hasMilliseconds) {
        return fullIsoString.replace(".000", "");
    }

    return fullIsoString;
}

// Returns same as timestampUtcMsToIsoString() but with timezone (Z) stripped away
export function timestampUtcMsToIsoStringStripTz(timestampUtcMs: number): string {
    return timestampUtcMsToIsoString(timestampUtcMs).replace("Z", "");
}

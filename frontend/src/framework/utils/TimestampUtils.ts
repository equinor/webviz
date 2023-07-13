

// Check if the date-time string contains time

// According to spec, only the hour part of time is mandatory
export function hasTime(isoDateTimeString: string): boolean {
    // Regular expression to match time portion in ISO 8601 format
    const regex = /T\d{2}(:\d{2})?(:\d{2}(\.\d+)?)?/;
    return regex.test(isoDateTimeString);
}

// Check if specified date-time string contains timezone information
export function hasTimezone(isoDateTimeString: string): boolean {
    const regex = /Z|[+-]\d{2}:\d{2}$/;
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

export function isoStringArrayToTimestampUtcMs(isoDateTimeStringArray: string[]): Float64Array {
    const retArr = new Float64Array(isoDateTimeStringArray.length);
    for (let i = 0; i < isoDateTimeStringArray.length; i++) {
        retArr[i] = isoStringToTimestampUtcMs(isoDateTimeStringArray[i]);
    }

    return retArr;
}

// Convert timestamp in milliseconds UTC to ISO 8601 string
export function timestampUtcMsToIsoString(timestampUtcMs: number): string {
    const date = new Date(timestampUtcMs);
    return date.toISOString();
}

export function timestampUtcMsToIsoStringNoTz(timestampUtcMs: number): string {
  const date = new Date(timestampUtcMs);
  return date.toISOString().replace("Z", "");
}

/**
 * Utility functions to check if a valid interval of ISO date strings on the format startDate/endDate
 *
 * Input ISO interval string format: '2018-01-01T00:00:00/2019-07-01T00:00:00'
 */
export function isIsoIntervalString(input: string): boolean {
    const isoIntervalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    return isoIntervalRegex.test(input);
}

/**
 * Utility function to check if a string is a valid ISO date string
 *
 * Input ISO string format: '2018-01-01T00:00:00'
 */
export function isIsoString(input: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    return isoRegex.test(input);
}

/**
 * Extracts the date substring from an ISO string
 *
 * Input ISO string format: '2018-01-01T00:00:00'
 * Returns: '2018-01-01'
 */
export function isoStringToDateLabel(inputIsoString: string): string {
    const date = inputIsoString.split("T")[0];
    return `${date}`;
}

/**
 * Extracts interval date substring from an ISO string
 *
 * Input ISO string format: '2018-01-01T00:00:00/2019-07-01T00:00:00'
 * Returns: '2018-01-01/2019-07-01'
 */
export function isoIntervalStringToDateLabel(inputIsoIntervalString: string): string {
    const [start, end] = inputIsoIntervalString.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}

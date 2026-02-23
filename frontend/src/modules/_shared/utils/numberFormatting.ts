/**
 * Formats a number to a string with a maximum number of decimal places.
 * Uses suffixes (K, M, B, T) for large numbers, and exponential notation for very small ones.
 * @param value The number to format.
 * @param maxNumDecimalPlaces The maximum number of decimal places to include in the formatted string.
 * @returns The formatted string representation of the number.
 */
export function formatNumber(value: number, maxNumDecimalPlaces: number = 3): string {
    if (!isFinite(value)) return value.toString();
    if (value === 0) return "0";

    const absValue = Math.abs(value);

    // Suffixes for large numbers
    const suffixes: [number, string][] = [
        [1e12, "T"],
        [1e9, "B"],
        [1e6, "M"],
        [1e3, "K"],
    ];

    for (const [threshold, suffix] of suffixes) {
        if (absValue >= threshold && absValue >= 10000) {
            const scaled = value / threshold;
            return Number.isInteger(scaled) ? `${scaled}${suffix}` : `${scaled.toFixed(maxNumDecimalPlaces)}${suffix}`;
        }
    }

    // Exponential for small values too small to represent with fixed decimals
    const fixed = value.toFixed(maxNumDecimalPlaces);
    if (parseFloat(fixed) === 0 && absValue < 1) {
        return value.toExponential(maxNumDecimalPlaces);
    }

    // Omit decimals for integers
    return Number.isInteger(value) ? value.toString() : fixed;
}

/**
 * Formats a number and removes trailing zeros from decimals
 */
export function formatNumberWithoutTrailingZeros(value: number): string {
    // Handle values that are essentially zero due to floating point precision
    if (Math.abs(value) < 1e-10) {
        return "0";
    }

    const formatted = formatNumber(value);
    // Remove trailing zeros after decimal point, and remove decimal point if no digits follow
    // This handles cases like: "1.000" -> "1", "1.200" -> "1.2", "1.20K" -> "1.2K"
    return formatted.replace(/(\.\d*?)0+(\D|$)/, "$1$2").replace(/\.$/, "");
}

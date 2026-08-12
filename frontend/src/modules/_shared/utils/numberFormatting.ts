export type NumberFormatNotation = "standard" | "scientific" | "engineering";
export type NumberFormatUnitSystem = "none" | "si" | "binary";

export type NumberFormatOptions = {
    /**
     * Limits the number of decimal places. When set, decimal-place rounding is used instead of
     * significant digits. Accepts a non-negative integer.
     */
    maxNumDecimalPlaces?: number;
    /** Number of significant digits when maxNumDecimalPlaces is not set. Default: 3 */
    numSignificantDigits?: number;
    /** Display notation. Default: "standard" */
    notation?: NumberFormatNotation;
    /** Prefix system for scaling large/small values. Default: "none" */
    unitSystem?: NumberFormatUnitSystem;
    /** Unit label appended after any prefix, e.g. "m", "Hz", "B". */
    unit?: string;
};

export const DEFAULT_FORMAT_OPTIONS = {
    numSignificantDigits: 3,
    notation: "standard" as NumberFormatNotation,
    unitSystem: "none" as NumberFormatUnitSystem,
    unit: "",
} satisfies Required<Omit<NumberFormatOptions, "maxNumDecimalPlaces">>;

// Descending order, largest prefix first
const SI_PREFIXES: readonly [number, string][] = [
    [1e15, "P"],
    [1e12, "T"],
    [1e9, "G"],
    [1e6, "M"],
    [1e3, "k"],
    [1, ""],
    [1e-3, "m"],
    [1e-6, "μ"],
    [1e-9, "n"],
    [1e-12, "p"],
    [1e-15, "f"],
];

const BINARY_PREFIXES: readonly [number, string][] = [
    [2 ** 50, "Pi"],
    [2 ** 40, "Ti"],
    [2 ** 30, "Gi"],
    [2 ** 20, "Mi"],
    [2 ** 10, "Ki"],
    [1, ""],
];

function formatAbsValue(
    absValue: number,
    maxNumDecimalPlaces: number | undefined,
    numSignificantDigits: number
): string {
    if (Number.isInteger(absValue)) return absValue.toString();
    if (maxNumDecimalPlaces !== undefined) {
        return parseFloat(absValue.toFixed(maxNumDecimalPlaces)).toString();
    }
    return parseFloat(absValue.toPrecision(numSignificantDigits)).toString();
}

/**
 * Formats a number to a human-readable string.
 *
 * By default uses significant digits (3) to avoid trailing-zero noise:
 *   formatNumber(1234)        → "1234"
 *   formatNumber(1.234)       → "1.23"
 *   formatNumber(0.00234)     → "0.00234"
 *
 * Options form:
 *   formatNumber(1.234, { maxNumDecimalPlaces: 2 })             → "1.23"
 *   formatNumber(1234, { unitSystem: "si", unit: "m" })         → "1.23 km"
 *   formatNumber(1234, { notation: "scientific" })              → "1.23e+3"
 *   formatNumber(1073741824, { unitSystem: "binary", unit: "B" }) → "1 GiB"
 */
export function formatNumber(value: number, options?: NumberFormatOptions): string {
    if (!isFinite(value)) return value.toString();

    const rawOpts: NumberFormatOptions = options ?? {};

    const numSigDigits = rawOpts.numSignificantDigits ?? DEFAULT_FORMAT_OPTIONS.numSignificantDigits;
    const maxDecimals = rawOpts.maxNumDecimalPlaces;
    const notation = rawOpts.notation ?? DEFAULT_FORMAT_OPTIONS.notation;
    const unitSystem = rawOpts.unitSystem ?? DEFAULT_FORMAT_OPTIONS.unitSystem;
    const unit = rawOpts.unit ?? DEFAULT_FORMAT_OPTIONS.unit;

    if (value === 0) return unit ? `0 ${unit}` : "0";

    const sign = value < 0 ? "-" : "";
    const absValue = Math.abs(value);
    const unitSuffix = unit ? ` ${unit}` : "";

    // Scientific notation: e.g. "1.23e+3"
    if (notation === "scientific") {
        const numDecimals = maxDecimals ?? numSigDigits - 1;
        return `${sign}${absValue.toExponential(numDecimals)}${unitSuffix}`;
    }

    // Engineering notation: exponent is always a multiple of 3
    if (notation === "engineering") {
        const exp = Math.floor(Math.log10(absValue) / 3) * 3;
        const mantissa = absValue / Math.pow(10, exp);
        let roundedMantissa =
            maxDecimals !== undefined
                ? parseFloat(mantissa.toFixed(maxDecimals))
                : parseFloat(mantissa.toPrecision(numSigDigits));

        // Correct for rounding rollover (e.g., 999.9 → 1000 at 3 sig figs → shift to next exp)
        let finalExp = exp;
        if (roundedMantissa >= 1000) {
            finalExp += 3;
            const adjusted = absValue / Math.pow(10, finalExp);
            roundedMantissa =
                maxDecimals !== undefined
                    ? parseFloat(adjusted.toFixed(maxDecimals))
                    : parseFloat(adjusted.toPrecision(numSigDigits));
        }

        const expStr = finalExp === 0 ? "" : `e${finalExp > 0 ? "+" : ""}${finalExp}`;
        return `${sign}${roundedMantissa}${expStr}${unitSuffix}`;
    }

    // SI prefix mode (k, M, G, …, m, μ, n, …)
    if (unitSystem === "si") {
        // Pre-round before prefix selection to avoid "1000 k" instead of "1 M"
        const preRounded =
            maxDecimals !== undefined ? absValue : parseFloat(absValue.toPrecision(numSigDigits));
        const [factor, prefix] = SI_PREFIXES.find(([f]) => preRounded >= f) ?? SI_PREFIXES.at(-1)!;
        const scaled = absValue / factor;
        const formatted = formatAbsValue(scaled, maxDecimals, numSigDigits);
        const combined = prefix + unit;
        return `${sign}${formatted}${combined ? ` ${combined}` : ""}`;
    }

    // Binary prefix mode (Ki, Mi, Gi, …)
    if (unitSystem === "binary") {
        const [factor, prefix] = BINARY_PREFIXES.find(([f]) => absValue >= f) ?? BINARY_PREFIXES.at(-1)!;
        const scaled = absValue / factor;
        const formatted = formatAbsValue(scaled, maxDecimals, numSigDigits);
        const combined = prefix + unit;
        return `${sign}${formatted}${combined ? ` ${combined}` : ""}`;
    }

    // Standard notation without prefix
    return `${sign}${formatAbsValue(absValue, maxDecimals, numSigDigits)}${unitSuffix}`;
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

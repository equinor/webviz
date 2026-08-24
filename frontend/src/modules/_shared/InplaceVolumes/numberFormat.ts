// Only scales upwards: properties and fractions are small and should not get milli/micro prefixes.
function createScaledNumberWithSuffix(value: number): { scaledValue: number; suffix: string } {
    const log = Math.log10(Math.abs(value));
    if (log >= 9) {
        return { scaledValue: value / 1e9, suffix: "G" };
    }
    if (log >= 6) {
        return { scaledValue: value / 1e6, suffix: "M" };
    }
    if (log >= 3) {
        return { scaledValue: value / 1e3, suffix: "k" };
    }
    return { scaledValue: value, suffix: "" };
}

/**
 * Formats an inplace volumes result value using SI prefixes (k, M, G).
 *
 * Shared by the plots and the statistics tables so both render the same prefixes and precision.
 * Null values are rendered as "-", since the backend returns null for properties that cannot be
 * calculated (e.g. a zero denominator).
 */
export function formatInplaceVolumesValue(value: string | number | null): string {
    if (value === null) {
        return "-";
    }
    if (typeof value === "string") {
        return value;
    }
    if (!isFinite(value)) {
        return value.toString();
    }

    const { scaledValue, suffix } = createScaledNumberWithSuffix(value);

    // Keep small values (properties, fractions) readable now that they are never prefix-scaled
    let decimalPlaces = 2;
    if (Math.abs(scaledValue) < 0.01) {
        decimalPlaces = 4;
    } else if (Math.abs(scaledValue) < 0.1) {
        decimalPlaces = 3;
    }

    const formattedValue = scaledValue.toFixed(decimalPlaces);
    return suffix ? `${formattedValue} ${suffix}` : formattedValue;
}

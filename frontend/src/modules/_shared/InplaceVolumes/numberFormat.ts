import type { Axis } from "plotly.js";

import { isDimensionlessResultName } from "./types";

// Only scales upwards: properties and fractions are small and should not get milli/micro prefixes.
const SI_PREFIXES: readonly [number, string][] = [
    [1e15, "P"],
    [1e12, "T"],
    [1e9, "G"],
    [1e6, "M"],
    [1e3, "k"],
];

function createScaledNumberWithSuffix(value: number): { scaledValue: number; suffix: string } {
    const absValue = Math.abs(value);
    const prefix = SI_PREFIXES.find(([factor]) => absValue >= factor);
    if (!prefix) {
        return { scaledValue: value, suffix: "" };
    }
    return { scaledValue: value / prefix[0], suffix: prefix[1] };
}

/**
 * Formats an inplace volumes result value using SI prefixes (k, M, G, T, P).
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

/**
 * Plotly tick and hover formats matching `formatInplaceVolumesValue`.
 *
 * Volumes get SI prefixes, while dimensionless properties are kept as plain decimals - Plotly's
 * "SI" mode would otherwise render a porosity of 0.25 as "250m" on the axis while the tables show
 * "0.25". `hoverformat` covers the traces that hover directly on raw `%{x}` / `%{y}` values.
 */
export function makeInplaceVolumesAxisFormat(resultName: string | null): Partial<Axis> {
    if (isDimensionlessResultName(resultName)) {
        return { exponentformat: "none", hoverformat: "" };
    }
    return { exponentformat: "SI", hoverformat: ".3s" };
}

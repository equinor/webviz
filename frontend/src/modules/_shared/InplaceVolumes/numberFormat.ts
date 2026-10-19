import type { Axis } from "plotly.js";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { isDimensionlessResultName } from "./types";

/**
 * Formats an inplace volumes result value using SI prefixes (k, M, G, T, P).
 *
 * Shared by the plots and the statistics tables so both render the same prefixes and precision.
 * Null values are rendered as "-", since the backend returns null for properties that cannot be
 * calculated (e.g. a zero denominator). Until units are reported per response, all numeric values
 * use upward-only SI scaling to avoid displaying ratios and fractions with sub-unit prefixes.
 */
export function formatInplaceVolumesValue(value: string | number | null): string {
    if (value === null || (typeof value === "number" && !Number.isFinite(value))) {
        return "-";
    }
    if (typeof value === "string") {
        return value;
    }
    return formatNumber(value, { unitSystem: "si", useSubUnitPrefixes: false, numSignificantDigits: 3 });
}

/**
 * Plotly tick and hover formats matching `formatInplaceVolumesValue`.
 *
 * Until the backend reports units per response, known dimensionless properties are identified by
 * name and kept as plain decimals. Plotly's "SI" mode would otherwise render a porosity of 0.25 as
 * "250m" while the tables show "0.25". Unit metadata should eventually determine this formatting.
 * `hoverformat` covers traces that hover directly on raw `%{x}` / `%{y}` values.
 */
export function makeInplaceVolumesAxisFormat(resultName: string | null): Partial<Axis> {
    if (isDimensionlessResultName(resultName)) {
        return { exponentformat: "none", hoverformat: "" };
    }
    return { exponentformat: "SI", hoverformat: ".3s" };
}

import type { VolumeChangeDecomposition, WaterfallBar } from "./computeVolumeChangeDecomposition";
import { isNegligible } from "./computeVolumeChangeDecomposition";

/** Bar labels as displayed: the endpoints carry the source names, the rest their factor name. */
export function makeBarDisplayLabels(
    decomposition: VolumeChangeDecomposition,
    referenceLabel: string,
    comparisonLabel: string,
): string[] {
    const { bars } = decomposition;
    return bars.map((bar, index) => {
        if (index === 0) {
            return referenceLabel;
        }
        if (index === bars.length - 1) {
            return comparisonLabel;
        }
        return bar.label;
    });
}

/**
 * A factor bar's impact as a percentage of the cumulative it starts from. Null for the absolute
 * endpoint bars, which are volumes rather than changes, and for a negligible previous cumulative,
 * where the percentage is undefined rather than meaningfully zero (or numerically absurd).
 */
export function computeBarChangePercent(bars: WaterfallBar[], index: number): number | null {
    const bar = bars[index];
    if (bar.measure === "absolute") {
        return null;
    }
    const previousCumulative = bars[index - 1]?.cumulative ?? 0;
    return !isNegligible(previousCumulative, bar.value) ? (100 * bar.value) / previousCumulative : null;
}

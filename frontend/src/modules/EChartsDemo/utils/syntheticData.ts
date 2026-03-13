import type {
    BarTrace,
    DistributionTrace,
    HeatmapTrace,
    RealizationScatterTrace,
    SubplotGroup,
    TimeseriesTrace,
} from "@modules/_shared/eCharts";
import { computeTimeseriesStatistics } from "@modules/_shared/eCharts";

const COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"];

function getEnsembleName(groupIndex: number): string {
    return `Ensemble ${String.fromCharCode(65 + groupIndex)}`;
}

function getEnsembleColor(groupIndex: number): string {
    return COLORS[groupIndex % COLORS.length];
}

function getEnsembleKey(groupIndex: number): string {
    return `ensemble-${groupIndex}`;
}

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return s / 2147483647;
    };
}

function generateRandomWalk(numSteps: number, numRealizations: number, seed: number): number[][] {
    const rng = seededRandom(seed);
    const result: number[][] = [];
    for (let r = 0; r < numRealizations; r++) {
        const series = [rng() * 10 + 50];
        for (let t = 1; t < numSteps; t++) {
            series.push(series[t - 1] + (rng() - 0.48) * 3);
        }
        result.push(series);
    }
    return result;
}

export function generateTimeseriesGroups(
    numSubplots: number,
    numGroups: number,
    numRealizations: number,
    numTimesteps = 100,
): SubplotGroup<TimeseriesTrace>[] {
    const baseTimestamp = Date.UTC(2020, 0, 1);
    const timestamps = Array.from({ length: numTimesteps }, (_, i) => baseTimestamp + i * 30 * 24 * 3600 * 1000);

    const subplots: SubplotGroup<TimeseriesTrace>[] = [];

    for (let s = 0; s < numSubplots; s++) {
        const traces: TimeseriesTrace[] = [];
        for (let g = 0; g < numGroups; g++) {
            const seed = g * 1000 + s * 100 + 42;
            const realizationValues = generateRandomWalk(numTimesteps, numRealizations, seed);
            const realizationIds = Array.from({ length: numRealizations }, (_, i) => i);
            const statistics = computeTimeseriesStatistics(realizationValues);

            traces.push({
                name: getEnsembleName(g),
                color: getEnsembleColor(g),
                timestamps,
                highlightGroupKey: getEnsembleKey(g),
                realizationValues,
                realizationIds,
                statistics,
            });
        }
        subplots.push({
            title: numSubplots > 1 ? `Subplot ${s + 1}` : "",
            traces,
        });
    }

    return subplots;
}

export function generateDistributionTraces(
    numGroups: number,
    numRealizations: number,
    subplotIndex = 0,
): DistributionTrace[] {
    const traces: DistributionTrace[] = [];
    for (let g = 0; g < numGroups; g++) {
        const rng = seededRandom(g * 1000 + subplotIndex * 100 + 7);
        const values: number[] = [];
        const realizationIds: number[] = [];
        for (let r = 0; r < numRealizations; r++) {
            // Normal-ish distribution via Box-Muller
            const u1 = rng();
            const u2 = rng();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            values.push(50 + g * 10 + subplotIndex * 4 + z * 8);
            realizationIds.push(r);
        }
        traces.push({
            name: getEnsembleName(g),
            color: getEnsembleColor(g),
            values,
            realizationIds,
        });
    }
    return traces;
}

export function generateBarTraces(numGroups: number, subplotIndex = 0): BarTrace[] {
    const categories = ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E"];
    const traces: BarTrace[] = [];
    for (let g = 0; g < numGroups; g++) {
        const rng = seededRandom(99 + subplotIndex * 1000 + g * 37);
        traces.push({
            name: getEnsembleName(g),
            color: getEnsembleColor(g),
            categories,
            values: categories.map(() => 20 + rng() * 80),
        });
    }
    return traces;
}

export function generateHeatmapTraces(numSubplots: number): SubplotGroup<HeatmapTrace>[] {
    const xLabels = Array.from({ length: 24 }, (_, i) => `2020-${String(i + 1).padStart(2, "0")}`);
    const yLabels = ["Region 1", "Region 2", "Region 3", "Region 4", "Region 5"];
    const timestampsUtcMs = xLabels.map((_, i) => Date.UTC(2020, i, 1));

    const subplots: SubplotGroup<HeatmapTrace>[] = [];

    for (let s = 0; s < numSubplots; s++) {
        const rng = seededRandom(s * 200 + 13);
        const data: [number, number, number][] = [];
        let minValue = Infinity;
        let maxValue = -Infinity;

        for (let x = 0; x < xLabels.length; x++) {
            for (let y = 0; y < yLabels.length; y++) {
                const val = rng() * 100;
                data.push([x, y, val]);
                if (val < minValue) minValue = val;
                if (val > maxValue) maxValue = val;
            }
        }

        subplots.push({
            title: numSubplots > 1 ? `Ensemble ${s + 1}` : "",
            traces: [
                {
                    name: `Ensemble ${s + 1}`,
                    xLabels,
                    yLabels,
                    timestampsUtcMs,
                    data,
                    minValue,
                    maxValue,
                },
            ],
        });
    }

    return subplots;
}

export function generateRealizationScatterTraces(
    numGroups: number,
    numRealizations: number,
    subplotIndex = 0,
): RealizationScatterTrace[] {
    const traces: RealizationScatterTrace[] = [];
    for (let g = 0; g < numGroups; g++) {
        const rng = seededRandom(g * 1000 + subplotIndex * 100 + 42);
        const realizationIds: number[] = [];
        const xValues: number[] = [];
        const yValues: number[] = [];
        for (let r = 0; r < numRealizations; r++) {
            realizationIds.push(r);
            const x = rng() * 100 + g * 20 + subplotIndex * 5;
            // Correlated y with noise
            const noise = (rng() - 0.5) * 30;
            yValues.push(x * 0.8 + 10 + noise);
            xValues.push(x);
        }
        traces.push({
            name: getEnsembleName(g),
            color: getEnsembleColor(g),
            highlightGroupKey: getEnsembleKey(g),
            realizationIds,
            xValues,
            yValues,
        });
    }
    return traces;
}

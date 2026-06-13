import type {
    BarTrace,
    DistributionTrace,
    HeatmapTrace,
    MemberScatterTrace,
    PointAnnotationTrace,
    ReferenceLineTrace,
    SubplotGroup,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
} from "@modules/_shared/eCharts";
import { computeTimeseriesStatistics } from "@modules/_shared/eCharts";

const COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"];

/**
 * Generates a diverging color (blue → white → red) for a normalized value in [0, 1].
 */
function divergingColor(t: number): string {
    const clamped = Math.max(0, Math.min(1, t));
    let r: number, g: number, b: number;

    if (clamped < 0.5) {
        const s = clamped * 2;
        r = Math.round(59 + s * (255 - 59));
        g = Math.round(76 + s * (255 - 76));
        b = Math.round(192 + s * (255 - 192));
    } else {
        const s = (clamped - 0.5) * 2;
        r = Math.round(255 - s * (255 - 215));
        g = Math.round(255 - s * (255 - 48));
        b = Math.round(255 - s * (255 - 39));
    }

    return `rgb(${r},${g},${b})`;
}

/**
 * Generates synthetic per-member colors using a diverging scale.
 * Simulates a continuous parameter value per member.
 */
export function generateMemberColors(numMembers: number, seed: number): string[] {
    const rng = seededRandom(seed);
    const values = Array.from({ length: numMembers }, () => rng());
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map(function mapParameterToColor(v) {
        return divergingColor((v - min) / range);
    });
}

function getGroupName(groupIndex: number): string {
    return `Group ${String.fromCharCode(65 + groupIndex)}`;
}

function getGroupColor(groupIndex: number): string {
    return COLORS[groupIndex % COLORS.length];
}

function getGroupKey(groupIndex: number): string {
    return `group-${groupIndex}`;
}

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return s / 2147483647;
    };
}

function generateRandomWalk(numSteps: number, numMembers: number, seed: number): number[][] {
    const rng = seededRandom(seed);
    const result: number[][] = [];
    for (let r = 0; r < numMembers; r++) {
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
    numMembers: number,
    numTimesteps = 100,
    colorByParameter = false,
): SubplotGroup<TimeseriesTrace>[] {
    const baseTimestamp = Date.UTC(2020, 0, 1);
    const timestamps = Array.from({ length: numTimesteps }, (_, i) => baseTimestamp + i * 30 * 24 * 3600 * 1000);

    const subplots: SubplotGroup<TimeseriesTrace>[] = [];

    for (let s = 0; s < numSubplots; s++) {
        const traces: TimeseriesTrace[] = [];
        for (let g = 0; g < numGroups; g++) {
            const seed = g * 1000 + s * 100 + 42;
            const memberValues = generateRandomWalk(numTimesteps, numMembers, seed);
            const memberIds = Array.from({ length: numMembers }, (_, i) => i);
            const statistics = computeTimeseriesStatistics(memberValues);

            traces.push({
                name: getGroupName(g),
                color: getGroupColor(g),
                timestamps,
                highlightGroupKey: getGroupKey(g),
                memberValues,
                memberIds,
                memberColors: colorByParameter ? generateMemberColors(numMembers, seed + 7777) : undefined,
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

export function generateReferenceLineTraces(timestamps: number[], subplotIndex = 0): ReferenceLineTrace[] {
    if (timestamps.length === 0) return [];

    const referenceLineLength = Math.max(2, Math.floor(timestamps.length * 0.7));
    const referenceLineTimestamps = timestamps.slice(0, referenceLineLength);
    const rng = seededRandom(6001 + subplotIndex * 73);

    const values: number[] = [];
    let current = 55 + subplotIndex * 1.5;
    for (let i = 0; i < referenceLineTimestamps.length; i++) {
        current += (rng() - 0.52) * 2.4;
        values.push(current);
    }

    return [
        {
            name: "Reference line",
            color: "#111111",
            timestamps: referenceLineTimestamps,
            values,
            lineShape: "linear",
        },
    ];
}

export function generatePointAnnotationTraces(
    timestamps: number[],
    subplotIndex = 0,
    referenceLineTraces?: ReferenceLineTrace[],
): PointAnnotationTrace[] {
    if (timestamps.length === 0) return [];

    const referenceLineTrace = (referenceLineTraces ?? generateReferenceLineTraces(timestamps, subplotIndex))[0];
    if (!referenceLineTrace || referenceLineTrace.timestamps.length < 2) return [];

    const rng = seededRandom(6001 + subplotIndex * 97);
    const numAnnotations = Math.max(5, Math.min(8, Math.floor(referenceLineTrace.timestamps.length / 10)));
    const maxIndex = referenceLineTrace.timestamps.length - 1;
    const step = Math.max(1, Math.floor((maxIndex + 1) / (numAnnotations + 1)));

    const annotations: PointAnnotationTrace["annotations"] = [];
    let previousIndex = -1;
    for (let i = 0; i < numAnnotations; i++) {
        const baseIndex = Math.min(maxIndex, (i + 1) * step);
        const jitter = Math.round((rng() - 0.5) * Math.max(1, step / 2));
        const candidateIndex = Math.max(0, Math.min(maxIndex, baseIndex + jitter));
        const index = Math.max(previousIndex + 1, Math.min(maxIndex, candidateIndex));
        previousIndex = index;

        const baseValue = referenceLineTrace.values[index] ?? referenceLineTrace.values[referenceLineTrace.values.length - 1];
        const value = baseValue + (rng() - 0.5) * 4;
        const error = 2 + rng() * 3;

        annotations.push({
            date: referenceLineTrace.timestamps[index],
            value,
            error,
            label: `Point ${i + 1}`,
            comment: "Synthetic point annotation",
        });

        if (index >= maxIndex) break;
    }

    return [
        {
            name: "Point annotation",
            color: "#111111",
            annotations,
        },
    ];
}

export function generateTimeseriesOverlays(
    groups: SubplotGroup<TimeseriesTrace>[],
    numSubplots: number,
): TimeseriesSubplotOverlays[] {
    return Array.from({ length: numSubplots }, (_, subplotIndex) => {
        const timestamps = groups[subplotIndex]?.traces[0]?.timestamps ?? [];
        const refLines = generateReferenceLineTraces(timestamps, subplotIndex);
        return {
            referenceLineTraces: refLines,
            pointAnnotationTraces: generatePointAnnotationTraces(timestamps, subplotIndex, refLines),
        };
    });
}

export function generateDistributionTraces(
    numGroups: number,
    numMembers: number,
    subplotIndex = 0,
    colorByParameter = false,
): DistributionTrace[] {
    const traces: DistributionTrace[] = [];
    for (let g = 0; g < numGroups; g++) {
        const seed = g * 1000 + subplotIndex * 100 + 7;
        const rng = seededRandom(seed);
        const values: number[] = [];
        const memberIds: number[] = [];
        for (let r = 0; r < numMembers; r++) {
            // Normal-ish distribution via Box-Muller
            const u1 = rng();
            const u2 = rng();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            values.push(50 + g * 10 + subplotIndex * 4 + z * 8);
            memberIds.push(r);
        }
        traces.push({
            name: getGroupName(g),
            color: getGroupColor(g),
            values,
            memberIds,
            memberColors: colorByParameter ? generateMemberColors(numMembers, seed + 7777) : undefined,
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
            name: getGroupName(g),
            color: getGroupColor(g),
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
            title: numSubplots > 1 ? `Group ${s + 1}` : "",
            traces: [
                {
                    name: `Group ${s + 1}`,
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

export function generateMemberScatterTraces(
    numGroups: number,
    numMembers: number,
    subplotIndex = 0,
    colorByParameter = false,
): MemberScatterTrace[] {
    const traces: MemberScatterTrace[] = [];
    for (let g = 0; g < numGroups; g++) {
        const rng = seededRandom(g * 1000 + subplotIndex * 100 + 42);
        const memberIds: number[] = [];
        const xValues: number[] = [];
        const yValues: number[] = [];
        for (let r = 0; r < numMembers; r++) {
            memberIds.push(r);
            const x = rng() * 100 + g * 20 + subplotIndex * 5;
            // Correlated y with noise
            const noise = (rng() - 0.5) * 30;
            yValues.push(x * 0.8 + 10 + noise);
            xValues.push(x);
        }
        const seed = g * 1000 + subplotIndex * 100 + 42;
        traces.push({
            name: getGroupName(g),
            color: getGroupColor(g),
            highlightGroupKey: getGroupKey(g),
            memberIds,
            memberColors: colorByParameter ? generateMemberColors(numMembers, seed + 7777) : undefined,
            xValues,
            yValues,
        });
    }
    return traces;
}

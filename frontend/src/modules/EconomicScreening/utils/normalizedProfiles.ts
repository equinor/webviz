import type { VectorRealizationData_api } from "@api";
import type { RealizationEconomicInput } from "@modules/EconomicScreening/utils/economicCalculations";
import type { RealizationCumulativeSeries } from "@modules/EconomicScreening/utils/vectorResolution";

import { computeAnnualVolumesFromCumulative } from "./economicCalculations";

function hasCompleteCumulativeCoverage(timestampsUtcMs: number[], values: number[]): boolean {
    if (timestampsUtcMs.length !== values.length || timestampsUtcMs.length < 2) {
        return false;
    }

    return timestampsUtcMs.every((timestamp, index) => {
        if (!Number.isFinite(timestamp) || !Number.isFinite(values[index])) {
            return false;
        }
        if (index === 0) return true;
        const previousDate = new Date(timestampsUtcMs[index - 1]);
        const currentDate = new Date(timestamp);
        return (
            timestamp > timestampsUtcMs[index - 1] &&
            currentDate.getUTCFullYear() === previousDate.getUTCFullYear() + 1 &&
            currentDate.getUTCMonth() === previousDate.getUTCMonth() &&
            currentDate.getUTCDate() === previousDate.getUTCDate()
        );
    });
}

/** Converts fetched cumulative vectors into assumption-independent annual realization profiles. */
export function normalizeEconomicProfiles(
    oilProductionData: VectorRealizationData_api[],
    salesGasSeries: RealizationCumulativeSeries[],
): RealizationEconomicInput[] {
    const oilSeriesByRealization = new Map(oilProductionData.map((series) => [series.realization, series]));
    const gasSeriesByRealization = new Map(salesGasSeries.map((series) => [series.realization, series]));
    const realizationNumbers = new Set([...oilSeriesByRealization.keys(), ...gasSeriesByRealization.keys()]);

    return Array.from(realizationNumbers).map((realization) => {
        const oilSeries = oilSeriesByRealization.get(realization);
        const gasSeries = gasSeriesByRealization.get(realization);
        const oilProfile = oilSeries
            ? computeAnnualVolumesFromCumulative(oilSeries.timestampsUtcMs, oilSeries.values)
            : null;
        const gasProfile = gasSeries
            ? computeAnnualVolumesFromCumulative(gasSeries.timestampsUtcMs, gasSeries.values)
            : null;
        const years = Array.from(new Set([...(oilProfile?.years ?? []), ...(gasProfile?.years ?? [])])).sort(
            (firstYear, secondYear) => firstYear - secondYear,
        );
        const oilVolumeByYear = new Map(
            oilProfile?.years.map((year, index) => [year, oilProfile.volumes[index]]) ?? [],
        );
        const gasVolumeByYear = new Map(
            gasProfile?.years.map((year, index) => [year, gasProfile.volumes[index]]) ?? [],
        );

        return {
            realization,
            years,
            oilVolumes: years.map((year) => oilVolumeByYear.get(year) ?? 0),
            salesGasVolumes: years.map((year) => gasVolumeByYear.get(year) ?? 0),
            hasOilData:
                oilSeries !== undefined &&
                hasCompleteCumulativeCoverage(oilSeries.timestampsUtcMs, oilSeries.values) &&
                years.every((year) => oilVolumeByYear.has(year)),
            hasSalesGasData:
                gasSeries !== undefined &&
                hasCompleteCumulativeCoverage(gasSeries.timestampsUtcMs, gasSeries.values) &&
                years.every((year) => gasVolumeByYear.has(year)),
        };
    });
}

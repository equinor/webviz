import type { VectorRealizationData_api } from "@api";
import type { RealizationEconomicInput } from "@modules/EconomicScreening/utils/economicCalculations";
import type { RealizationCumulativeSeries } from "@modules/EconomicScreening/utils/vectorResolution";

import { computeAnnualVolumesFromCumulative } from "./economicCalculations";

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
        const years = oilProfile?.years ?? gasProfile?.years ?? [];
        const oilVolumeByYear = new Map(oilProfile?.years.map((year, index) => [year, oilProfile.volumes[index]]) ?? []);
        const gasVolumeByYear = new Map(gasProfile?.years.map((year, index) => [year, gasProfile.volumes[index]]) ?? []);

        return {
            realization,
            years,
            oilVolumes: years.map((year) => oilVolumeByYear.get(year) ?? 0),
            salesGasVolumes: years.map((year) => gasVolumeByYear.get(year) ?? 0),
            hasOilData: oilSeries !== undefined,
            hasSalesGasData: gasSeries !== undefined,
        };
    });
}
import type { Layout, PlotData } from "plotly.js";

import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { CashFlowProfileType } from "@modules/EconomicScreening/typesAndEnums";
import { makeDisplayScale } from "@modules/EconomicScreening/utils/measureAccessors";
import type { MonthlyRealizationEconomicResult } from "@modules/EconomicScreening/utils/monthlyEconomics";
import {
    aggregateAnnualVolumeProfiles,
    aggregateCashFlowProfiles,
} from "@modules/EconomicScreening/utils/timeProfileAggregation";

export type CashFlowPlotProps = {
    results: MonthlyRealizationEconomicResult[];
    currency: string;
    oilUnit: string;
    gasUnit: string;
    profileType: CashFlowProfileType;
    selectedRealization: number | null;
    /** Year-end marker for the early value; only drawn when the year is on the plotted axis. */
    earlyMarkerYear?: number | null;
    color: string;
    width: number;
    height: number;
};

type AnnualSeries = {
    realization: number;
    years: number[];
    oilVolumes: number[];
    salesGasVolumes: number[];
    hasOilData: boolean;
    hasSalesGasData: boolean;
    netCashFlow: number[] | null;
    cumulativeDiscountedCashFlow: number[] | null;
};

/** Annual values are sums of already-discounted monthly results; nothing is re-discounted here. */
function toAnnualSeries(result: MonthlyRealizationEconomicResult): AnnualSeries {
    const profile = result.annualProfile;
    const hasCashFlow = profile.length > 0 && profile.every((entry) => entry.netCashFlow !== null);
    return {
        realization: result.realization,
        years: profile.map((entry) => entry.year),
        oilVolumes: profile.map((entry) => entry.oilVolume),
        salesGasVolumes: profile.map((entry) => entry.salesGasVolume),
        hasOilData: result.hasOilData,
        hasSalesGasData: result.hasSalesGasData,
        netCashFlow: hasCashFlow ? profile.map((entry) => entry.netCashFlow!) : null,
        cumulativeDiscountedCashFlow: hasCashFlow ? profile.map((entry) => entry.cumulativeDiscountedCashFlow!) : null,
    };
}

function getProfileValues(series: AnnualSeries, profileType: CashFlowProfileType): number[] | null {
    switch (profileType) {
        case CashFlowProfileType.ANNUAL_OIL_VOLUME:
            return series.hasOilData ? series.oilVolumes : null;
        case CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME:
            return series.hasSalesGasData ? series.salesGasVolumes : null;
        case CashFlowProfileType.ANNUAL_NET_CASH_FLOW:
            return series.netCashFlow;
        case CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW:
            return series.cumulativeDiscountedCashFlow;
    }
}

function findRealizationProfile(
    results: MonthlyRealizationEconomicResult[],
    profileType: CashFlowProfileType,
    realization: number | null,
): { series: AnnualSeries; values: number[] } | null {
    const result = results.find((candidate) => candidate.realization === realization);
    if (!result) {
        return null;
    }
    const series = toAnnualSeries(result);
    const values = getProfileValues(series, profileType);
    return values && values.length > 0 && values.length === series.years.length ? { series, values } : null;
}

/** False when the realization is not among the results or lacks complete data for the profile. */
export function hasRealizationProfile(
    results: MonthlyRealizationEconomicResult[],
    profileType: CashFlowProfileType,
    realization: number,
): boolean {
    return findRealizationProfile(results, profileType, realization) !== null;
}

export function CashFlowPlot(props: CashFlowPlotProps): React.ReactNode {
    const annualSeries = props.results.map(toAnnualSeries);
    const cashFlowAggregate = aggregateCashFlowProfiles(
        annualSeries.map((result) => ({
            realization: result.realization,
            years: result.years,
            netCashFlow: result.netCashFlow,
            cumulativeDiscountedCashFlow: result.cumulativeDiscountedCashFlow,
        })),
    );
    const oilAggregate = aggregateAnnualVolumeProfiles(
        annualSeries.map((result) => ({
            realization: result.realization,
            years: result.years,
            values: result.oilVolumes,
            hasData: result.hasOilData,
        })),
    );
    const salesGasAggregate = aggregateAnnualVolumeProfiles(
        annualSeries.map((result) => ({
            realization: result.realization,
            years: result.years,
            values: result.salesGasVolumes,
            hasData: result.hasSalesGasData,
        })),
    );

    const selectedProfile =
        props.profileType === CashFlowProfileType.ANNUAL_OIL_VOLUME && oilAggregate
            ? {
                  aggregate: oilAggregate,
                  band: oilAggregate,
                  name: "Annual oil volume",
                  unit: props.oilUnit,
                  isMoney: false,
              }
            : props.profileType === CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME && salesGasAggregate
              ? {
                    aggregate: salesGasAggregate,
                    band: salesGasAggregate,
                    name: "Annual sales gas volume",
                    unit: props.gasUnit,
                    isMoney: false,
                }
              : props.profileType === CashFlowProfileType.ANNUAL_NET_CASH_FLOW && cashFlowAggregate
                ? {
                      aggregate: cashFlowAggregate,
                      band: cashFlowAggregate.annualNetCashFlow,
                      name: "Annual net cash flow",
                      unit: props.currency,
                      isMoney: true,
                  }
                : props.profileType === CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW && cashFlowAggregate
                  ? {
                        aggregate: cashFlowAggregate,
                        band: cashFlowAggregate.cumulativeDiscountedCashFlow,
                        name: "Cumulative discounted cash flow",
                        unit: props.currency,
                        isMoney: true,
                    }
                  : null;
    if (!selectedProfile) {
        return <ContentInfo>No complete profile data is available for the selected time profile.</ContentInfo>;
    }

    const selectedRealizationProfile = findRealizationProfile(
        props.results,
        props.profileType,
        props.selectedRealization,
    );

    // One scale for every plotted value, so the axis and hover read on the same prefix and decimals.
    const band = selectedProfile.band;
    const displayScale = makeDisplayScale(
        [...band.p10, ...band.p90, ...band.median, ...(selectedRealizationProfile?.values ?? [])],
        selectedProfile.unit,
        selectedProfile.isMoney,
    );
    const scaled = (values: number[]) => values.map((value) => value / displayScale.factor);

    const data: Partial<PlotData>[] = [
        {
            x: selectedProfile.aggregate.years,
            y: scaled(band.p10),
            type: "scatter",
            mode: "lines",
            name: "P10",
            line: { color: props.color, width: 0 },
            showlegend: false,
        },
        {
            x: selectedProfile.aggregate.years,
            y: scaled(band.p90),
            type: "scatter",
            mode: "lines",
            name: "P90-P10",
            fill: "tonexty",
            fillcolor: `${props.color}33`,
            line: { color: props.color, width: 0 },
        },
        {
            x: selectedProfile.aggregate.years,
            y: scaled(band.median),
            type: "scatter",
            mode: "lines+markers",
            name: "P50",
            line: { color: props.color, width: 2 },
        },
        ...(selectedRealizationProfile
            ? [
                  {
                      x: selectedRealizationProfile.series.years,
                      y: scaled(selectedRealizationProfile.values),
                      type: "scatter" as const,
                      mode: "lines+markers" as const,
                      name: `Realization ${selectedRealizationProfile.series.realization}`,
                      line: { color: "#111827", width: 3 },
                  },
              ]
            : []),
    ];

    // Whole calendar years only, without thousands separators, in ticks and hover labels.
    const years = selectedProfile.aggregate.years;
    const yearTickStep = Math.max(1, Math.ceil(years.length / 12));
    // Each plotted point is the cumulative value at the end of its year, so the marker sits on that point.
    const markerYear =
        props.earlyMarkerYear !== null && props.earlyMarkerYear !== undefined && years.includes(props.earlyMarkerYear)
            ? props.earlyMarkerYear
            : null;
    const isMarkerInRightHalf = markerYear !== null && markerYear - years[0] > (years[years.length - 1] - years[0]) / 2;
    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        margin: { l: 70, r: 20, t: 20, b: 50 },
        xaxis: { title: { text: "Year" }, tickformat: "d", hoverformat: "d", dtick: yearTickStep },
        yaxis: {
            title: { text: `${selectedProfile.name} [${displayScale.unit}]` },
            zeroline: true,
            exponentformat: "none",
            hoverformat: `.${displayScale.numDecimalPlaces}f`,
        },
        showlegend: true,
        // Above the plot area, where it cannot cover the year ticks or axis title; the top margin grows to fit it.
        legend: { x: 0, xanchor: "left", y: 1, yanchor: "bottom" },
        shapes:
            markerYear === null
                ? []
                : [
                      {
                          type: "line",
                          xref: "x",
                          yref: "paper",
                          x0: markerYear,
                          x1: markerYear,
                          y0: 0,
                          y1: 1,
                          line: { color: "#6b7280", width: 1, dash: "dot" },
                      },
                  ],
        annotations:
            markerYear === null
                ? []
                : [
                      {
                          xref: "x",
                          yref: "paper",
                          x: markerYear,
                          y: 1,
                          xanchor: isMarkerInRightHalf ? "right" : "left",
                          xshift: isMarkerInRightHalf ? -4 : 4,
                          yanchor: "top",
                          text: `Early value through ${markerYear}`,
                          showarrow: false,
                          font: { size: 11, color: "#374151" },
                          bgcolor: "rgba(255, 255, 255, 0.85)",
                      },
                  ],
    };

    return <Plot data={data} layout={layout} />;
}

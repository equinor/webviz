import type { Layout, PlotData } from "plotly.js";

import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { CashFlowProfileType } from "@modules/EconomicScreening/typesAndEnums";
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
            ? { aggregate: oilAggregate, band: oilAggregate, name: "Annual oil volume", unit: props.oilUnit }
            : props.profileType === CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME && salesGasAggregate
                ? { aggregate: salesGasAggregate, band: salesGasAggregate, name: "Annual sales gas volume", unit: props.gasUnit }
                : props.profileType === CashFlowProfileType.ANNUAL_NET_CASH_FLOW && cashFlowAggregate
                    ? {
                        aggregate: cashFlowAggregate,
                        band: cashFlowAggregate.annualNetCashFlow,
                        name: "Annual net cash flow",
                        unit: props.currency,
                    }
                    : props.profileType === CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW && cashFlowAggregate
                        ? {
                            aggregate: cashFlowAggregate,
                            band: cashFlowAggregate.cumulativeDiscountedCashFlow,
                            name: "Cumulative discounted cash flow",
                            unit: props.currency,
                        }
                        : null;
    if (!selectedProfile) {
        return <ContentInfo>No complete profile data is available for the selected time profile.</ContentInfo>;
    }

    const selectedResult = annualSeries.find((result) => result.realization === props.selectedRealization);
    const selectedValues =
        selectedResult &&
        (props.profileType === CashFlowProfileType.ANNUAL_OIL_VOLUME
            ? selectedResult.hasOilData
                ? selectedResult.oilVolumes
                : null
            : props.profileType === CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME
                ? selectedResult.hasSalesGasData
                    ? selectedResult.salesGasVolumes
                    : null
                : props.profileType === CashFlowProfileType.ANNUAL_NET_CASH_FLOW
                    ? selectedResult.netCashFlow
                    : (selectedResult.cumulativeDiscountedCashFlow ?? null));

    const data: Partial<PlotData>[] = [
        {
            x: selectedProfile.aggregate.years,
            y: selectedProfile.band.p10,
            type: "scatter",
            mode: "lines",
            name: "P10",
            line: { color: props.color, width: 0 },
            showlegend: false,
        },
        {
            x: selectedProfile.aggregate.years,
            y: selectedProfile.band.p90,
            type: "scatter",
            mode: "lines",
            name: "P90-P10",
            fill: "tonexty",
            fillcolor: `${props.color}33`,
            line: { color: props.color, width: 0 },
        },
        {
            x: selectedProfile.aggregate.years,
            y: selectedProfile.band.median,
            type: "scatter",
            mode: "lines+markers",
            name: "P50",
            line: { color: props.color, width: 2 },
        },
        ...(selectedResult && selectedValues && selectedValues.length === selectedResult.years.length
            ? [
                {
                    x: selectedResult.years,
                    y: selectedValues,
                    type: "scatter" as const,
                    mode: "lines+markers" as const,
                    name: `Realization ${selectedResult.realization}`,
                    line: { color: "#111827", width: 3 },
                },
            ]
            : []),
    ];

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        margin: { l: 70, r: 20, t: 20, b: 50 },
        xaxis: { title: { text: "Year" } },
        yaxis: { title: { text: `${selectedProfile.name} [${selectedProfile.unit}]` }, zeroline: true },
        showlegend: true,
    };

    return <Plot data={data} layout={layout} />;
}

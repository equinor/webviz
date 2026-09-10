import type { Layout, PlotData } from "plotly.js";

import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { Plot } from "@modules/_shared/components/Plot";
import { CashFlowProfileType } from "@modules/EconomicScreening/typesAndEnums";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";
import {
    aggregateAnnualVolumeProfiles,
    aggregateCashFlowProfiles,
} from "@modules/EconomicScreening/utils/timeProfileAggregation";

export type CashFlowPlotProps = {
    results: RealizationEconomicResult[];
    currency: string;
    oilUnit: string;
    gasUnit: string;
    profileType: CashFlowProfileType;
    selectedRealization: number | null;
    color: string;
    width: number;
    height: number;
};

export function CashFlowPlot(props: CashFlowPlotProps): React.ReactNode {
    const cashFlowAggregate = aggregateCashFlowProfiles(
        props.results.map((result) => ({
            realization: result.realization,
            years: result.years,
            netCashFlow: result.netCashFlow,
            cumulativeDiscountedCashFlow: result.cumulativeDiscountedCashFlow ?? null,
        })),
    );
    const oilAggregate = aggregateAnnualVolumeProfiles(
        props.results.map((result) => ({
            realization: result.realization,
            years: result.years,
            values: result.oilVolumes,
            hasData: result.hasOilData,
        })),
    );
    const salesGasAggregate = aggregateAnnualVolumeProfiles(
        props.results.map((result) => ({
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

    const selectedResult = props.results.find((result) => result.realization === props.selectedRealization);
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

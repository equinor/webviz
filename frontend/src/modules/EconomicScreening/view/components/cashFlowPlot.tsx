import type { Layout, PlotData } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import { computeQuantile } from "@modules/_shared/utils/math/statistics";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";

export type CashFlowPlotProps = {
    results: RealizationEconomicResult[];
    currency: string;
    color: string;
    width: number;
    height: number;
};

type YearAggregates = {
    years: number[];
    meanCashFlow: number[];
    p10CashFlow: number[];
    p90CashFlow: number[];
    meanCumulativeDiscounted: number[];
};

function aggregateByYear(results: RealizationEconomicResult[]): YearAggregates {
    const cashFlowByYear = new Map<number, number[]>();
    const cumulativeDiscountedByYear = new Map<number, number[]>();

    for (const result of results) {
        if (!result.netCashFlow) {
            continue;
        }
        let runningDiscounted = 0;
        for (let i = 0; i < result.years.length; i++) {
            const year = result.years[i];
            runningDiscounted += result.netCashFlow[i] * result.discountFactors[i];

            const cashFlowValues = cashFlowByYear.get(year) ?? [];
            cashFlowValues.push(result.netCashFlow[i]);
            cashFlowByYear.set(year, cashFlowValues);

            const cumulativeValues = cumulativeDiscountedByYear.get(year) ?? [];
            cumulativeValues.push(runningDiscounted);
            cumulativeDiscountedByYear.set(year, cumulativeValues);
        }
    }

    const years = Array.from(cashFlowByYear.keys()).sort((a, b) => a - b);
    const mean = (values: number[]) => values.reduce((acc, value) => acc + value, 0) / values.length;

    return {
        years,
        meanCashFlow: years.map((year) => mean(cashFlowByYear.get(year) ?? [0])),
        p10CashFlow: years.map((year) => computeQuantile(cashFlowByYear.get(year) ?? [0], 0.9)),
        p90CashFlow: years.map((year) => computeQuantile(cashFlowByYear.get(year) ?? [0], 0.1)),
        meanCumulativeDiscounted: years.map((year) => mean(cumulativeDiscountedByYear.get(year) ?? [0])),
    };
}

export function CashFlowPlot(props: CashFlowPlotProps): React.ReactNode {
    const aggregates = aggregateByYear(props.results);

    const data: Partial<PlotData>[] = [
        {
            x: aggregates.years,
            y: aggregates.meanCashFlow,
            type: "bar",
            name: "Mean net cash flow",
            marker: { color: props.color },
            error_y: {
                type: "data",
                symmetric: false,
                array: aggregates.p10CashFlow.map((value, i) => value - aggregates.meanCashFlow[i]),
                arrayminus: aggregates.meanCashFlow.map((value, i) => value - aggregates.p90CashFlow[i]),
                color: "#555",
                thickness: 1,
            },
        },
        {
            x: aggregates.years,
            y: aggregates.meanCumulativeDiscounted,
            type: "scatter",
            mode: "lines+markers",
            name: "Mean cumulative discounted cash flow",
            line: { color: "#333", width: 2 },
            yaxis: "y2",
        },
    ];

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        margin: { l: 70, r: 70, t: 20, b: 50 },
        xaxis: { title: { text: "Year" } },
        yaxis: { title: { text: `Net cash flow [${props.currency}]` } },
        yaxis2: {
            title: { text: `Cumulative discounted [${props.currency}]` },
            overlaying: "y",
            side: "right",
        },
        showlegend: true,
    };

    return <Plot data={data} layout={layout} />;
}

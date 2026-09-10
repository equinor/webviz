import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { getMeasureUnit, getMeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";

import type { Interfaces } from "../interfaces";

import {
    distributionPlotTypeAtom,
    discountAssumptionsAtom,
    ensembleIdentAtom,
    evaluationWindowAtom,
    priceAssumptionsAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./atoms/baseAtoms";
import { economicScreeningResultsAtom, isFetchingAtom } from "./atoms/derivedAtoms";
import { CashFlowPlot } from "./components/cashFlowPlot";
import { MeasureChannelPublisher } from "./components/measureChannelPublisher";
import { MeasureDistributionPlot } from "./components/measureDistributionPlot";
import { ResultsStatisticsTable } from "./components/resultsStatisticsTable";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";

const TABLE_AREA_HEIGHT_PX = 300;

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const ensembleIdent = useAtomValue(ensembleIdentAtom);
    const selectedMeasure = useAtomValue(selectedMeasureAtom);
    const distributionPlotType = useAtomValue(distributionPlotTypeAtom);
    const showCashFlowPlot = useAtomValue(showCashFlowPlotAtom);
    const discountAssumptions = useAtomValue(discountAssumptionsAtom);
    const evaluationWindow = useAtomValue(evaluationWindowAtom);
    const priceAssumptions = useAtomValue(priceAssumptionsAtom);
    const isFetching = useAtomValue(isFetchingAtom);
    const { results, oilUnit, gasUnit } = useAtomValue(economicScreeningResultsAtom);

    useMakeViewStatusWriterMessages(statusWriter);
    statusWriter.setLoading(isFetching);

    const ensemble = ensembleIdent ? ensembleSet.findEnsemble(ensembleIdent) : null;
    const ensembleDisplayName = ensemble?.getDisplayName() ?? "";
    const ensembleColor = ensemble?.getColor() ?? "#1f77b4";

    const unitContext = { oilUnit, gasUnit, currency: priceAssumptions.currency };
    const measureValues = getMeasureValues(results, selectedMeasure);

    const plotHeight = Math.max(wrapperDivSize.height - TABLE_AREA_HEIGHT_PX, 200);
    const cashFlowPlotHeight = showCashFlowPlot ? plotHeight / 2 : 0;
    const distributionPlotHeight = showCashFlowPlot ? plotHeight / 2 : plotHeight;

    const hasResults = results.length > 0;
    const hasNetCashFlow = results.some((result) => result.netCashFlow !== null);
    const availableYears = results.flatMap((result) => result.years);
    const valuationYear = discountAssumptions.baseYear ?? Math.min(...availableYears);
    const evaluationYears =
        evaluationWindow.firstYear !== null && evaluationWindow.lastYear !== null
            ? `${evaluationWindow.firstYear}-${evaluationWindow.lastYear}`
            : "All available years";
    const excludedProducts = [
        priceAssumptions.excludeOilRevenue ? "oil" : null,
        priceAssumptions.excludeGasRevenue ? "gas" : null,
    ].filter((product): product is string => product !== null);
    const activeAssumptions = [
        `Discount rate ${discountAssumptions.discountRatePercent}%`,
        `Valuation 1 Jan ${valuationYear}`,
        `Evaluation ${evaluationYears}`,
        excludedProducts.length > 0 ? `Excluded revenue: ${excludedProducts.join(", ")}` : null,
    ].filter((assumption): assumption is string => assumption !== null);

    return (
        <div className="h-full w-full overflow-auto" ref={wrapperDivRef}>
            {Object.values(EconomicMeasure).map((measure) => (
                <MeasureChannelPublisher
                    key={measure}
                    viewContext={props.viewContext}
                    measure={measure}
                    results={results}
                    unitContext={unitContext}
                    ensembleIdentString={ensembleIdent?.toString() ?? ""}
                    ensembleDisplayName={ensembleDisplayName}
                    color={ensembleColor}
                    enabled={!isFetching && hasResults}
                />
            ))}

            {isFetching && (
                <div className="gap-x-xs flex h-full w-full items-center justify-center">
                    <CircularProgress size={32} />
                    <span>Loading summary data...</span>
                </div>
            )}

            {!isFetching && !hasResults && (
                <ContentInfo>Select an ensemble with FOPT available to compute economic results.</ContentInfo>
            )}

            {!isFetching && hasResults && (
                <div className="gap-y-sm flex flex-col p-2">
                    <div className="text-sm font-bold">{ensembleDisplayName}</div>
                    <div className="text-body-xs text-subtle">{activeAssumptions.join(" | ")}</div>
                    <ResultsStatisticsTable results={results} unitContext={unitContext} />
                    <MeasureDistributionPlot
                        measure={selectedMeasure}
                        measureValues={measureValues}
                        unit={getMeasureUnit(selectedMeasure, unitContext)}
                        plotType={distributionPlotType}
                        color={ensembleColor}
                        width={wrapperDivSize.width - 16}
                        height={distributionPlotHeight}
                    />
                    {showCashFlowPlot && hasNetCashFlow && (
                        <CashFlowPlot
                            results={results}
                            currency={priceAssumptions.currency}
                            color={ensembleColor}
                            width={wrapperDivSize.width - 16}
                            height={cashFlowPlotHeight}
                        />
                    )}
                    {showCashFlowPlot && !hasNetCashFlow && (
                        <ContentInfo>Provide an oil or gas price to see the cash flow profile.</ContentInfo>
                    )}
                </div>
            )}
        </div>
    );
}

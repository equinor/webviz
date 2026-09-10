import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Combobox } from "@lib/components/Combobox";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { CashFlowProfileType, EarlyEconomicMeasure, EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { countPositiveNpvAtBreakEvenTarget } from "@modules/EconomicScreening/utils/distributionAggregation";
import { getMeasureUnit, getMeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";

import type { Interfaces } from "../interfaces";

import {
    distributionPlotTypeAtom,
    cashFlowProfileTypeAtom,
    discountAssumptionsAtom,
    earlyValueConfigurationAtom,
    ensembleIdentAtom,
    evaluationWindowAtom,
    priceAssumptionsAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./atoms/baseAtoms";
import { economicScreeningResultsAtom, isFetchingAtom } from "./atoms/derivedAtoms";
import { CashFlowPlot } from "./components/cashFlowPlot";
import { EarlyMeasureChannelPublisher } from "./components/earlyMeasureChannelPublisher";
import { MeasureChannelPublisher } from "./components/measureChannelPublisher";
import { MeasureDistributionPlot } from "./components/measureDistributionPlot";
import { RealizationResultsTable } from "./components/realizationResultsTable";
import { ResultsStatisticsTable } from "./components/resultsStatisticsTable";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";

const TABLE_AREA_HEIGHT_PX = 300;

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const [selectedProfileRealization, setSelectedProfileRealization] = React.useState<number | null>(null);

    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const ensembleIdent = useAtomValue(ensembleIdentAtom);
    const selectedMeasure = useAtomValue(selectedMeasureAtom);
    const distributionPlotType = useAtomValue(distributionPlotTypeAtom);
    const showCashFlowPlot = useAtomValue(showCashFlowPlotAtom);
    const cashFlowProfileType = useAtomValue(cashFlowProfileTypeAtom);
    const discountAssumptions = useAtomValue(discountAssumptionsAtom);
    const evaluationWindow = useAtomValue(evaluationWindowAtom);
    const earlyValueConfiguration = useAtomValue(earlyValueConfigurationAtom);
    const earlyValueEndYear = earlyValueConfiguration.endYear;
    const priceAssumptions = useAtomValue(priceAssumptionsAtom);
    const isFetching = useAtomValue(isFetchingAtom);
    const { results, oilUnit, gasUnit } = useAtomValue(economicScreeningResultsAtom);

    useMakeViewStatusWriterMessages(statusWriter);
    statusWriter.setLoading(isFetching);

    const ensemble = ensembleIdent ? ensembleSet.findEnsemble(ensembleIdent) : null;
    const ensembleDisplayName = ensemble?.getDisplayName() ?? "";
    const ensembleColor = ensemble?.getColor() ?? "#1f77b4";

    const unitContext = {
        oilUnit,
        gasUnit,
        currency: priceAssumptions.currency,
        oilPriceBasis: priceAssumptions.oilPriceBasis,
    };
    const measureValues = getMeasureValues(results, selectedMeasure, unitContext);
    const breakEvenMeasureValues = getMeasureValues(results, EconomicMeasure.BREAK_EVEN_OIL_PRICE, unitContext);
    const breakEvenValuesByRealization = new Map(
        breakEvenMeasureValues.realizations.map((realization, index) => [realization, breakEvenMeasureValues.values[index]]),
    );
    const breakEvenTargetCount =
        priceAssumptions.oilPrice === null
            ? null
            : countPositiveNpvAtBreakEvenTarget(
                results.map((result) => ({
                    discountedOilVolume: result.discountedOilVolume,
                    breakEvenOilPrice: breakEvenValuesByRealization.get(result.realization) ?? null,
                })),
                priceAssumptions.oilPrice,
            );

    const plotHeight = Math.max(wrapperDivSize.height - TABLE_AREA_HEIGHT_PX, 200);
    const cashFlowPlotHeight = showCashFlowPlot ? plotHeight / 2 : 0;
    const distributionPlotHeight = showCashFlowPlot ? plotHeight / 2 : plotHeight;

    const hasResults = results.length > 0;
    const hasNetCashFlow = results.some((result) => result.netCashFlow !== null);
    const hasSelectedTimeProfileData =
        cashFlowProfileType === CashFlowProfileType.ANNUAL_OIL_VOLUME
            ? results.some((result) => result.hasOilData)
            : cashFlowProfileType === CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME
                ? results.some((result) => result.hasSalesGasData)
                : hasNetCashFlow;
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
                    assumptionContext={activeAssumptions.join("; ")}
                />
            ))}
            {earlyValueConfiguration.enabled && earlyValueEndYear !== null &&
                Object.values(EarlyEconomicMeasure).map((measure) => (
                    <EarlyMeasureChannelPublisher
                        key={measure}
                        viewContext={props.viewContext}
                        measure={measure}
                        results={results}
                        endYear={earlyValueEndYear}
                        unit={
                            measure === EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME
                                ? oilUnit
                                : measure === EarlyEconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME
                                    ? gasUnit
                                    : priceAssumptions.currency
                        }
                        ensembleIdentString={ensembleIdent?.toString() ?? ""}
                        ensembleDisplayName={ensembleDisplayName}
                        color={ensembleColor}
                        enabled={!isFetching && hasResults}
                        assumptionContext={activeAssumptions.join("; ")}
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
                    <ResultsStatisticsTable
                        measure={selectedMeasure}
                        measureValues={measureValues}
                        unit={getMeasureUnit(selectedMeasure, unitContext)}
                        breakEvenTargetCount={breakEvenTargetCount}
                    />
                    <RealizationResultsTable
                        results={results}
                        unitContext={unitContext}
                        selectedRealization={selectedProfileRealization}
                        onSelectedRealizationChange={setSelectedProfileRealization}
                    />
                    <MeasureDistributionPlot
                        measure={selectedMeasure}
                        measureValues={measureValues}
                        unit={getMeasureUnit(selectedMeasure, unitContext)}
                        plotType={distributionPlotType}
                        color={ensembleColor}
                        width={wrapperDivSize.width - 16}
                        height={distributionPlotHeight}
                        targetValue={
                            selectedMeasure === EconomicMeasure.BREAK_EVEN_OIL_PRICE ? priceAssumptions.oilPrice : null
                        }
                    />
                    {showCashFlowPlot && hasSelectedTimeProfileData && (
                        <>
                            <div className="flex max-w-64 items-center gap-2">
                                <label className="text-body-xs shrink-0" htmlFor="economic-screening-realization">
                                    Realization
                                </label>
                                <Combobox<number>
                                    id="economic-screening-realization"
                                    items={results.map((result) => ({
                                        value: result.realization,
                                        label: result.realization.toString(),
                                    }))}
                                    value={selectedProfileRealization}
                                    onValueChange={setSelectedProfileRealization}
                                    showClearAllButton
                                    placeholder="Aggregate"
                                />
                            </div>
                            <CashFlowPlot
                                results={results}
                                currency={priceAssumptions.currency}
                                profileType={cashFlowProfileType}
                                selectedRealization={selectedProfileRealization}
                                oilUnit={oilUnit}
                                gasUnit={gasUnit}
                                color={ensembleColor}
                                width={wrapperDivSize.width - 16}
                                height={cashFlowPlotHeight}
                            />
                        </>
                    )}
                    {showCashFlowPlot && !hasSelectedTimeProfileData && (
                        <ContentInfo>No complete profile data is available for the selected time profile.</ContentInfo>
                    )}
                </div>
            )}
        </div>
    );
}

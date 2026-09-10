import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Combobox } from "@lib/components/Combobox";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { CashFlowProfileType, EarlyEconomicMeasure, EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { countPositiveNpvAtTarget } from "@modules/EconomicScreening/utils/distributionAggregation";
import { getMeasureUnit, getMeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import { convertOilPriceToSimulatorUnit } from "@modules/EconomicScreening/utils/unitConversion";

import type { Interfaces } from "../interfaces";

import {
    distributionPlotTypeAtom,
    cashFlowProfileTypeAtom,
    discountAssumptionsAtom,
    earlyValueConfigurationAtom,
    ensembleIdentAtom,
    evaluationWindowAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    selectedMeasureAtom,
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

enum ViewMode {
    DISTRIBUTION = "DISTRIBUTION",
    TIME_PROFILE = "TIME_PROFILE",
}

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const [selectedProfileRealization, setSelectedProfileRealization] = React.useState<number | null>(null);
    const [viewMode, setViewMode] = React.useState<ViewMode>(ViewMode.DISTRIBUTION);

    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const ensembleIdent = useAtomValue(ensembleIdentAtom);
    const selectedMeasure = useAtomValue(selectedMeasureAtom);
    const distributionPlotType = useAtomValue(distributionPlotTypeAtom);
    const cashFlowProfileType = useAtomValue(cashFlowProfileTypeAtom);
    const discountAssumptions = useAtomValue(discountAssumptionsAtom);
    const evaluationWindow = useAtomValue(evaluationWindowAtom);
    const earlyValueConfiguration = useAtomValue(earlyValueConfigurationAtom);
    const earlyValueEndYear = earlyValueConfiguration.endYear;
    const isCostProfileDraftValid = useAtomValue(isCostProfileDraftValidAtom);
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
    const targetOilPricePerVolume =
        priceAssumptions.oilPrice === null
            ? null
            : convertOilPriceToSimulatorUnit(priceAssumptions.oilPrice, priceAssumptions.oilPriceBasis, oilUnit);
    const breakEvenTargetCount =
        targetOilPricePerVolume === null
            ? null
            : countPositiveNpvAtTarget(
                results.map((result) =>
                    result.npv === null
                        ? Number.NaN
                        : result.npv +
                          result.discountedOilVolume *
                              (targetOilPricePerVolume -
                                  (priceAssumptions.excludeOilRevenue ? 0 : targetOilPricePerVolume)),
                ),
            );

    const plotHeight = Math.max(wrapperDivSize.height - TABLE_AREA_HEIGHT_PX, 200);
    const activePlotHeight = plotHeight;

    const hasResults = results.length > 0;
    const hasNetCashFlow = results.some((result) => result.netCashFlow !== null);
    const hasSelectedTimeProfileData =
        cashFlowProfileType === CashFlowProfileType.ANNUAL_OIL_VOLUME
            ? results.some((result) => result.hasOilData)
            : cashFlowProfileType === CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME
                ? results.some((result) => result.hasSalesGasData)
                : hasNetCashFlow;
    const availableYears = results.flatMap((result) => result.years);
    const valuationYear = results[0]?.valuationYear ?? discountAssumptions.baseYear ?? Math.min(...availableYears);
    const evaluationYears =
        evaluationWindow.firstYear !== null && evaluationWindow.lastYear !== null
            ? `${evaluationWindow.firstYear}-${evaluationWindow.lastYear}`
            : evaluationWindow.firstYear !== null
                ? `${evaluationWindow.firstYear} onward`
                : evaluationWindow.lastYear !== null
                    ? `through ${evaluationWindow.lastYear}`
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
                    enabled={
                        !isFetching &&
                        hasResults &&
                        (isCostProfileDraftValid ||
                            ![
                                EconomicMeasure.NPV,
                                EconomicMeasure.IRR,
                                EconomicMeasure.BREAK_EVEN_OIL_PRICE,
                            ].includes(measure))
                    }
                    assumptionContext={activeAssumptions.join("; ")}
                />
            ))}
            {Object.values(EarlyEconomicMeasure).map((measure) => (
                    <EarlyMeasureChannelPublisher
                        key={measure}
                        viewContext={props.viewContext}
                        measure={measure}
                        results={results}
                        endYear={earlyValueEndYear ?? 0}
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
                        enabled={
                            !isFetching &&
                            hasResults &&
                            isCostProfileDraftValid &&
                            earlyValueConfiguration.enabled &&
                            earlyValueEndYear !== null
                        }
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
                        results={results}
                        unit={getMeasureUnit(selectedMeasure, unitContext)}
                        breakEvenTargetCount={breakEvenTargetCount}
                    />
                    <RealizationResultsTable
                        results={results}
                        unitContext={unitContext}
                        selectedRealization={selectedProfileRealization}
                        onSelectedRealizationChange={setSelectedProfileRealization}
                    />
                    <RadioCompositions.GroupWithLabels
                        value={viewMode}
                        options={[
                            { value: ViewMode.DISTRIBUTION, label: "Distribution" },
                            { value: ViewMode.TIME_PROFILE, label: "Time profile" },
                        ]}
                        onValueChange={setViewMode}
                        layout="horizontal"
                        size="small"
                    />
                    {viewMode === ViewMode.DISTRIBUTION && (
                        <MeasureDistributionPlot
                            measure={selectedMeasure}
                            measureValues={measureValues}
                            unit={getMeasureUnit(selectedMeasure, unitContext)}
                            plotType={distributionPlotType}
                            color={ensembleColor}
                            width={wrapperDivSize.width - 16}
                            height={activePlotHeight}
                            targetValue={
                                selectedMeasure === EconomicMeasure.BREAK_EVEN_OIL_PRICE
                                    ? priceAssumptions.oilPrice
                                    : null
                            }
                        />
                    )}
                    {viewMode === ViewMode.TIME_PROFILE && hasSelectedTimeProfileData && (
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
                                height={activePlotHeight}
                            />
                        </>
                    )}
                    {viewMode === ViewMode.TIME_PROFILE && !hasSelectedTimeProfileData && (
                        <ContentInfo>No complete profile data is available for the selected time profile.</ContentInfo>
                    )}
                </div>
            )}
        </div>
    );
}

import React from "react";

import { useAtomValue } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import {
    CashFlowProfileType,
    EarlyEconomicMeasure,
    EconomicMeasure,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";
import { countPositiveNpvAtTarget } from "@modules/EconomicScreening/utils/distributionAggregation";
import { getMeasureUnit, getMeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import { SourceStatus } from "@modules/EconomicScreening/utils/sourceSnapshot";

import type { Interfaces } from "../interfaces";

import {
    cashFlowProfileTypeAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    economicAssumptionsAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    resultModeAtom,
    selectedMeasureAtom,
    selectedRealizationAtom,
    sourceSnapshotAtom,
} from "./atoms/baseAtoms";
import { economicScreeningResultsAtom } from "./atoms/derivedAtoms";
import { CashFlowPlot, hasRealizationProfile } from "./components/cashFlowPlot";
import { EarlyMeasureChannelPublisher } from "./components/earlyMeasureChannelPublisher";
import { MeasureChannelPublisher } from "./components/measureChannelPublisher";
import { MeasureDistributionPlot } from "./components/measureDistributionPlot";
import { RealizationResultsTable } from "./components/realizationResultsTable";
import { ResultsStatisticsTable } from "./components/resultsStatisticsTable";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";

const MIN_PLOT_HEIGHT_PX = 200;

/** Fills the space left below the context and tables; its size drives the plot size. */
function ResponsivePlotArea(props: { children: (width: number, height: number) => React.ReactNode }) {
    const areaRef = React.useRef<HTMLDivElement>(null);
    const areaSize = useElementSize(areaRef);
    return (
        <div ref={areaRef} className="min-h-52 flex-1 overflow-hidden">
            {props.children(areaSize.width, Math.max(areaSize.height, MIN_PLOT_HEIGHT_PX))}
        </div>
    );
}

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const sourceSnapshot = useAtomValue(sourceSnapshotAtom);
    const resultMode = useAtomValue(resultModeAtom);
    const selectedMeasure = useAtomValue(selectedMeasureAtom);
    const distributionPlotType = useAtomValue(distributionPlotTypeAtom);
    const cashFlowProfileType = useAtomValue(cashFlowProfileTypeAtom);
    const selectedRealization = useAtomValue(selectedRealizationAtom);
    const economicAssumptions = useAtomValue(economicAssumptionsAtom);
    const earlyValueConfiguration = useAtomValue(earlyValueConfigurationAtom);
    const earlyValueEndYear = earlyValueConfiguration.endYear;
    const isCostProfileDraftValid = useAtomValue(isCostProfileDraftValidAtom);
    const priceAssumptions = useAtomValue(priceAssumptionsAtom);
    const { results, oilUnit, gasUnit, isEarlyValueConfigurationValid, horizon } =
        useAtomValue(economicScreeningResultsAtom);

    const isFetching = sourceSnapshot.isFetching || sourceSnapshot.status === SourceStatus.LOADING;
    useMakeViewStatusWriterMessages(statusWriter);
    statusWriter.setLoading(isFetching);

    const ensembleIdent = sourceSnapshot.ensembleIdent;
    const ensemble = ensembleIdent ? ensembleSet.findEnsemble(ensembleIdent) : null;
    const ensembleDisplayName = ensemble?.getDisplayName() ?? "";
    const ensembleColor = ensemble?.getColor() ?? "#1f77b4";
    const isDeltaEnsemble = Boolean(ensembleIdent && isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent));
    const instanceTitle = ensembleDisplayName ? `Economic screening - ${ensembleDisplayName}` : "Economic screening";

    React.useEffect(
        function updateInstanceTitle() {
            props.viewContext.setInstanceTitle(instanceTitle);
        },
        [instanceTitle, props.viewContext],
    );

    const currency = priceAssumptions.currency;
    const unitContext = {
        oilUnit,
        gasUnit,
        currency,
        oilPriceBasis: priceAssumptions.oilPriceBasis,
    };
    const measureValues = getMeasureValues(results, selectedMeasure, unitContext);
    const breakEvenTargetCount =
        priceAssumptions.oilPrice === null
            ? null
            : countPositiveNpvAtTarget(results.map((result) => result.npv ?? Number.NaN));

    const hasResults = results.length > 0;
    const hasNetCashFlow = results.some((result) => result.npv !== null);
    const hasSelectedTimeProfileData =
        cashFlowProfileType === CashFlowProfileType.ANNUAL_OIL_VOLUME
            ? results.some((result) => result.hasOilData)
            : cashFlowProfileType === CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME
              ? results.some((result) => result.hasSalesGasData)
              : hasNetCashFlow;
    const isSelectedRealizationUnavailable =
        selectedRealization !== null && !hasRealizationProfile(results, cashFlowProfileType, selectedRealization);
    const activeAssumptions = [
        `Discount rate ${economicAssumptions.discountRatePercent}%`,
        horizon ? `Valuation 1 Jan ${horizon.startYear}` : null,
        horizon ? `Evaluation ${horizon.startYear}-${horizon.endYear}` : null,
        "Monthly production, revenue and OPEX; mid-year CAPEX",
        `Currency ${currency}`,
    ].filter((assumption): assumption is string => assumption !== null);
    const pendingMessage =
        economicAssumptions.predictionStartYear === null
            ? "Enter a prediction start year in the settings to calculate results."
            : null;

    return (
        <div className="h-full w-full overflow-auto">
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
                            ![EconomicMeasure.NPV, EconomicMeasure.IRR, EconomicMeasure.BREAK_EVEN_OIL_PRICE].includes(
                                measure,
                            ))
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
                              : currency
                    }
                    ensembleIdentString={ensembleIdent?.toString() ?? ""}
                    ensembleDisplayName={ensembleDisplayName}
                    color={ensembleColor}
                    enabled={
                        !isFetching &&
                        hasResults &&
                        isCostProfileDraftValid &&
                        earlyValueConfiguration.enabled &&
                        isEarlyValueConfigurationValid &&
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
                <ContentInfo>
                    {pendingMessage ??
                        "Select an ensemble with oil or sales-gas production data to compute economic results."}
                </ContentInfo>
            )}

            {!isFetching && hasResults && (
                <div className="gap-y-sm flex h-full min-h-0 flex-col p-2">
                    <div className="text-body-xs text-subtle">{activeAssumptions.join(" | ")}</div>
                    {resultMode === ResultMode.DISTRIBUTION && (
                        <>
                            <ResultsStatisticsTable
                                measure={selectedMeasure}
                                measureValues={measureValues}
                                results={results}
                                unit={getMeasureUnit(selectedMeasure, unitContext)}
                                breakEvenTargetCount={breakEvenTargetCount}
                                isDelta={isDeltaEnsemble}
                            />
                            <ResponsivePlotArea>
                                {(width, height) => (
                                    <MeasureDistributionPlot
                                        measure={selectedMeasure}
                                        measureValues={measureValues}
                                        unit={getMeasureUnit(selectedMeasure, unitContext)}
                                        plotType={distributionPlotType}
                                        color={ensembleColor}
                                        width={width}
                                        height={height}
                                        targetValue={
                                            selectedMeasure === EconomicMeasure.BREAK_EVEN_OIL_PRICE
                                                ? priceAssumptions.oilPrice
                                                : null
                                        }
                                        isDelta={isDeltaEnsemble}
                                    />
                                )}
                            </ResponsivePlotArea>
                        </>
                    )}
                    {resultMode === ResultMode.TIME_PROFILE && hasSelectedTimeProfileData && (
                        <>
                            {isSelectedRealizationUnavailable && (
                                <div role="status" className="text-body-xs text-subtle">
                                    Realization {selectedRealization} has no complete data for this profile; showing the
                                    aggregate only.
                                </div>
                            )}
                            <ResponsivePlotArea>
                                {(width, height) => (
                                    <CashFlowPlot
                                        results={results}
                                        currency={currency}
                                        profileType={cashFlowProfileType}
                                        selectedRealization={selectedRealization}
                                        oilUnit={oilUnit}
                                        gasUnit={gasUnit}
                                        color={ensembleColor}
                                        width={width}
                                        height={height}
                                    />
                                )}
                            </ResponsivePlotArea>
                        </>
                    )}
                    {resultMode === ResultMode.TIME_PROFILE && !hasSelectedTimeProfileData && (
                        <ContentInfo>No complete profile data is available for the selected time profile.</ContentInfo>
                    )}
                    {resultMode === ResultMode.ALL_RESULTS && (
                        <div className="min-h-0 grow">
                            <RealizationResultsTable
                                results={results}
                                unitContext={unitContext}
                                selectedRealization={selectedRealization}
                                isDelta={isDeltaEnsemble}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

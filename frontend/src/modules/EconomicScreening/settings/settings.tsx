import { useEffect, type ReactNode } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Combobox } from "@lib/components/Combobox";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import type { Interfaces } from "../interfaces";
import {
    CashFlowProfileType,
    CashFlowProfileTypeEnumToStringMapping,
    Currency,
    DistributionPlotType,
    DistributionPlotTypeEnumToStringMapping,
    EconomicMeasure,
    EconomicMeasureEnumToStringMapping,
    GasPriceBasis,
    GasPriceBasisEnumToStringMapping,
    OilPriceBasis,
    OilPriceBasisEnumToStringMapping,
    ResultMode,
    ResultModeEnumToStringMapping,
} from "../typesAndEnums";
import { getMeasureDisplayName } from "../utils/measureAccessors";
import { monthIndexOf } from "../utils/monthlyProduction";
import { getResultRequirement, getSetupReadiness } from "../utils/setupReadiness";
import type { MissingComponentAssumptions, SalesGasStrategy } from "../utils/vectorResolution";
import { CalculationHelpDialog } from "../view/components/calculationHelpDialog";

import {
    costProfileAtom,
    cashFlowProfileTypeAtom,
    currencyAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    isCostProfileDraftValidAtom,
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "./atoms/baseAtoms";
import {
    activeVectorListQueryAtom,
    displayedRealizationAtom,
    hasOilProductionVectorAtom,
    salesGasStrategyAtom,
} from "./atoms/derivedAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./atoms/persistableFixableAtoms";
import { validRealizationNumbersAtom } from "./atoms/sourceQueryAtoms";
import {
    predictionStartYearSuggestionsAtom,
    selectedProductSupportAtom,
    sourceHorizonAtom,
    sourceSnapshotAtom,
} from "./atoms/sourceSnapshotAtoms";
import { CostProfileEditor } from "./components/costProfileEditor";
import { NamedRadioGroup } from "./components/namedRadioGroup";
import { PredictionYearSelector } from "./components/predictionYearSelector";
import { SetupSummary } from "./components/setupSummary";

const NUMBER_INPUT_DEBOUNCE_MS = 500;

const DISTRIBUTION_PLOT_TYPE_ITEMS = [DistributionPlotType.EXCEEDANCE, DistributionPlotType.HISTOGRAM].map((value) => ({
    value,
    label: DistributionPlotTypeEnumToStringMapping[value],
}));

function toCalendarYear(value: number | null): number | null {
    return value === null ? null : Math.round(value);
}

export function Settings(props: ModuleSettingsProps<Interfaces>): ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [discountRatePercent, setDiscountRatePercent] = useAtom(discountRatePercentAtom);
    const [predictionStartYear, setPredictionStartYear] = useAtom(predictionStartYearAtom);
    const [earlyValueConfiguration, setEarlyValueConfiguration] = useAtom(earlyValueConfigurationAtom);
    const [currency, setCurrency] = useAtom(currencyAtom);
    const [oilPrice, setOilPrice] = useAtom(oilPriceAtom);
    const [oilPriceBasis, setOilPriceBasis] = useAtom(oilPriceBasisAtom);
    const [gasPrice, setGasPrice] = useAtom(gasPriceAtom);
    const [gasPriceBasis, setGasPriceBasis] = useAtom(gasPriceBasisAtom);
    const [costProfile, setCostProfile] = useAtom(costProfileAtom);
    const [isCostProfileDraftValid, setIsCostProfileDraftValid] = useAtom(isCostProfileDraftValidAtom);
    const [selectedMeasure, setSelectedMeasure] = useAtom(selectedMeasureAtom);
    const [cashFlowProfileType, setCashFlowProfileType] = useAtom(cashFlowProfileTypeAtom);
    const [resultMode, setResultMode] = useAtom(resultModeAtom);
    const [distributionPlotType, setDistributionPlotType] = useAtom(distributionPlotTypeAtom);
    const setSelectedRealization = useSetAtom(selectedRealizationAtom);
    const displayedRealization = useAtomValue(displayedRealizationAtom);
    const validRealizationNumbers = useAtomValue(validRealizationNumbersAtom);
    const [missingComponentAssumptionsByEnsemble, setMissingComponentAssumptionsByEnsemble] = useAtom(
        missingComponentAssumptionsAtom,
    );
    const sourceHorizon = useAtomValue(sourceHorizonAtom);
    const sourceSnapshot = useAtomValue(sourceSnapshotAtom);
    const predictionStartYearSuggestions = useAtomValue(predictionStartYearSuggestionsAtom);
    const selectedProductSupport = useAtomValue(selectedProductSupportAtom);

    const vectorListQuery = useAtomValue(activeVectorListQueryAtom);
    const hasOilProductionVector = useAtomValue(hasOilProductionVectorAtom);
    const salesGasStrategy = useAtomValue(salesGasStrategyAtom);

    const [immediateDiscountRate, setImmediateDiscountRate] = useDebouncedOnChange(
        discountRatePercent,
        (newValue: number) => setDiscountRatePercent(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );
    const [immediateOilPrice, setImmediateOilPrice] = useDebouncedOnChange(
        oilPrice,
        (newValue: number | null) => setOilPrice(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );
    const [immediateGasPrice, setImmediateGasPrice] = useDebouncedOnChange(
        gasPrice,
        (newValue: number | null) => setGasPrice(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);

    if (!vectorListQuery.isFetching && selectedEnsembleIdent.value && !hasOilProductionVector) {
        statusWriter.addError("FOPT is not available for the selected ensemble.");
    }
    if (!vectorListQuery.isFetching && selectedEnsembleIdent.value && salesGasStrategy.kind === "UNAVAILABLE") {
        statusWriter.addWarning(
            "Neither FGST nor FGPT is available. Enter a gas price of 0 to calculate financial results without gas revenue.",
        );
    }

    useEffect(() => {
        if (vectorListQuery.isFetching || hasOilProductionVector || salesGasStrategy.kind === "UNAVAILABLE") {
            return;
        }
        if (selectedMeasure === EconomicMeasure.DISCOUNTED_OIL_VOLUME) {
            setSelectedMeasure(EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME);
        } else if (selectedMeasure === EconomicMeasure.UNDISCOUNTED_OIL_VOLUME) {
            setSelectedMeasure(EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME);
        }
        if (cashFlowProfileType === CashFlowProfileType.ANNUAL_OIL_VOLUME) {
            setCashFlowProfileType(CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME);
        }
    }, [
        cashFlowProfileType,
        hasOilProductionVector,
        salesGasStrategy.kind,
        selectedMeasure,
        setCashFlowProfileType,
        setSelectedMeasure,
        vectorListQuery.isFetching,
    ]);

    function handleEnsembleChange(newEnsembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        setSelectedRealization({ ensembleIdentString: newEnsembleIdent.toString(), realization: null });
    }

    function handleRealizationChange(realization: number | null) {
        setSelectedRealization({
            ensembleIdentString: selectedEnsembleIdent.value?.toString() ?? null,
            realization,
        });
    }

    function handleCurrencyChange(newCurrency: Currency) {
        setCurrency(newCurrency);
    }

    function handleOilPriceBasisChange(newBasis: OilPriceBasis | null) {
        if (newBasis === null) {
            return;
        }
        setOilPriceBasis(newBasis);
    }

    function handleGasPriceBasisChange(newBasis: GasPriceBasis | null) {
        if (newBasis === null) {
            return;
        }
        setGasPriceBasis(newBasis);
    }

    function setMissingComponentAssumption(key: keyof MissingComponentAssumptions, accepted: boolean) {
        const ensembleKey = selectedEnsembleIdent.value?.toString();
        if (!ensembleKey) {
            return;
        }
        setMissingComponentAssumptionsByEnsemble((current) => ({
            ...current,
            [ensembleKey]: { ...current[ensembleKey], [key]: accepted },
        }));
    }

    const salesGasDescription = makeSalesGasDescription(salesGasStrategy.kind);
    const isDeltaEnsembleSelected =
        selectedEnsembleIdent.value !== null && isEnsembleIdentOfType(selectedEnsembleIdent.value, DeltaEnsembleIdent);
    const realizationItems = [...(validRealizationNumbers ?? [])]
        .sort((first, second) => first - second)
        .map((realization) => ({ value: realization, label: realization.toString() }));
    const selectedMissingComponentAssumptions =
        missingComponentAssumptionsByEnsemble[selectedEnsembleIdent.value?.toString() ?? ""];
    const hasMissingGasComponent =
        salesGasStrategy.kind === "DERIVED" &&
        (!salesGasStrategy.hasGasInjection || !salesGasStrategy.hasGasConsumption);

    const setupReadiness = getSetupReadiness({
        hasEnsemble: selectedEnsembleIdent.value !== null,
        vectorListStatus: vectorListQuery.isError ? "ERROR" : vectorListQuery.isSuccess ? "READY" : "LOADING",
        snapshot: sourceSnapshot,
        hasOilVector: hasOilProductionVector,
        productSupport: selectedProductSupport,
        missingComponentAssumptions: selectedMissingComponentAssumptions,
        predictionStartYear,
        oilPrice,
        gasPrice,
        costProfile,
        isCostProfileDraftValid,
        earlyValue: earlyValueConfiguration,
        requirement: getResultRequirement(resultMode, selectedMeasure, cashFlowProfileType),
    });
    const resultLabel =
        resultMode === ResultMode.TIME_PROFILE
            ? CashFlowProfileTypeEnumToStringMapping[cashFlowProfileType].toLowerCase()
            : resultMode === ResultMode.ALL_RESULTS
              ? "all results"
              : getMeasureDisplayName(selectedMeasure, isDeltaEnsembleSelected).toLowerCase();
    const envelopeEndMonthIndex = sourceSnapshot.envelopeEndMonthIndex;
    const isPredictionStartAfterSource =
        predictionStartYear !== null &&
        envelopeEndMonthIndex !== null &&
        monthIndexOf(predictionStartYear, 1) > envelopeEndMonthIndex;

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <SetupSummary readiness={setupReadiness} resultLabel={resultLabel} />
                <Setting.Section title="Data and valuation" defaultOpen>
                    <div className="flex justify-end">
                        <CalculationHelpDialog />
                    </div>
                    <Setting.Field label="Ensemble" annotations={selectedEnsembleIdentAnnotations} stacked>
                        <EnsembleDropdown
                            ensembles={ensembleSet.getEnsembleArray()}
                            allowDeltaEnsembles={true}
                            value={selectedEnsembleIdent.value}
                            ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(props.workbenchSession)}
                            onValueChange={handleEnsembleChange}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Prediction start year"
                        help={{
                            title: "Prediction start year",
                            content:
                                "Required. Evaluation and valuation both start on 1 January of this year and run through the supported simulation end. It may precede production to include forecast investment. Suggestions are years with source data from 1 January for the full ensemble, including covered years without production; any whole year can be typed. The historical simulation start is not suggested as a default.",
                        }}
                        contentClassName="flex flex-col gap-y-3xs"
                        stacked
                    >
                        <>
                            <PredictionYearSelector
                                value={predictionStartYear}
                                suggestedYears={predictionStartYearSuggestions}
                                isLoading={sourceHorizon.isLoading}
                                onValueChange={setPredictionStartYear}
                            />
                            {predictionStartYear !== null && !isPredictionStartAfterSource && (
                                <span className="text-body-xs text-subtle">
                                    Valuation: 1 January {predictionStartYear}
                                </span>
                            )}
                        </>
                    </Setting.Field>
                    <Setting.Field
                        label="Discount rate [%]"
                        help={{
                            title: "Discount rate",
                            content: "Annual rate used to discount future volumes and cash flow to the valuation date.",
                        }}
                    >
                        <NumberInput
                            value={immediateDiscountRate}
                            min={0}
                            max={25}
                            step={1}
                            onValueChange={(newValue) => setImmediateDiscountRate(newValue ?? 0)}
                        />
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Prices" defaultOpen>
                    <Setting.Field
                        label="Currency"
                        help={{
                            title: "Currency",
                            content:
                                "Enter all prices and costs in this currency. Changing it does not convert entered values.",
                        }}
                    >
                        <NamedRadioGroup
                            value={currency}
                            options={Object.values(Currency).map((value) => ({ value, label: value }))}
                            onValueChange={handleCurrencyChange}
                        />
                    </Setting.Field>
                    {hasOilProductionVector && (
                        <Setting.Field
                            label={`Oil price [${currency} ${OilPriceBasisEnumToStringMapping[oilPriceBasis]}]`}
                            help={{
                                title: "Oil price",
                                content:
                                    "Constant oil sales price over the evaluation. Blank means unspecified; enter 0 to intentionally omit oil revenue. A price of 0 does not turn missing oil data into zero volume. Volume results and break-even oil price do not need an oil price.",
                            }}
                            contentClassName="flex gap-x-xs"
                            stacked
                        >
                            <>
                                <NumberInput
                                    value={immediateOilPrice}
                                    placeholder="Enter price"
                                    onValueChange={setImmediateOilPrice}
                                />
                                <div className="w-32 shrink-0">
                                    <Combobox
                                        items={Object.values(OilPriceBasis).map((value) => ({
                                            value,
                                            label: OilPriceBasisEnumToStringMapping[value],
                                        }))}
                                        value={oilPriceBasis}
                                        onValueChange={handleOilPriceBasisChange}
                                    />
                                </div>
                            </>
                        </Setting.Field>
                    )}
                    <Setting.Field
                        label={`Gas price [${currency} ${GasPriceBasisEnumToStringMapping[gasPriceBasis]}]`}
                        help={{
                            title: "Gas price",
                            content:
                                "Constant sales-gas price over the evaluation. Blank means unspecified; enter 0 to intentionally omit gas revenue. A price of 0 does not turn missing gas data into zero volume, and sales-gas volume results still need the gas source. Volume results do not need a price.",
                        }}
                        contentClassName="flex gap-x-xs"
                        stacked
                    >
                        <>
                            <NumberInput
                                value={immediateGasPrice}
                                placeholder="Enter price"
                                onValueChange={setImmediateGasPrice}
                            />
                            <div className="w-32 shrink-0">
                                <Combobox
                                    items={Object.values(GasPriceBasis).map((value) => ({
                                        value,
                                        label: GasPriceBasisEnumToStringMapping[value],
                                    }))}
                                    value={gasPriceBasis}
                                    onValueChange={handleGasPriceBasisChange}
                                />
                            </div>
                        </>
                    </Setting.Field>
                    <Setting.Field
                        label="Sales gas source"
                        help={{ title: "Sales gas source", content: salesGasDescription }}
                        loadingOverlay={vectorListQuery.isFetching}
                        errorOverlay={vectorListQuery.isError ? "Could not load the vector list." : undefined}
                        contentClassName="flex flex-col gap-y-3xs"
                        stacked
                    >
                        <>
                            <span className="text-sm">{makeSalesGasStatus(salesGasStrategy)}</span>
                            {hasMissingGasComponent && (
                                <span className="text-body-xs text-subtle">
                                    A missing vector is not proof of zero. Accepting treats it as zero for this ensemble
                                    only, which can increase sales gas and NPV.
                                </span>
                            )}
                        </>
                    </Setting.Field>
                    {/* Label-less rows, so each checkbox is named by its own label rather than the field's. */}
                    {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasInjection && (
                        <Setting.Field>
                            <CheckboxCompositions.WithLabel
                                label="Assume no gas injection"
                                checked={selectedMissingComponentAssumptions?.assumeMissingInjectionAsZero ?? false}
                                onCheckedChange={(checked) =>
                                    setMissingComponentAssumption("assumeMissingInjectionAsZero", checked)
                                }
                                size="small"
                            />
                        </Setting.Field>
                    )}
                    {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasConsumption && (
                        <Setting.Field>
                            <CheckboxCompositions.WithLabel
                                label="Assume no gas consumption"
                                checked={selectedMissingComponentAssumptions?.assumeMissingConsumptionAsZero ?? false}
                                onCheckedChange={(checked) =>
                                    setMissingComponentAssumption("assumeMissingConsumptionAsZero", checked)
                                }
                                size="small"
                            />
                        </Setting.Field>
                    )}
                </Setting.Section>

                <Setting.Section title="Costs" defaultOpen>
                    <Setting.Field
                        label={`CAPEX and OPEX per year [${currency}]`}
                        help={{
                            title: "Annual costs",
                            content: isDeltaEnsembleSelected
                                ? "One row per year from the prediction start through the simulation end. For a delta ensemble, costs are comparison minus reference; negative values are savings. Blank cells are zero. OPEX is paid in twelve equal monthly amounts; CAPEX at mid-year."
                                : "One row per year from the prediction start through the simulation end. Blank cells are zero. Each year's OPEX is paid in twelve equal monthly amounts and CAPEX at mid-year; the full annual amount applies even in a final year that ends early.",
                        }}
                        stacked
                    >
                        <CostProfileEditor
                            value={costProfile}
                            currency={currency}
                            isDelta={isDeltaEnsembleSelected}
                            startYear={predictionStartYear}
                            endYear={sourceHorizon.endYear}
                            isHorizonLoading={sourceHorizon.isLoading}
                            onValueChange={setCostProfile}
                            onValidityChange={setIsCostProfileDraftValid}
                        />
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Results" defaultOpen>
                    <Setting.Field
                        label="Show"
                        help={{
                            title: "Results",
                            content:
                                "Chooses what the view displays. Display choices do not change calculations or published channels.",
                        }}
                        stacked
                    >
                        <NamedRadioGroup
                            value={resultMode}
                            options={Object.values(ResultMode).map((value) => ({
                                value,
                                label: ResultModeEnumToStringMapping[value],
                            }))}
                            onValueChange={setResultMode}
                        />
                    </Setting.Field>
                    {resultMode === ResultMode.DISTRIBUTION && (
                        <>
                            <Setting.Field label="Measure" stacked>
                                <Combobox
                                    items={Object.values(EconomicMeasure).map((value) => ({
                                        value,
                                        label: EconomicMeasureEnumToStringMapping[value],
                                    }))}
                                    value={selectedMeasure}
                                    onValueChange={(value) => value !== null && setSelectedMeasure(value)}
                                />
                            </Setting.Field>
                            <Setting.Field label="Plot type" stacked>
                                <Combobox<DistributionPlotType>
                                    items={DISTRIBUTION_PLOT_TYPE_ITEMS}
                                    value={distributionPlotType}
                                    onValueChange={(value) => value !== null && setDistributionPlotType(value)}
                                />
                            </Setting.Field>
                        </>
                    )}
                    {resultMode === ResultMode.TIME_PROFILE && (
                        <Setting.Field label="Time profile" stacked>
                            <Combobox<CashFlowProfileType>
                                items={Object.values(CashFlowProfileType).map((value) => ({
                                    value,
                                    label: CashFlowProfileTypeEnumToStringMapping[value],
                                }))}
                                value={cashFlowProfileType}
                                onValueChange={(value) => value !== null && setCashFlowProfileType(value)}
                            />
                        </Setting.Field>
                    )}
                    {resultMode !== ResultMode.DISTRIBUTION && (
                        <Setting.Field
                            label="Realization"
                            help={{
                                title: "Realization",
                                content:
                                    "Highlights one realization over the aggregate. Clear the selection to show only the aggregate.",
                            }}
                            stacked
                        >
                            <Combobox<number>
                                items={realizationItems}
                                value={displayedRealization}
                                onValueChange={handleRealizationChange}
                                showClearAllButton
                                placeholder="Aggregate"
                            />
                        </Setting.Field>
                    )}

                    <Setting.Field
                        help={{
                            title: "Early value",
                            content:
                                "Optional. Accumulated discounted cash flow and volumes from 1 January of the prediction start year through the end of the chosen year, valued on the same date as the full evaluation. It is not remaining future value and does not move the valuation date. The final year stops at supported production coverage, while its full annual costs still apply. Full results are unchanged.",
                        }}
                    >
                        <CheckboxCompositions.WithLabel
                            label="Early value"
                            checked={earlyValueConfiguration.enabled}
                            onCheckedChange={(enabled) =>
                                setEarlyValueConfiguration((current) => ({ ...current, enabled }))
                            }
                            size="small"
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Calculate through year"
                        help={{
                            title: "Calculate through year",
                            content:
                                "Inclusive last calendar year of the early value, within the evaluation years. Through the final evaluation year, it equals the full result for a fully eligible realization.",
                        }}
                        stacked
                    >
                        <NumberInput
                            value={earlyValueConfiguration.endYear}
                            placeholder="Enter year"
                            min={1900}
                            max={2200}
                            step={1}
                            format={{ useGrouping: false }}
                            disabled={!earlyValueConfiguration.enabled}
                            onValueChange={(endYear) =>
                                setEarlyValueConfiguration((current) => ({
                                    ...current,
                                    endYear: toCalendarYear(endYear),
                                }))
                            }
                        />
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Advanced">
                    <Setting.Field
                        label="Fixed assumptions"
                        help={{
                            title: "Fixed assumptions",
                            content:
                                "Production, revenue and one twelfth of each year's OPEX are discounted at each month's midpoint; annual CAPEX at mid-year. Oil equivalents use SODIR's 1000 Sm3 gas per Sm3 oil equivalent after unit conversion.",
                        }}
                        stacked
                    >
                        <span className="text-body-xs">
                            Monthly midpoint production, revenue and OPEX; mid-year CAPEX; 1000 Sm3 gas per Sm3 oe.
                        </span>
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}

function makeSalesGasStatus(strategy: SalesGasStrategy): string {
    if (strategy.kind === "DIRECT") {
        return "Reported (FGST)";
    }
    if (strategy.kind === "DERIVED") {
        return "Calculated (FGPT - FGIT - FGCT)";
    }
    return "Unavailable";
}

function makeSalesGasDescription(kind: "DIRECT" | "DERIVED" | "UNAVAILABLE"): string {
    if (kind === "DIRECT") {
        return `${simulationVectorDescription("FGST")} (FGST) is used directly.`;
    }
    if (kind === "DERIVED") {
        return `${simulationVectorDescription("FGST")} is calculated as ${simulationVectorDescription("FGPT")} (FGPT) minus ${simulationVectorDescription("FGIT")} (FGIT) and ${simulationVectorDescription("FGCT")} (FGCT).`;
    }
    return "Neither FGST nor FGPT is available for this ensemble.";
}

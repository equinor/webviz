import type React from "react";

import { useAtom, useAtomValue } from "jotai";

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
import { RadioCompositions } from "@lib/components/Radio/compositions";
import { Setting } from "@lib/components/Setting";
import { TextInput } from "@lib/components/TextInput";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";
import {
    DiscountConvention,
    DiscountConventionEnumToStringMapping,
    CashFlowProfileType,
    CashFlowProfileTypeEnumToStringMapping,
    DistributionPlotType,
    DistributionPlotTypeEnumToStringMapping,
    EconomicMeasure,
    EconomicMeasureEnumToStringMapping,
    GasPriceBasis,
    GasPriceBasisEnumToStringMapping,
    InvestmentTiming,
    InvestmentTimingEnumToStringMapping,
    OilPriceBasis,
    OilPriceBasisEnumToStringMapping,
} from "../typesAndEnums";
import type { MissingComponentAssumptions } from "../utils/vectorResolution";

import {
    costProfileAtom,
    cashFlowProfileTypeAtom,
    currencyAtom,
    discountBaseYearAtom,
    discountConventionAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    evaluationWindowAtom,
    excludeGasRevenueAtom,
    excludeOilRevenueAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    gasToOilEquivalentFactorAtom,
    investmentTimingAtom,
    isCostProfileDraftValidAtom,
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom, salesGasStrategyAtom } from "./atoms/derivedAtoms";
import { selectedEnsembleIdentAtom } from "./atoms/persistableFixableAtoms";
import { CostProfileEditor } from "./components/costProfileEditor";

const NUMBER_INPUT_DEBOUNCE_MS = 500;

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [discountRatePercent, setDiscountRatePercent] = useAtom(discountRatePercentAtom);
    const [discountBaseYear, setDiscountBaseYear] = useAtom(discountBaseYearAtom);
    const [discountConvention, setDiscountConvention] = useAtom(discountConventionAtom);
    const [investmentTiming, setInvestmentTiming] = useAtom(investmentTimingAtom);
    const [gasToOilEquivalentFactor, setGasToOilEquivalentFactor] = useAtom(gasToOilEquivalentFactorAtom);
    const [evaluationWindow, setEvaluationWindow] = useAtom(evaluationWindowAtom);
    const [earlyValueConfiguration, setEarlyValueConfiguration] = useAtom(earlyValueConfigurationAtom);
    const [currency, setCurrency] = useAtom(currencyAtom);
    const [oilPrice, setOilPrice] = useAtom(oilPriceAtom);
    const [oilPriceBasis, setOilPriceBasis] = useAtom(oilPriceBasisAtom);
    const [excludeOilRevenue, setExcludeOilRevenue] = useAtom(excludeOilRevenueAtom);
    const [gasPrice, setGasPrice] = useAtom(gasPriceAtom);
    const [gasPriceBasis, setGasPriceBasis] = useAtom(gasPriceBasisAtom);
    const [excludeGasRevenue, setExcludeGasRevenue] = useAtom(excludeGasRevenueAtom);
    const [costProfile, setCostProfile] = useAtom(costProfileAtom);
    const [, setIsCostProfileDraftValid] = useAtom(isCostProfileDraftValidAtom);
    const [selectedMeasure, setSelectedMeasure] = useAtom(selectedMeasureAtom);
    const [distributionPlotType, setDistributionPlotType] = useAtom(distributionPlotTypeAtom);
    const [showCashFlowPlot, setShowCashFlowPlot] = useAtom(showCashFlowPlotAtom);
    const [cashFlowProfileType, setCashFlowProfileType] = useAtom(cashFlowProfileTypeAtom);
    const [missingComponentAssumptionsByEnsemble, setMissingComponentAssumptionsByEnsemble] = useAtom(
        missingComponentAssumptionsAtom,
    );

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
    const [immediateCurrency, setImmediateCurrency] = useDebouncedOnChange(
        currency,
        (newValue: string) => setCurrency(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);

    if (!vectorListQuery.isFetching && selectedEnsembleIdent.value && !hasOilProductionVector) {
        statusWriter.addError("FOPT is not available for the selected ensemble.");
    }
    if (!vectorListQuery.isFetching && selectedEnsembleIdent.value && salesGasStrategy.kind === "UNAVAILABLE") {
        statusWriter.addWarning("Neither FGST nor FGPT is available. Gas revenue must be explicitly excluded.");
    }

    function handleEnsembleChange(newEnsembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
        setSelectedEnsembleIdent(newEnsembleIdent);
    }

    function handleDiscountConventionChange(newConvention: DiscountConvention) {
        setDiscountConvention(newConvention);
    }

    function handleInvestmentTimingChange(newTiming: InvestmentTiming) {
        setInvestmentTiming(newTiming);
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

    function handleMeasureChange(newMeasure: EconomicMeasure | null) {
        if (newMeasure === null) {
            return;
        }
        setSelectedMeasure(newMeasure);
    }

    function handleDistributionPlotTypeChange(newPlotType: DistributionPlotType | null) {
        if (newPlotType === null) {
            return;
        }
        setDistributionPlotType(newPlotType);
    }

    function handleCashFlowProfileTypeChange(newProfileType: CashFlowProfileType | null) {
        if (newProfileType !== null) {
            setCashFlowProfileType(newProfileType);
        }
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

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Data" defaultOpen>
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
                    <Setting.Field
                        label="Sales gas"
                        help={{ title: "Sales gas", content: salesGasDescription }}
                        loadingOverlay={vectorListQuery.isFetching}
                        errorOverlay={vectorListQuery.isError ? "Could not load the vector list." : undefined}
                        stacked
                    >
                        <span className="text-sm">
                            {salesGasStrategy.kind === "DIRECT" ? "Reported" : "Calculated"}
                        </span>
                    </Setting.Field>
                    {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasInjection && (
                        <CheckboxCompositions.WithLabel
                            label="Assume no gas injection"
                            checked={
                                missingComponentAssumptionsByEnsemble[
                                    selectedEnsembleIdent.value?.toString() ?? ""
                                ]?.assumeMissingInjectionAsZero ?? false
                            }
                            onCheckedChange={(checked) =>
                                setMissingComponentAssumption("assumeMissingInjectionAsZero", checked)
                            }
                            size="small"
                        />
                    )}
                    {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasConsumption && (
                        <CheckboxCompositions.WithLabel
                            label="Assume no gas consumption"
                            checked={
                                missingComponentAssumptionsByEnsemble[
                                    selectedEnsembleIdent.value?.toString() ?? ""
                                ]?.assumeMissingConsumptionAsZero ?? false
                            }
                            onCheckedChange={(checked) =>
                                setMissingComponentAssumption("assumeMissingConsumptionAsZero", checked)
                            }
                            size="small"
                        />
                    )}
                </Setting.Section>

                <Setting.Section title="Advanced">
                    <Setting.Field
                        label="Evaluation years"
                        help={{
                            title: "Evaluation years",
                            content:
                                "Only volumes and costs in these calendar years contribute to results. Leave both empty to use the full available range.",
                        }}
                        contentClassName="flex gap-x-xs"
                        stacked
                    >
                        <>
                            <NumberInput
                                value={evaluationWindow.firstYear}
                                placeholder="First year"
                                min={1900}
                                max={2200}
                                onValueChange={(newValue) =>
                                    setEvaluationWindow((prev) => ({ ...prev, firstYear: newValue }))
                                }
                            />
                            <NumberInput
                                value={evaluationWindow.lastYear}
                                placeholder="Last year"
                                min={1900}
                                max={2200}
                                onValueChange={(newValue) =>
                                    setEvaluationWindow((prev) => ({ ...prev, lastYear: newValue }))
                                }
                            />
                        </>
                    </Setting.Field>
                    <Setting.Field
                        label="Base year"
                        help={{
                            title: "Valuation year",
                            content:
                                "Results are discounted to 1 January of this year. Leave empty to use the first year of the available profile.",
                        }}
                        stacked
                    >
                        <NumberInput
                            value={discountBaseYear}
                            placeholder="First year of data"
                            min={1900}
                            max={2200}
                            onValueChange={setDiscountBaseYear}
                        />
                    </Setting.Field>
                    <Setting.Field label="Timing">
                        <RadioCompositions.GroupWithLabels
                            value={discountConvention}
                            options={Object.values(DiscountConvention).map((value) => ({
                                value,
                                label: DiscountConventionEnumToStringMapping[value],
                            }))}
                            onValueChange={handleDiscountConventionChange}
                            layout="horizontal"
                            size="small"
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Investment timing"
                        help={{
                            title: "Investment timing",
                            content: "Assigns annual investment costs to the start of the year or the same time as production and operating costs.",
                        }}
                        stacked
                    >
                        <RadioCompositions.GroupWithLabels
                            value={investmentTiming}
                            options={Object.values(InvestmentTiming).map((value) => ({
                                value,
                                label: InvestmentTimingEnumToStringMapping[value],
                            }))}
                            onValueChange={handleInvestmentTimingChange}
                            layout="horizontal"
                            size="small"
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Gas to oil equivalents"
                        help={{
                            title: "Gas to oil equivalents",
                            content:
                                "Physical conversion used only for discounted oil equivalents. It does not determine gas revenue or break-even oil price.",
                        }}
                        stacked
                    >
                        <NumberInput
                            value={gasToOilEquivalentFactor}
                            min={1}
                            onValueChange={(newValue) => setGasToOilEquivalentFactor(newValue ?? 1)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Early-value end year"
                        help={{
                            title: "Early-value end year",
                            content:
                                "Publishes discounted values from the evaluation start through this year using the same valuation date. Full-evaluation results remain unchanged.",
                        }}
                        contentClassName="flex gap-x-xs"
                        stacked
                    >
                        <>
                            <CheckboxCompositions.WithLabel
                                label="Enable"
                                checked={earlyValueConfiguration.enabled}
                                onCheckedChange={(enabled) =>
                                    setEarlyValueConfiguration((current) => ({ ...current, enabled }))
                                }
                                size="small"
                            />
                            <NumberInput
                                value={earlyValueConfiguration.endYear}
                                placeholder="End year"
                                min={1900}
                                max={2200}
                                disabled={!earlyValueConfiguration.enabled}
                                onValueChange={(endYear) =>
                                    setEarlyValueConfiguration((current) => ({ ...current, endYear }))
                                }
                            />
                        </>
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Prices">
                    <Setting.Field
                        label="Currency"
                        help={{
                            title: "Currency",
                            content: "All prices and costs must use this currency. Changing the label does not convert values.",
                        }}
                    >
                        <TextInput value={immediateCurrency} onValueChange={setImmediateCurrency} />
                    </Setting.Field>
                    {hasOilProductionVector && <Setting.Field
                        label="Oil price"
                        help={{
                            title: "Oil price",
                            content: "Constant oil sales price over the evaluation period. Leave blank for volume-only analysis.",
                        }}
                        contentClassName="flex gap-x-xs"
                        stacked
                    >
                        <>
                            <NumberInput
                                value={immediateOilPrice}
                                placeholder="No oil price"
                                onValueChange={setImmediateOilPrice}
                                disabled={excludeOilRevenue}
                            />
                            <div className="w-32 shrink-0">
                                <Combobox
                                    items={Object.values(OilPriceBasis).map((value) => ({
                                        value,
                                        label: OilPriceBasisEnumToStringMapping[value],
                                    }))}
                                    value={oilPriceBasis}
                                    onValueChange={handleOilPriceBasisChange}
                                    disabled={excludeOilRevenue}
                                />
                            </div>
                        </>
                    </Setting.Field>}
                    {hasOilProductionVector && <CheckboxCompositions.WithLabel
                        label="Exclude oil revenue"
                        checked={excludeOilRevenue}
                        onCheckedChange={setExcludeOilRevenue}
                        size="small"
                    />}
                    {salesGasStrategy.kind !== "UNAVAILABLE" && <Setting.Field
                        label="Gas price"
                        help={{
                            title: "Gas price",
                            content: "Constant sales-gas price over the evaluation period. Leave blank for volume-only analysis.",
                        }}
                        contentClassName="flex gap-x-xs"
                        stacked
                    >
                        <>
                            <NumberInput
                                value={immediateGasPrice}
                                placeholder="No gas price"
                                onValueChange={setImmediateGasPrice}
                                disabled={excludeGasRevenue}
                            />
                            <div className="w-32 shrink-0">
                                <Combobox
                                    items={Object.values(GasPriceBasis).map((value) => ({
                                        value,
                                        label: GasPriceBasisEnumToStringMapping[value],
                                    }))}
                                    value={gasPriceBasis}
                                    onValueChange={handleGasPriceBasisChange}
                                    disabled={excludeGasRevenue}
                                />
                            </div>
                        </>
                    </Setting.Field>}
                    <CheckboxCompositions.WithLabel
                        label="Exclude gas revenue"
                        checked={excludeGasRevenue}
                        onCheckedChange={setExcludeGasRevenue}
                        size="small"
                    />
                </Setting.Section>

                <Setting.Section title="Costs">
                    <Setting.Field
                        label="CAPEX and OPEX per year"
                        help={{
                            title: "Annual costs",
                            content: isDeltaEnsembleSelected
                                ? "For a delta ensemble, costs represent comparison minus reference. Negative values represent savings."
                                : "Enter annual investment and operating costs. Include known costs before or after production when they belong to the evaluation.",
                        }}
                        stacked
                    >
                        <CostProfileEditor
                            value={costProfile}
                            currency={currency}
                            isDelta={isDeltaEnsembleSelected}
                            evaluationWindow={evaluationWindow}
                            onValueChange={setCostProfile}
                            onValidityChange={setIsCostProfileDraftValid}
                        />
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Plot" defaultOpen>
                    <Setting.Field label="Measure" stacked>
                        <Combobox
                            items={Object.values(EconomicMeasure).map((value) => ({
                                value,
                                label: EconomicMeasureEnumToStringMapping[value],
                            }))}
                            value={selectedMeasure}
                            onValueChange={handleMeasureChange}
                        />
                    </Setting.Field>
                    <Setting.Field label="Plot type">
                        <Combobox<DistributionPlotType>
                            items={Object.values(DistributionPlotType)
                                .filter(
                                    (value): value is DistributionPlotType.EXCEEDANCE | DistributionPlotType.HISTOGRAM =>
                                        value !== DistributionPlotType.BOX,
                                )
                                .map((value) => ({
                                    value,
                                    label: DistributionPlotTypeEnumToStringMapping[value],
                                }))}
                            value={distributionPlotType}
                            onValueChange={handleDistributionPlotTypeChange}
                        />
                    </Setting.Field>
                    <Setting.Field label="Time profile">
                        <div className="gap-y-xs flex flex-col">
                            <CheckboxCompositions.WithLabel
                                label="Show time profile"
                                checked={showCashFlowPlot}
                                onCheckedChange={setShowCashFlowPlot}
                                size="small"
                            />
                            <Combobox<CashFlowProfileType>
                                items={Object.values(CashFlowProfileType).map((value) => ({
                                    value,
                                    label: CashFlowProfileTypeEnumToStringMapping[value],
                                }))}
                                value={cashFlowProfileType}
                                onValueChange={handleCashFlowProfileTypeChange}
                                disabled={!showCashFlowPlot}
                            />
                        </div>
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}

function makeSalesGasDescription(kind: "DIRECT" | "DERIVED" | "UNAVAILABLE"): string {
    if (kind === "DIRECT") {
        return "FGST is available and used directly.";
    }
    if (kind === "DERIVED") {
        return "FGST is not available, so sales gas is derived from FGPT minus FGIT and FGCT.";
    }
    return "Neither FGST nor FGPT is available for this ensemble.";
}

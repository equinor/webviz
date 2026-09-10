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
import type { MissingComponentAssumptions } from "../utils/vectorResolution";
import {
    DiscountConvention,
    DiscountConventionEnumToStringMapping,
    DistributionPlotType,
    DistributionPlotTypeEnumToStringMapping,
    EconomicMeasure,
    EconomicMeasureEnumToStringMapping,
    GasPriceBasis,
    GasPriceBasisEnumToStringMapping,
    OilPriceBasis,
    OilPriceBasisEnumToStringMapping,
} from "../typesAndEnums";

import {
    costProfileAtom,
    currencyAtom,
    discountBaseYearAtom,
    discountConventionAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    evaluationWindowAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    gasToOilEquivalentFactorAtom,
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
    const [gasToOilEquivalentFactor, setGasToOilEquivalentFactor] = useAtom(gasToOilEquivalentFactorAtom);
    const [evaluationWindow, setEvaluationWindow] = useAtom(evaluationWindowAtom);
    const [currency, setCurrency] = useAtom(currencyAtom);
    const [oilPrice, setOilPrice] = useAtom(oilPriceAtom);
    const [oilPriceBasis, setOilPriceBasis] = useAtom(oilPriceBasisAtom);
    const [gasPrice, setGasPrice] = useAtom(gasPriceAtom);
    const [gasPriceBasis, setGasPriceBasis] = useAtom(gasPriceBasisAtom);
    const [costProfile, setCostProfile] = useAtom(costProfileAtom);
    const [selectedMeasure, setSelectedMeasure] = useAtom(selectedMeasureAtom);
    const [distributionPlotType, setDistributionPlotType] = useAtom(distributionPlotTypeAtom);
    const [showCashFlowPlot, setShowCashFlowPlot] = useAtom(showCashFlowPlotAtom);
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
        statusWriter.addWarning("Neither FGST nor FGPT is available. Gas volumes are treated as zero.");
    }

    function handleEnsembleChange(newEnsembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
        setSelectedEnsembleIdent(newEnsembleIdent);
    }

    function handleDiscountConventionChange(newConvention: DiscountConvention) {
        setDiscountConvention(newConvention);
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
                        label="Sales gas"
                        description={salesGasDescription}
                        loadingOverlay={vectorListQuery.isFetching}
                        errorOverlay={vectorListQuery.isError ? "Could not load the vector list." : undefined}
                        stacked
                    >
                        <span className="text-sm">
                            {salesGasStrategy.kind === "DIRECT" ? "FGST" : "FGPT − FGIT − FGCT"}
                        </span>
                    </Setting.Field>
                    {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasInjection && (
                        <CheckboxCompositions.WithLabel
                            label="Assume missing FGIT is zero"
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
                            label="Assume missing FGCT is zero"
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
                    <Setting.Field
                        label="Evaluation window"
                        description="Restricts the years included in the calculation. Leave empty to use the full range."
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
                </Setting.Section>

                <Setting.Section title="Discounting" defaultOpen>
                    <Setting.Field label="Discount rate [%]">
                        <NumberInput
                            value={immediateDiscountRate}
                            min={0}
                            max={25}
                            step={1}
                            onValueChange={(newValue) => setImmediateDiscountRate(newValue ?? 0)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Base year"
                        description="Year that cash flows and volumes are discounted back to. Defaults to the first year in the evaluation window."
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
                        label="Gas to oil equivalents"
                        description="Sm³ of gas equivalent to one Sm³ of oil. Used for oil equivalents and break-even price."
                        stacked
                    >
                        <NumberInput
                            value={gasToOilEquivalentFactor}
                            min={1}
                            onValueChange={(newValue) => setGasToOilEquivalentFactor(newValue ?? 1)}
                        />
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Prices">
                    <Setting.Field
                        label="Currency"
                        description="Label only. Prices and costs must be given in the same currency."
                    >
                        <TextInput value={immediateCurrency} onValueChange={setImmediateCurrency} />
                    </Setting.Field>
                    <Setting.Field
                        label="Oil price"
                        description="Leave empty to skip NPV and IRR."
                        contentClassName="flex gap-x-xs"
                        stacked
                    >
                        <>
                            <NumberInput
                                value={immediateOilPrice}
                                placeholder="No oil price"
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
                    <Setting.Field label="Gas price" contentClassName="flex gap-x-xs" stacked>
                        <>
                            <NumberInput
                                value={immediateGasPrice}
                                placeholder="No gas price"
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
                </Setting.Section>

                <Setting.Section title="Costs">
                    <Setting.Field
                        label="CAPEX and OPEX per year"
                        description={
                            isDeltaEnsembleSelected
                                ? "Delta ensemble selected. Costs are interpreted as delta costs between the two ensembles."
                                : undefined
                        }
                        stacked
                    >
                        <CostProfileEditor value={costProfile} currency={currency} onValueChange={setCostProfile} />
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
                        <Combobox
                            items={Object.values(DistributionPlotType).map((value) => ({
                                value,
                                label: DistributionPlotTypeEnumToStringMapping[value],
                            }))}
                            value={distributionPlotType}
                            onValueChange={handleDistributionPlotTypeChange}
                        />
                    </Setting.Field>
                    <Setting.Field label="Cash flow profile">
                        <CheckboxCompositions.WithLabel
                            label="Show cash flow per year"
                            checked={showCashFlowPlot}
                            onCheckedChange={setShowCashFlowPlot}
                            size="small"
                        />
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
        return "FGST is not available, so sales gas is derived. Missing components are treated as zero.";
    }
    return "Neither FGST nor FGPT is available for this ensemble.";
}

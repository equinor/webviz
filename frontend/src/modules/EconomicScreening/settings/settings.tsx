import { useEffect, type ReactNode } from "react";

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
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import type { Interfaces } from "../interfaces";
import {
    CashFlowProfileType,
    Currency,
    EconomicMeasure,
    GasPriceBasis,
    GasPriceBasisEnumToStringMapping,
    OilPriceBasis,
    OilPriceBasisEnumToStringMapping,
} from "../typesAndEnums";
import type { MissingComponentAssumptions } from "../utils/vectorResolution";
import { CalculationHelpDialog } from "../view/components/calculationHelpDialog";

import {
    costProfileAtom,
    cashFlowProfileTypeAtom,
    currencyAtom,
    discountRatePercentAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    isCostProfileDraftValidAtom,
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    selectedMeasureAtom,
    sourceHorizonAtom,
} from "./atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom, salesGasStrategyAtom } from "./atoms/derivedAtoms";
import { selectedEnsembleIdentAtom } from "./atoms/persistableFixableAtoms";
import { CostProfileEditor } from "./components/costProfileEditor";

const NUMBER_INPUT_DEBOUNCE_MS = 500;

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
    const [, setIsCostProfileDraftValid] = useAtom(isCostProfileDraftValidAtom);
    const [selectedMeasure, setSelectedMeasure] = useAtom(selectedMeasureAtom);
    const [cashFlowProfileType, setCashFlowProfileType] = useAtom(cashFlowProfileTypeAtom);
    const [missingComponentAssumptionsByEnsemble, setMissingComponentAssumptionsByEnsemble] = useAtom(
        missingComponentAssumptionsAtom,
    );
    const sourceHorizon = useAtomValue(sourceHorizonAtom);

    const vectorListQuery = useAtomValue(activeVectorListQueryAtom);
    const hasOilProductionVector = useAtomValue(hasOilProductionVectorAtom);
    const salesGasStrategy = useAtomValue(salesGasStrategyAtom);

    const [immediateDiscountRate, setImmediateDiscountRate] = useDebouncedOnChange(
        discountRatePercent,
        (newValue: number) => setDiscountRatePercent(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );
    const [immediatePredictionStartYear, setImmediatePredictionStartYear] = useDebouncedOnChange(
        predictionStartYear,
        (newValue: number | null) => setPredictionStartYear(newValue),
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

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Data" defaultOpen>
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
                                "Required. Evaluation and valuation both start on 1 January of this year and run through the supported simulation end. It may precede production to include forecast investment.",
                        }}
                        stacked
                    >
                        <NumberInput
                            value={immediatePredictionStartYear}
                            placeholder="Enter year"
                            min={1900}
                            max={2200}
                            step={1}
                            format={{ useGrouping: false }}
                            onValueChange={(newValue) => setImmediatePredictionStartYear(toCalendarYear(newValue))}
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
                    <Setting.Field
                        label="Publish cumulative results through year"
                        help={{
                            title: "Publish cumulative results through year",
                            content:
                                "Publishes separate discounted values from 1 January of the prediction start year through the end of this year, using the same valuation date. Full-evaluation results remain unchanged.",
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
                        </>
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Prices">
                    <Setting.Field
                        label="Currency"
                        help={{
                            title: "Currency",
                            content:
                                "Enter all prices and costs in this currency. Changing it does not convert entered values.",
                        }}
                    >
                        <RadioCompositions.GroupWithLabels
                            value={currency}
                            options={Object.values(Currency).map((value) => ({ value, label: value }))}
                            onValueChange={handleCurrencyChange}
                            layout="horizontal"
                            size="small"
                        />
                    </Setting.Field>
                    {hasOilProductionVector && (
                        <Setting.Field
                            label={`Oil price [${currency} ${OilPriceBasisEnumToStringMapping[oilPriceBasis]}]`}
                            help={{
                                title: "Oil price",
                                content:
                                    "Constant oil sales price over the evaluation. Blank means unspecified; enter 0 to intentionally omit oil revenue. Volume results do not need a price.",
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
                                "Constant sales-gas price over the evaluation. Blank means unspecified; enter 0 to intentionally omit gas revenue. Volume results do not need a price.",
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
                </Setting.Section>

                <Setting.Section title="Costs">
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
            </Setting.Panel>
        </Setting.ScrollArea>
    );
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

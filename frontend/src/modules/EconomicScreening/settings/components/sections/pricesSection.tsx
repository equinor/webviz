import type { ReactNode } from "react";

import { useAtom, useAtomValue } from "jotai";

import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Combobox } from "@lib/components/Combobox";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";

import {
    Currency,
    GasPriceBasis,
    GasPriceBasisEnumToStringMapping,
    OilPriceBasis,
    OilPriceBasisEnumToStringMapping,
} from "../../../typesAndEnums";
import { getFieldIssueText } from "../../../utils/setupReadiness";
import type { MissingComponentAssumptions, SalesGasStrategy } from "../../../utils/vectorResolution";
import {
    currencyAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
} from "../../atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom, salesGasStrategyAtom } from "../../atoms/derivedAtoms";
import { validSelectedEnsembleIdentAtom } from "../../atoms/persistableFixableAtoms";
import { CURRENCY_HELP, GAS_PRICE_HELP, makeSalesGasSourceHelp, OIL_PRICE_HELP } from "../../helpTexts";
import { NUMBER_INPUT_DEBOUNCE_MS, setupFieldClassName, type SettingsSectionProps } from "../../settingsSections";
import { NamedRadioGroup } from "../namedRadioGroup";

export function PricesSection(props: SettingsSectionProps): ReactNode {
    const selectedEnsembleIdent = useAtomValue(validSelectedEnsembleIdentAtom);
    const [currency, setCurrency] = useAtom(currencyAtom);
    const [oilPrice, setOilPrice] = useAtom(oilPriceAtom);
    const [oilPriceBasis, setOilPriceBasis] = useAtom(oilPriceBasisAtom);
    const [gasPrice, setGasPrice] = useAtom(gasPriceAtom);
    const [gasPriceBasis, setGasPriceBasis] = useAtom(gasPriceBasisAtom);
    const [missingComponentAssumptionsByEnsemble, setMissingComponentAssumptionsByEnsemble] = useAtom(
        missingComponentAssumptionsAtom,
    );
    const vectorListQuery = useAtomValue(activeVectorListQueryAtom);
    const hasOilProductionVector = useAtomValue(hasOilProductionVectorAtom);
    const salesGasStrategy = useAtomValue(salesGasStrategyAtom);

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
        const ensembleKey = selectedEnsembleIdent?.toString();
        if (!ensembleKey) {
            return;
        }
        setMissingComponentAssumptionsByEnsemble((current) => ({
            ...current,
            [ensembleKey]: { ...current[ensembleKey], [key]: accepted },
        }));
    }

    const selectedMissingComponentAssumptions =
        missingComponentAssumptionsByEnsemble[selectedEnsembleIdent?.toString() ?? ""];

    return (
        <Setting.Section {...props.sectionProps}>
            <Setting.Field label="Currency" stacked help={{ title: "Currency", content: CURRENCY_HELP }}>
                <NamedRadioGroup
                    value={currency}
                    options={Object.values(Currency).map((value) => ({ value, label: value }))}
                    onValueChange={handleCurrencyChange}
                />
            </Setting.Field>
            {hasOilProductionVector && (
                <Setting.Field
                    label={`Oil price [${currency} ${OilPriceBasisEnumToStringMapping[oilPriceBasis]}]`}
                    help={{ title: "Oil price", content: OIL_PRICE_HELP }}
                    contentClassName={`${setupFieldClassName("oilPrice")} flex gap-x-xs [&>div]:min-w-0`}
                    warningAnnotation={getFieldIssueText(props.readiness, "oilPrice")}
                    stacked
                >
                    <>
                        <NumberInput
                            value={immediateOilPrice}
                            layoutClassName="[&_input]:text-right"
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
                help={{ title: "Gas price", content: GAS_PRICE_HELP }}
                contentClassName={`${setupFieldClassName("gasPrice")} flex gap-x-xs [&>div]:min-w-0`}
                warningAnnotation={getFieldIssueText(props.readiness, "gasPrice")}
                infoAnnotation={
                    gasPrice === 0
                        ? "Gas revenue excluded; gas-volume outputs still require resolved gas data."
                        : undefined
                }
                stacked
            >
                <>
                    <NumberInput
                        value={immediateGasPrice}
                        layoutClassName="[&_input]:text-right"
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
                help={{ title: "Sales gas source", content: makeSalesGasSourceHelp(salesGasStrategy.kind) }}
                loadingOverlay={vectorListQuery.isFetching}
                errorOverlay={vectorListQuery.isError ? "Could not load the vector list." : undefined}
                contentClassName="flex flex-col gap-y-3xs"
                stacked
            >
                <>
                    <span className="text-sm">{makeSalesGasStatus(salesGasStrategy)}</span>
                </>
            </Setting.Field>
            {/* Label-less rows, so each checkbox is named by its own label rather than the field's. */}
            {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasInjection && (
                <Setting.Field
                    contentClassName={setupFieldClassName("injection")}
                    warningAnnotation={getFieldIssueText(props.readiness, "injection")}
                >
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
                <Setting.Field
                    contentClassName={setupFieldClassName("consumption")}
                    warningAnnotation={getFieldIssueText(props.readiness, "consumption")}
                >
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

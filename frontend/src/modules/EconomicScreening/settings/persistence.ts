import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { getEnsembleIdentFromString } from "@framework/utils/ensembleIdentUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import {
    CashFlowProfileType,
    Currency,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";

import {
    costProfileAtom,
    cashFlowProfileTypeAtom,
    currencyAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./atoms/baseAtoms";
import { selectedEnsembleIdentAtom } from "./atoms/persistableFixableAtoms";

/**
 * Only the current monthly model is persisted. Earlier experimental states lack this marker and fail
 * schema validation, so the framework discards them before any setting is changed.
 */
export const SETTINGS_STATE_FORMAT = "MONTHLY_OPEX_V1";

export type SerializedSettings = {
    stateFormat: typeof SETTINGS_STATE_FORMAT;
    selectedEnsembleIdentString: string | null;
    discountRatePercent: number;
    predictionStartYear: number | null;
    currency: Currency;
    oilPrice: number | null;
    oilPriceBasis: OilPriceBasis;
    gasPrice: number | null;
    gasPriceBasis: GasPriceBasis;
    costProfile: CostProfileEntry[];
    earlyValueEnabled: boolean;
    earlyValueEndYear: number | null;
    selectedMeasure: EconomicMeasure;
    distributionPlotType: DistributionPlotType;
    showCashFlowPlot: boolean;
    cashFlowProfileType: CashFlowProfileType;
    missingComponentAssumptionsByEnsemble: Record<
        string,
        { assumeMissingInjectionAsZero?: boolean; assumeMissingConsumptionAsZero?: boolean }
    >;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        stateFormat: { enum: [SETTINGS_STATE_FORMAT] },
        selectedEnsembleIdentString: { type: "string", nullable: true },
        discountRatePercent: { type: "float64" },
        predictionStartYear: { type: "int32", nullable: true },
        currency: { enum: Object.values(Currency) },
        oilPrice: { type: "float64", nullable: true },
        oilPriceBasis: { enum: Object.values(OilPriceBasis) },
        gasPrice: { type: "float64", nullable: true },
        gasPriceBasis: { enum: Object.values(GasPriceBasis) },
        costProfile: {
            elements: {
                properties: {
                    year: { type: "int32" },
                    capex: { type: "float64" },
                    opex: { type: "float64" },
                },
            },
        },
        earlyValueEnabled: { type: "boolean" },
        earlyValueEndYear: { type: "int32", nullable: true },
        selectedMeasure: { enum: Object.values(EconomicMeasure) },
        distributionPlotType: { enum: Object.values(DistributionPlotType) },
        showCashFlowPlot: { type: "boolean" },
        cashFlowProfileType: { enum: Object.values(CashFlowProfileType) },
        missingComponentAssumptionsByEnsemble: {
            values: {
                optionalProperties: {
                    assumeMissingInjectionAsZero: { type: "boolean" },
                    assumeMissingConsumptionAsZero: { type: "boolean" },
                },
            },
        },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const earlyValueConfiguration = get(earlyValueConfigurationAtom);

    return {
        stateFormat: SETTINGS_STATE_FORMAT,
        selectedEnsembleIdentString: get(selectedEnsembleIdentAtom).value?.toString() ?? null,
        discountRatePercent: get(discountRatePercentAtom),
        predictionStartYear: get(predictionStartYearAtom),
        currency: get(currencyAtom),
        oilPrice: get(oilPriceAtom),
        oilPriceBasis: get(oilPriceBasisAtom),
        gasPrice: get(gasPriceAtom),
        gasPriceBasis: get(gasPriceBasisAtom),
        costProfile: get(costProfileAtom),
        earlyValueEnabled: earlyValueConfiguration.enabled,
        earlyValueEndYear: earlyValueConfiguration.endYear,
        selectedMeasure: get(selectedMeasureAtom),
        distributionPlotType: get(distributionPlotTypeAtom),
        showCashFlowPlot: get(showCashFlowPlotAtom),
        cashFlowProfileType: get(cashFlowProfileTypeAtom),
        missingComponentAssumptionsByEnsemble: get(missingComponentAssumptionsAtom),
    };
};

/** Receives schema-validated current states, or partial template states. */
export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const selectedEnsembleIdent = raw.selectedEnsembleIdentString
        ? (getEnsembleIdentFromString(raw.selectedEnsembleIdentString) ?? undefined)
        : undefined;
    const earlyValueConfiguration =
        raw.earlyValueEnabled !== undefined || raw.earlyValueEndYear !== undefined
            ? { enabled: raw.earlyValueEnabled ?? false, endYear: raw.earlyValueEndYear ?? null }
            : undefined;

    setIfDefined(set, selectedEnsembleIdentAtom, selectedEnsembleIdent);
    setIfDefined(set, discountRatePercentAtom, raw.discountRatePercent);
    setIfDefined(set, predictionStartYearAtom, raw.predictionStartYear);
    setIfDefined(set, currencyAtom, raw.currency);
    setIfDefined(set, oilPriceAtom, raw.oilPrice);
    setIfDefined(set, oilPriceBasisAtom, raw.oilPriceBasis);
    setIfDefined(set, gasPriceAtom, raw.gasPrice);
    setIfDefined(set, gasPriceBasisAtom, raw.gasPriceBasis);
    setIfDefined(set, costProfileAtom, raw.costProfile);
    setIfDefined(set, earlyValueConfigurationAtom, earlyValueConfiguration);
    setIfDefined(set, selectedMeasureAtom, raw.selectedMeasure);
    setIfDefined(set, distributionPlotTypeAtom, raw.distributionPlotType);
    setIfDefined(set, showCashFlowPlotAtom, raw.showCashFlowPlot);
    setIfDefined(set, cashFlowProfileTypeAtom, raw.cashFlowProfileType);
    setIfDefined(set, missingComponentAssumptionsAtom, raw.missingComponentAssumptionsByEnsemble);
};

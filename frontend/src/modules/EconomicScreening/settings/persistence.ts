import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { getEnsembleIdentFromString } from "@framework/utils/ensembleIdentUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import {
    DiscountConvention,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    InvestmentTiming,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";

import {
    costProfileAtom,
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
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./atoms/baseAtoms";
import { selectedEnsembleIdentAtom } from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentString: string | null;
    discountRatePercent: number;
    discountBaseYear: number | null;
    discountConvention: DiscountConvention;
    investmentTiming?: InvestmentTiming;
    gasToOilEquivalentFactor: number;
    currency: string;
    oilPrice: number | null;
    oilPriceBasis: OilPriceBasis;
    excludeOilRevenue?: boolean;
    gasPrice: number | null;
    gasPriceBasis: GasPriceBasis;
    excludeGasRevenue?: boolean;
    costProfile: CostProfileEntry[];
    evaluationFirstYear: number | null;
    evaluationLastYear: number | null;
    earlyValueEnabled?: boolean;
    earlyValueEndYear?: number | null;
    selectedMeasure: EconomicMeasure;
    distributionPlotType: DistributionPlotType;
    showCashFlowPlot: boolean;
    missingComponentAssumptionsByEnsemble?: Record<
        string,
        { assumeMissingInjectionAsZero?: boolean; assumeMissingConsumptionAsZero?: boolean }
    >;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentString: { type: "string", nullable: true },
        discountRatePercent: { type: "float64" },
        discountBaseYear: { type: "int32", nullable: true },
        discountConvention: { enum: Object.values(DiscountConvention) },
        gasToOilEquivalentFactor: { type: "float64" },
        currency: { type: "string" },
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
        evaluationFirstYear: { type: "int32", nullable: true },
        evaluationLastYear: { type: "int32", nullable: true },
        selectedMeasure: { enum: Object.values(EconomicMeasure) },
        distributionPlotType: { enum: Object.values(DistributionPlotType) },
        showCashFlowPlot: { type: "boolean" },
    },
    optionalProperties: {
        missingComponentAssumptionsByEnsemble: {
            values: {
                optionalProperties: {
                    assumeMissingInjectionAsZero: { type: "boolean" },
                    assumeMissingConsumptionAsZero: { type: "boolean" },
                },
            },
        },
        earlyValueEnabled: { type: "boolean" },
        earlyValueEndYear: { type: "int32", nullable: true },
        investmentTiming: { enum: Object.values(InvestmentTiming) },
        excludeOilRevenue: { type: "boolean" },
        excludeGasRevenue: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const evaluationWindow = get(evaluationWindowAtom);
    const earlyValueConfiguration = get(earlyValueConfigurationAtom);

    return {
        selectedEnsembleIdentString: get(selectedEnsembleIdentAtom).value?.toString() ?? null,
        discountRatePercent: get(discountRatePercentAtom),
        discountBaseYear: get(discountBaseYearAtom),
        discountConvention: get(discountConventionAtom),
        investmentTiming: get(investmentTimingAtom),
        gasToOilEquivalentFactor: get(gasToOilEquivalentFactorAtom),
        currency: get(currencyAtom),
        oilPrice: get(oilPriceAtom),
        oilPriceBasis: get(oilPriceBasisAtom),
        excludeOilRevenue: get(excludeOilRevenueAtom),
        gasPrice: get(gasPriceAtom),
        gasPriceBasis: get(gasPriceBasisAtom),
        excludeGasRevenue: get(excludeGasRevenueAtom),
        costProfile: get(costProfileAtom),
        evaluationFirstYear: evaluationWindow.firstYear,
        evaluationLastYear: evaluationWindow.lastYear,
        earlyValueEnabled: earlyValueConfiguration.enabled,
        earlyValueEndYear: earlyValueConfiguration.endYear,
        selectedMeasure: get(selectedMeasureAtom),
        distributionPlotType: get(distributionPlotTypeAtom),
        showCashFlowPlot: get(showCashFlowPlotAtom),
        missingComponentAssumptionsByEnsemble: get(missingComponentAssumptionsAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const selectedEnsembleIdent = raw.selectedEnsembleIdentString
        ? (getEnsembleIdentFromString(raw.selectedEnsembleIdentString) ?? undefined)
        : undefined;

    const evaluationWindow =
        raw.evaluationFirstYear !== undefined || raw.evaluationLastYear !== undefined
            ? { firstYear: raw.evaluationFirstYear ?? null, lastYear: raw.evaluationLastYear ?? null }
            : undefined;
    const earlyValueConfiguration =
        raw.earlyValueEnabled !== undefined || raw.earlyValueEndYear !== undefined
            ? { enabled: raw.earlyValueEnabled ?? false, endYear: raw.earlyValueEndYear ?? null }
            : undefined;

    setIfDefined(set, selectedEnsembleIdentAtom, selectedEnsembleIdent);
    setIfDefined(set, discountRatePercentAtom, raw.discountRatePercent);
    setIfDefined(set, discountBaseYearAtom, raw.discountBaseYear);
    setIfDefined(set, discountConventionAtom, raw.discountConvention);
    setIfDefined(set, investmentTimingAtom, raw.investmentTiming);
    setIfDefined(set, gasToOilEquivalentFactorAtom, raw.gasToOilEquivalentFactor);
    setIfDefined(set, currencyAtom, raw.currency);
    setIfDefined(set, oilPriceAtom, raw.oilPrice);
    setIfDefined(set, oilPriceBasisAtom, raw.oilPriceBasis);
    setIfDefined(set, excludeOilRevenueAtom, raw.excludeOilRevenue);
    setIfDefined(set, gasPriceAtom, raw.gasPrice);
    setIfDefined(set, gasPriceBasisAtom, raw.gasPriceBasis);
    setIfDefined(set, excludeGasRevenueAtom, raw.excludeGasRevenue);
    setIfDefined(set, costProfileAtom, raw.costProfile);
    setIfDefined(set, evaluationWindowAtom, evaluationWindow);
    setIfDefined(set, earlyValueConfigurationAtom, earlyValueConfiguration);
    setIfDefined(set, selectedMeasureAtom, raw.selectedMeasure);
    setIfDefined(set, distributionPlotTypeAtom, raw.distributionPlotType);
    setIfDefined(set, showCashFlowPlotAtom, raw.showCashFlowPlot);
    setIfDefined(set, missingComponentAssumptionsAtom, raw.missingComponentAssumptionsByEnsemble);
};

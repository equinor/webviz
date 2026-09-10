import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    costProfileAtom,
    currencyAtom,
    discountBaseYearAtom,
    discountConventionAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    evaluationWindowAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    gasToOilEquivalentFactorAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./settings/atoms/baseAtoms";
import { salesGasStrategyAtom } from "./settings/atoms/derivedAtoms";
import { selectedEnsembleIdentAtom } from "./settings/atoms/persistableFixableAtoms";
import type {
    CostProfileEntry,
    DiscountAssumptions,
    DistributionPlotType,
    EarlyValueConfiguration,
    EconomicMeasure,
    EvaluationWindow,
    PriceAssumptions,
} from "./typesAndEnums";
import type { SalesGasStrategy } from "./utils/vectorResolution";

export type SettingsToViewInterface = {
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null;
    salesGasStrategy: SalesGasStrategy;
    discountAssumptions: DiscountAssumptions;
    priceAssumptions: PriceAssumptions;
    costProfile: CostProfileEntry[];
    evaluationWindow: EvaluationWindow;
    earlyValueConfiguration: EarlyValueConfiguration;
    selectedMeasure: EconomicMeasure;
    distributionPlotType: DistributionPlotType;
    showCashFlowPlot: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    ensembleIdent: (get) => {
        return get(selectedEnsembleIdentAtom).value;
    },
    salesGasStrategy: (get) => {
        return get(salesGasStrategyAtom);
    },
    discountAssumptions: (get) => {
        return {
            discountRatePercent: get(discountRatePercentAtom),
            baseYear: get(discountBaseYearAtom),
            convention: get(discountConventionAtom),
            gasToOilEquivalentFactor: get(gasToOilEquivalentFactorAtom),
        };
    },
    priceAssumptions: (get) => {
        return {
            currency: get(currencyAtom),
            oilPrice: get(oilPriceAtom),
            oilPriceBasis: get(oilPriceBasisAtom),
            gasPrice: get(gasPriceAtom),
            gasPriceBasis: get(gasPriceBasisAtom),
        };
    },
    costProfile: (get) => {
        return get(costProfileAtom);
    },
    evaluationWindow: (get) => {
        return get(evaluationWindowAtom);
    },
    earlyValueConfiguration: (get) => {
        return get(earlyValueConfigurationAtom);
    },
    selectedMeasure: (get) => {
        return get(selectedMeasureAtom);
    },
    distributionPlotType: (get) => {
        return get(distributionPlotTypeAtom);
    },
    showCashFlowPlot: (get) => {
        return get(showCashFlowPlotAtom);
    },
};

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

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
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./settings/atoms/baseAtoms";
import { hasOilProductionVectorAtom, salesGasStrategyAtom } from "./settings/atoms/derivedAtoms";
import { selectedEnsembleIdentAtom } from "./settings/atoms/persistableFixableAtoms";
import type {
    CostProfileEntry,
    CashFlowProfileType,
    DistributionPlotType,
    EarlyValueConfiguration,
    EconomicAssumptions,
    EconomicMeasure,
    PriceAssumptions,
    SourceHorizon,
} from "./typesAndEnums";
import type { SalesGasStrategy } from "./utils/vectorResolution";
import { sourceHorizonAtom } from "./view/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null;
    hasOilProductionVector: boolean;
    salesGasStrategy: SalesGasStrategy;
    economicAssumptions: EconomicAssumptions;
    priceAssumptions: PriceAssumptions;
    costProfile: CostProfileEntry[];
    isCostProfileDraftValid: boolean;
    earlyValueConfiguration: EarlyValueConfiguration;
    selectedMeasure: EconomicMeasure;
    distributionPlotType: DistributionPlotType;
    showCashFlowPlot: boolean;
    cashFlowProfileType: CashFlowProfileType;
};

export type ViewToSettingsInterface = {
    sourceHorizon: SourceHorizon;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
    viewToSettings: ViewToSettingsInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    ensembleIdent: (get) => {
        return get(selectedEnsembleIdentAtom).value;
    },
    hasOilProductionVector: (get) => {
        return get(hasOilProductionVectorAtom);
    },
    salesGasStrategy: (get) => {
        return get(salesGasStrategyAtom);
    },
    economicAssumptions: (get) => {
        return {
            discountRatePercent: get(discountRatePercentAtom),
            predictionStartYear: get(predictionStartYearAtom),
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
    isCostProfileDraftValid: (get) => {
        return get(isCostProfileDraftValidAtom);
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
    cashFlowProfileType: (get) => {
        return get(cashFlowProfileTypeAtom);
    },
};

export const viewToSettingsInterfaceInitialization: InterfaceInitialization<ViewToSettingsInterface> = {
    sourceHorizon: (get) => {
        return get(sourceHorizonAtom);
    },
};

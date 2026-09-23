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
    resultModeAtom,
    selectedMeasureAtom,
} from "./settings/atoms/baseAtoms";
import { displayedRealizationAtom } from "./settings/atoms/derivedAtoms";
import { validRealizationNumbersAtom } from "./settings/atoms/sourceQueryAtoms";
import { constituentGasConsumptionWarningAtom, sourceSnapshotAtom } from "./settings/atoms/sourceSnapshotAtoms";
import type {
    CostProfileEntry,
    CashFlowProfileType,
    DistributionPlotType,
    EarlyValueConfiguration,
    EconomicAssumptions,
    EconomicMeasure,
    PriceAssumptions,
    ResultMode,
} from "./typesAndEnums";
import type { EconomicSourceSnapshot } from "./utils/sourceSnapshot";

export type SettingsToViewInterface = {
    sourceSnapshot: EconomicSourceSnapshot;
    /** Filtered realizations of the snapshot's ensemble; results are calculated for these only. */
    realizationNumbers: number[] | null;
    constituentGasConsumptionWarning: string | null;
    economicAssumptions: EconomicAssumptions;
    priceAssumptions: PriceAssumptions;
    costProfile: CostProfileEntry[];
    isCostProfileDraftValid: boolean;
    earlyValueConfiguration: EarlyValueConfiguration;
    resultMode: ResultMode;
    selectedMeasure: EconomicMeasure;
    distributionPlotType: DistributionPlotType;
    cashFlowProfileType: CashFlowProfileType;
    /** Highlighted realization, or null for Aggregate. */
    selectedRealization: number | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    sourceSnapshot: (get) => {
        return get(sourceSnapshotAtom);
    },
    realizationNumbers: (get) => {
        return get(validRealizationNumbersAtom);
    },
    constituentGasConsumptionWarning: (get) => {
        return get(constituentGasConsumptionWarningAtom);
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
    resultMode: (get) => {
        return get(resultModeAtom);
    },
    selectedMeasure: (get) => {
        return get(selectedMeasureAtom);
    },
    distributionPlotType: (get) => {
        return get(distributionPlotTypeAtom);
    },
    cashFlowProfileType: (get) => {
        return get(cashFlowProfileTypeAtom);
    },
    selectedRealization: (get) => {
        return get(displayedRealizationAtom);
    },
};

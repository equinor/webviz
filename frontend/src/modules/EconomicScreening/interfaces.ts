import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    costDraftStatusAtom,
    costProfileAtom,
    cashFlowProfileTypeAtom,
    currencyAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "./settings/atoms/baseAtoms";
import { displayedRealizationAtom } from "./settings/atoms/derivedAtoms";
import { validRealizationNumbersAtom } from "./settings/atoms/sourceQueryAtoms";
import {
    constituentGasConsumptionWarningAtom,
    evaluationHorizonStateAtom,
    sourceSnapshotAtom,
} from "./settings/atoms/sourceSnapshotAtoms";
import type {
    CostDraftStatus,
    CostProfileEntry,
    CashFlowProfileType,
    DistributionPlotType,
    EarlyValueConfiguration,
    EconomicAssumptions,
    EconomicMeasure,
    PriceAssumptions,
    ResultMode,
} from "./typesAndEnums";
import type { EvaluationHorizonState } from "./utils/evaluationHorizon";
import type { EconomicSourceSnapshot } from "./utils/sourceSnapshot";

export type SettingsToViewInterface = {
    sourceSnapshot: EconomicSourceSnapshot;
    evaluationHorizon: EvaluationHorizonState;
    /** Filtered realizations of the snapshot's ensemble; results are calculated for these only. */
    realizationNumbers: number[] | null;
    constituentGasConsumptionWarning: string | null;
    economicAssumptions: EconomicAssumptions;
    priceAssumptions: PriceAssumptions;
    costProfile: CostProfileEntry[];
    costDraftStatus: CostDraftStatus;
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
    evaluationHorizon: (get) => {
        return get(evaluationHorizonStateAtom);
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
    costDraftStatus: (get) => {
        return get(costDraftStatusAtom);
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

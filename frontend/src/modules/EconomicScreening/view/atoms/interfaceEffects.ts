import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/EconomicScreening/interfaces";

import {
    cashFlowProfileTypeAtom,
    constituentGasConsumptionWarningAtom,
    costProfileAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    economicAssumptionsAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    realizationNumbersAtom,
    resultModeAtom,
    selectedMeasureAtom,
    selectedRealizationAtom,
    sourceSnapshotAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(sourceSnapshotAtom, getInterfaceValue("sourceSnapshot"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(realizationNumbersAtom, getInterfaceValue("realizationNumbers"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(constituentGasConsumptionWarningAtom, getInterfaceValue("constituentGasConsumptionWarning"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(economicAssumptionsAtom, getInterfaceValue("economicAssumptions"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(priceAssumptionsAtom, getInterfaceValue("priceAssumptions"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(costProfileAtom, getInterfaceValue("costProfile"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(isCostProfileDraftValidAtom, getInterfaceValue("isCostProfileDraftValid"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(earlyValueConfigurationAtom, getInterfaceValue("earlyValueConfiguration"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(resultModeAtom, getInterfaceValue("resultMode"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(selectedMeasureAtom, getInterfaceValue("selectedMeasure"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(distributionPlotTypeAtom, getInterfaceValue("distributionPlotType"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(cashFlowProfileTypeAtom, getInterfaceValue("cashFlowProfileType"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(selectedRealizationAtom, getInterfaceValue("selectedRealization"));
    },
];

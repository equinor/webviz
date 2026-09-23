import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/EconomicScreening/interfaces";

import {
    costProfileAtom,
    cashFlowProfileTypeAtom,
    distributionPlotTypeAtom,
    earlyValueConfigurationAtom,
    economicAssumptionsAtom,
    ensembleIdentAtom,
    hasOilProductionVectorAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    salesGasStrategyAtom,
    selectedMeasureAtom,
    showCashFlowPlotAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(ensembleIdentAtom, getInterfaceValue("ensembleIdent"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(hasOilProductionVectorAtom, getInterfaceValue("hasOilProductionVector"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(salesGasStrategyAtom, getInterfaceValue("salesGasStrategy"));
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
        setAtomValue(selectedMeasureAtom, getInterfaceValue("selectedMeasure"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(distributionPlotTypeAtom, getInterfaceValue("distributionPlotType"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(showCashFlowPlotAtom, getInterfaceValue("showCashFlowPlot"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(cashFlowProfileTypeAtom, getInterfaceValue("cashFlowProfileType"));
    },
];

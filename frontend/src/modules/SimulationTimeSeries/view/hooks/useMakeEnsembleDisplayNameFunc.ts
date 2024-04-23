import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ViewContext } from "@framework/ModuleContext";
import { SettingsAtoms } from "@modules/SimulationTimeSeries/settings/atoms/atomDefinitions";
import { Interface } from "@modules/SimulationTimeSeries/settingsToViewInterface";
import { State } from "@modules/SimulationTimeSeries/state";

import { useAtomValue } from "jotai";

import { ViewAtoms } from "../atoms/atomDefinitions";

export function useMakeEnsembleDisplayNameFunc(
    viewContext: ViewContext<State, Interface, SettingsAtoms, ViewAtoms>
): (ensembleIdent: EnsembleIdent) => string {
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedEnsembles");
    const ensembleSet = useAtomValue(EnsembleSetAtom);

    return function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent) {
        const ensembleNameCount = selectedEnsembles.filter(
            (ensemble) => ensemble.getEnsembleName() === ensembleIdent.getEnsembleName()
        ).length;
        if (ensembleNameCount === 1) {
            return ensembleIdent.getEnsembleName();
        }

        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) {
            return ensembleIdent.getEnsembleName();
        }

        return ensemble.getDisplayName();
    };
}

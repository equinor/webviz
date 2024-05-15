import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ViewContext } from "@framework/ModuleContext";
import { SettingsAtoms } from "@modules/SimulationTimeSeries/settings/atoms/atomDefinitions";
import { Interface } from "@modules/SimulationTimeSeries/settingsToViewInterface";
import { State } from "@modules/SimulationTimeSeries/state";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { ViewAtoms } from "../atoms/atomDefinitions";

export function useMakeEnsembleDisplayNameFunc(
    viewContext: ViewContext<State, Interface, SettingsAtoms, ViewAtoms>
): (ensembleIdent: EnsembleIdent) => string {
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedEnsembles");

    return function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent) {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles);
    };
}

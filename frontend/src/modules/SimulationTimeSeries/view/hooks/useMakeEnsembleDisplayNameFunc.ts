import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ViewContext } from "@framework/ModuleContext";
import { Interfaces } from "@modules/SimulationTimeSeries/interfaces";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { ViewAtoms } from "../atoms/atomDefinitions";

export function useMakeEnsembleDisplayNameFunc(
    viewContext: ViewContext<Interfaces, Record<string, never>, ViewAtoms>
): (ensembleIdent: EnsembleIdent) => string {
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedEnsembles");

    return function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent) {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles);
    };
}

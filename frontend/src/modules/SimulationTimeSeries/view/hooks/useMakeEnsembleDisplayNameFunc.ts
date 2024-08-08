import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ViewContext } from "@framework/ModuleContext";
import { Interfaces } from "@modules/SimulationTimeSeries/interfaces";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

export function useMakeEnsembleDisplayNameFunc(
    viewContext: ViewContext<Interfaces>
): (ensembleIdent: EnsembleIdent) => string {
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedEnsembles");

    return function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent) {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles);
    };
}

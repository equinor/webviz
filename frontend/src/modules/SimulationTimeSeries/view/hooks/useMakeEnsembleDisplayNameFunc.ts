import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ViewContext } from "@framework/ModuleContext";
import { Interfaces } from "@modules/SimulationTimeSeries/interfaces";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

export function useMakeEnsembleDisplayNameFunc(
    viewContext: ViewContext<Interfaces>
): (ensembleIdent: EnsembleIdent | DeltaEnsembleIdent) => string {
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedEnsembles");
    const selectedDeltaEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedDeltaEnsembles");
    const allSelectedEnsembles = [...selectedEnsembles, ...selectedDeltaEnsembles];

    return function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent | DeltaEnsembleIdent): string {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, allSelectedEnsembles);
    };
}

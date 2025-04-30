import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { ViewContext } from "@framework/ModuleContext";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

export function useMakeEnsembleDisplayNameFunc(
    viewContext: ViewContext<Interfaces>,
): (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string {
    const selectedRegularEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedRegularEnsembles");
    const selectedDeltaEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedDeltaEnsembles");
    const allSelectedEnsembles = [...selectedRegularEnsembles, ...selectedDeltaEnsembles];

    return function makeEnsembleDisplayName(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): string {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, allSelectedEnsembles);
    };
}

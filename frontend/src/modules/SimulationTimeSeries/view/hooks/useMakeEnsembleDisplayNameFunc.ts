import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Interfaces } from "@modules/SimulationTimeSeries/interfaces";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

export function useMakeEnsembleDisplayNameFunc(
    viewContext: ViewContext<Interfaces>
): (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string {
    const selectedRegularEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedRegularEnsembles");
    const selectedDeltaEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedDeltaEnsembles");
    const allSelectedEnsembles = [...selectedRegularEnsembles, ...selectedDeltaEnsembles];

    return function makeEnsembleDisplayName(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): string {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, allSelectedEnsembles);
    };
}

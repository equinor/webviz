import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { userSelectedAggregateBySelectionsAtom, userSelectedTableTypeAtom } from "./settings/atom/baseAtoms";
import { selectedEnsembleIdentsAtom, selectedResponsesAtom } from "./settings/atom/derivedAtoms";
import { AggregateByOption, InplaceVolumetricsTableType } from "./types";

export type Interface = {
    derivedStates: {
        selectedEnsembleIdents: EnsembleIdent[];
        selectedTableType: InplaceVolumetricsTableType;
        selectedAggregateBySelections: AggregateByOption[];
        selectedResponses: string[];
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    derivedStates: {
        selectedEnsembleIdents: (get) => {
            return get(selectedEnsembleIdentsAtom);
        },
        selectedTableType: (get) => {
            return get(userSelectedTableTypeAtom);
        },
        selectedAggregateBySelections(get) {
            return get(userSelectedAggregateBySelectionsAtom);
        },
        selectedResponses(get) {
            return get(selectedResponsesAtom);
        },
    },
};

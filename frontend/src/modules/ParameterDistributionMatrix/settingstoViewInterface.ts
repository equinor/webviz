import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { selectedEnsembleIdentsAtom, selectedParameterIdentsAtom } from "./settings/atoms/derivedAtoms";

export type Interface = {
    baseStates: {};
    derivedStates: {
        selectedEnsembleIdents: EnsembleIdent[];
        selectedParameterIdents: ParameterIdent[];
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {},
    derivedStates: {
        selectedEnsembleIdents: (get) => {
            return get(selectedEnsembleIdentsAtom);
        },
        selectedParameterIdents: (get) => {
            return get(selectedParameterIdentsAtom);
        },
    },
};

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";


export type State = Record<string, never>;

export type Interface = {
    baseStates: Record<string, never>;
    derivedStates: {
        selectedVfpNums: number[];

    };
};

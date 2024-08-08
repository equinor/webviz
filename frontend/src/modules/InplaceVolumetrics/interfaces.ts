import { InplaceVolumetricsCategoricalMetaData_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    categoricalFilterAtom,
    categoricalOptionsAtom,
    ensembleIdentAtom,
    realizationsToIncludeAtom,
    responseNameAtom,
    tableNameAtom,
} from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    ensembleIdent: EnsembleIdent | null;
    tableName: string | null;
    responseName: string | null;
    categoricalOptions: InplaceVolumetricsCategoricalMetaData_api[] | null;
    categoricalFilter: InplaceVolumetricsCategoricalMetaData_api[] | null;
    realizationsToInclude: number[] | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    ensembleIdent: (get) => get(ensembleIdentAtom),
    tableName: (get) => get(tableNameAtom),
    responseName: (get) => get(responseNameAtom),
    categoricalOptions: (get) => get(categoricalOptionsAtom),
    categoricalFilter: (get) => get(categoricalFilterAtom),
    realizationsToInclude: (get) => get(realizationsToIncludeAtom),
};

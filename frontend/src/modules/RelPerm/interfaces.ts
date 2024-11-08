import { RelPermRealizationData_api, RftRealizationData_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { UseQueryResult } from "@tanstack/react-query";

import { validRealizationNumbersAtom } from "./settings/atoms/baseAtoms";
import { selectedVisualizationTypeAtom } from "./settings/atoms/baseAtoms";
import { relPermDataQueryAtom } from "./settings/atoms/queryAtoms";
import { VisualizationType } from "./typesAndEnums";

type SettingsToViewInterface = {
    relPermDataQuery: UseQueryResult<RelPermRealizationData_api[], Error>;
    visualizationType: VisualizationType;
};
export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    relPermDataQuery: (get) => {
        return get(relPermDataQueryAtom);
    },
    visualizationType: (get) => {
        return get(selectedVisualizationTypeAtom);
    },
};

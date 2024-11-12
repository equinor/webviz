import { RftRealizationData_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { UseQueryResult } from "@tanstack/react-query";

import { validRealizationNumbersAtom } from "./settings/atoms/baseAtoms";
import {
    selectedRftResponseNameAtom,
    selectedRftTimestampsUtcMsAtom,
    selectedRftWellNameAtom,
} from "./settings/atoms/derivedAtoms";
import { rftRealizationDataQueryAtom } from "./settings/atoms/queryAtoms";

type SettingsToViewInterface = {
    rftDataQuery: UseQueryResult<RftRealizationData_api[], Error>;
    wellName: string | null;
    responseName: string | null;
    timeStampsUtcMs: number | null;
    realizationNums: number[] | null;
};
export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    rftDataQuery: (get) => {
        return get(rftRealizationDataQueryAtom);
    },
    wellName: (get) => {
        return get(selectedRftWellNameAtom);
    },
    responseName: (get) => {
        return get(selectedRftResponseNameAtom);
    },
    timeStampsUtcMs: (get) => {
        return get(selectedRftTimestampsUtcMsAtom);
    },
    realizationNums: (get) => {
        return get(validRealizationNumbersAtom);
    },
};

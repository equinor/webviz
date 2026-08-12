import type { WellboreHeader_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import { horizontalLayoutAtom, limitDomainToDataAtom, dataProviderManagerAtom } from "./settings/atoms/baseAtoms";
import { selectedWellboreHeaderAtom } from "./settings/atoms/derivedAtoms";
import { selectedFieldIdentAtom, selectedWellboreUuidAtom } from "./settings/atoms/persistableFixableAtoms";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type WellboreHeaderStatus = {
    header: WellboreHeader_api | null;
    isLoading: boolean;
};

export type SettingsToViewInterface = {
    providerManager: DataProviderManager | null;

    selectedField: string | null;
    wellboreHeaderStatus: WellboreHeaderStatus;
    horizontalLayout: boolean;
    limitDomainToData: boolean;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    providerManager: (get) => get(dataProviderManagerAtom),
    selectedField: (get) => get(selectedFieldIdentAtom).value,
    wellboreHeaderStatus: (get) => ({
        header: get(selectedWellboreHeaderAtom),
        isLoading: get(selectedWellboreUuidAtom).isLoading,
    }),
    horizontalLayout: (get) => get(horizontalLayoutAtom),
    limitDomainToData: (get) => get(limitDomainToDataAtom),
};

import type { WellboreHeader_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import { providerManagerAtom } from "./settings/atoms/baseAtoms";
import { selectedFieldIdentifierAtom, selectedWellboreHeaderAtom } from "./settings/atoms/derivedAtoms";
import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "./settings/atoms/persistedAtoms";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    providerManager: DataProviderManager | null;

    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    viewerHorizontal: boolean;
    padDataWithEmptyRows: boolean;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    providerManager: (get) => get(providerManagerAtom),
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreHeaderAtom),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
    padDataWithEmptyRows: (get) => get(padDataWithEmptyRowsAtom),
};

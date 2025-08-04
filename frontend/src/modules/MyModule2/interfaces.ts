import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { allowMultiSelectAtom, alternateColColorsAtom, tableDataAtom } from "./atoms";

type SettingsToViewInterface = {
    alternateColColors: boolean;
    allowMultiSelect: boolean;
    tableData: object[];
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    alternateColColors: (get) => get(alternateColColorsAtom),
    allowMultiSelect: (get) => get(allowMultiSelectAtom),
    tableData: (get) => get(tableDataAtom),
};

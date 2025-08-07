import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import type { ExampleTabularData } from "./atoms";
import { allowMultiSelectAtom, alternateColColorsAtom, tableDataAtom } from "./atoms";

type SettingsToViewInterface = {
    alternateColColors: boolean;
    allowMultiSelect: boolean;
    tableData: (ExampleTabularData | { _pending: true })[];
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    alternateColColors: (get) => get(alternateColColorsAtom),
    allowMultiSelect: (get) => get(allowMultiSelectAtom),
    tableData: (get) => get(tableDataAtom),
};

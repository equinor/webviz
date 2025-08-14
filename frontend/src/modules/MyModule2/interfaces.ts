import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import type { ExampleTabularData } from "./atoms";
import {
    allowMultiSelectAtom,
    alternateColColorsAtom,
    amtOfPendingDataAtom,
    fillPendingDataAtom,
    tableDataAtom,
} from "./atoms";

type SettingsToViewInterface = {
    alternateColColors: boolean;
    allowMultiSelect: boolean;
    fillPendingData: boolean;
    tableData: ExampleTabularData[];
    numPendingRows: number;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    alternateColColors: (get) => get(alternateColColorsAtom),
    allowMultiSelect: (get) => get(allowMultiSelectAtom),
    fillPendingData: (get) => get(fillPendingDataAtom),
    tableData: (get) => get(tableDataAtom),
    numPendingRows: (get) => get(amtOfPendingDataAtom),
};

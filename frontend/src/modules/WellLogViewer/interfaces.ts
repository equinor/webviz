import { WellboreHeader_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { viewerHorizontalAtom } from "@modules/3DViewer/settings/atoms/baseAtoms";

import {
    TemplateTrackConfig,
    logViewerTrackConfigs,
    userSelectedWellLogCurveNamesAtom,
} from "./settings/atoms/baseAtoms";
import {
    allSelectedWellLogCurves,
    selectedFieldIdentifierAtom,
    selectedWellboreAtom,
} from "./settings/atoms/derivedAtoms";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    curveNames: string[];
    requiredDataCurves: string[];
    templateTrackConfigs: TemplateTrackConfig[];
    viewerHorizontal: boolean;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreAtom),
    curveNames: (get) => get(userSelectedWellLogCurveNamesAtom),
    templateTrackConfigs: (get) => get(logViewerTrackConfigs),
    requiredDataCurves: (get) => get(allSelectedWellLogCurves),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
};

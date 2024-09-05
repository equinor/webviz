import { WellboreHeader_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import {
    allSelectedWellLogCurves,
    selectedFieldIdentifierAtom,
    selectedWellboreAtom,
    wellLogTemplateTracks,
} from "./settings/atoms/derivedAtoms";
import { viewerHorizontalAtom } from "./settings/atoms/persistedAtoms";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    requiredDataCurves: string[];
    templateTracks: TemplateTrack[];
    viewerHorizontal: boolean;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreAtom),
    templateTracks: (get) => get(wellLogTemplateTracks),
    requiredDataCurves: (get) => get(allSelectedWellLogCurves),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
};

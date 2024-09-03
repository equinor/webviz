import { WellboreHeader_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { viewerHorizontalAtom } from "@modules/3DViewer/settings/atoms/baseAtoms";
import { TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { userSelectedWellLogCurveNamesAtom } from "./settings/atoms/baseAtoms";
import {
    allSelectedWellLogCurves,
    selectedFieldIdentifierAtom,
    selectedWellboreAtom,
    wellLogTemplateTracks,
} from "./settings/atoms/derivedAtoms";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    curveNames: string[];
    requiredDataCurves: string[];
    templateTracks: TemplateTrack[];
    viewerHorizontal: boolean;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreAtom),
    curveNames: (get) => get(userSelectedWellLogCurveNamesAtom),
    templateTracks: (get) => get(wellLogTemplateTracks),
    requiredDataCurves: (get) => get(allSelectedWellLogCurves),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
};

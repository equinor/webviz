import type { WellboreHeader_api, WellboreLogCurveHeader_api, WellborePick_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    requiredCurvesAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreHeaderAtom,
    selectedWellborePicksAtom,
    wellLogTemplateTracksAtom,
} from "./settings/atoms/derivedAtoms";
import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "./settings/atoms/persistedAtoms";
import type { TemplateTrackConfig } from "./types";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    templateTracks: TemplateTrackConfig[];
    viewerHorizontal: boolean;
    padDataWithEmptyRows: boolean;
    selectedWellborePicks: WellborePick_api[];
    requiredCurves: WellboreLogCurveHeader_api[];
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreHeaderAtom),
    templateTracks: (get) => get(wellLogTemplateTracksAtom),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
    padDataWithEmptyRows: (get) => get(padDataWithEmptyRowsAtom),
    selectedWellborePicks: (get) => get(selectedWellborePicksAtom),
    requiredCurves: (get) => get(requiredCurvesAtom),
};

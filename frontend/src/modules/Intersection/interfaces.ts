import type { IntersectionType } from "@framework/types/intersection";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { ColorScale } from "@lib/utils/ColorScale";

import {
    gridLayerAtom,
    intersectionExtensionLengthAtom,
    intersectionTypeAtom,
    seismicColorScaleAtom,
    showGridlinesAtom,
    showSeismicAtom,
    zFactorAtom,
} from "./settings/atoms/baseAtoms";
import {
    layerManagerAtom,
    selectedCustomIntersectionPolylineIdAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreAtom,
} from "./settings/atoms/derivedAtoms";
import type { WellboreHeader } from "./typesAndEnums";
import type { LayerManager } from "./utils/layers/LayerManager";

export type SettingsToViewInterface = {
    fieldIdentifier: string | null;
    showGridlines: boolean;
    gridLayer: number;
    zFactor: number;
    intersectionExtensionLength: number;
    intersectionType: IntersectionType;
    seismicColorScale: ColorScale | null;
    showSeismic: boolean;
    selectedCustomIntersectionPolylineId: string | null;
    layerManager: LayerManager;
    wellboreHeader: WellboreHeader | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    fieldIdentifier: (get) => {
        return get(selectedFieldIdentifierAtom);
    },
    showGridlines: (get) => {
        return get(showGridlinesAtom);
    },
    gridLayer: (get) => {
        return get(gridLayerAtom);
    },
    zFactor: (get) => {
        return get(zFactorAtom);
    },
    intersectionExtensionLength: (get) => {
        return get(intersectionExtensionLengthAtom);
    },
    intersectionType: (get) => {
        return get(intersectionTypeAtom);
    },
    seismicColorScale: (get) => {
        return get(seismicColorScaleAtom);
    },
    showSeismic: (get) => {
        return get(showSeismicAtom);
    },
    selectedCustomIntersectionPolylineId: (get) => {
        return get(selectedCustomIntersectionPolylineIdAtom);
    },
    layerManager: (get) => {
        return get(layerManagerAtom);
    },
    wellboreHeader: (get) => {
        return get(selectedWellboreAtom);
    },
};

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { IntersectionType } from "@framework/types/intersection";
import { ColorScale } from "@lib/utils/ColorScale";

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
    selectedEnsembleIdentAtom,
    selectedWellboreAtom,
} from "./settings/atoms/derivedAtoms";
import { WellboreHeader } from "./typesAndEnums";
import { LayerManager } from "./utils/layers/LayerManager";

export type SettingsToViewInterface = {
    showGridlines: boolean;
    gridLayer: number;
    zFactor: number;
    intersectionExtensionLength: number;
    intersectionType: IntersectionType;
    seismicColorScale: ColorScale | null;
    showSeismic: boolean;
    ensembleIdent: EnsembleIdent | null;
    selectedCustomIntersectionPolylineId: string | null;
    layerManager: LayerManager;
    wellboreHeader: WellboreHeader | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
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
    ensembleIdent: (get) => {
        return get(selectedEnsembleIdentAtom);
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

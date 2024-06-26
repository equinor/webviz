import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { IntersectionType } from "@framework/types/intersection";
import { ColorScale } from "@lib/utils/ColorScale";

import {
    layerManagerAtom,
    selectedCustomIntersectionPolylineIdAtom,
    selectedEnsembleIdentAtom,
    selectedWellboreAtom,
} from "./settings/atoms/derivedAtoms";
import { LayerManager } from "./utils/layers/LayerManager";

export type SettingsToViewInterface = {
    baseStates: {
        showGridlines: boolean;
        gridLayer: number;
        zFactor: number;
        intersectionExtensionLength: number;
        intersectionType: IntersectionType;
        seismicColorScale: ColorScale | null;
        showSeismic: boolean;
    };
    derivedStates: {
        ensembleIdent: EnsembleIdent | null;
        selectedCustomIntersectionPolylineId: string | null;
        layerManager: LayerManager;
        wellboreHeader: {
            uuid: string;
            identifier: string;
            depthReferencePoint: string;
            depthReferenceElevation: number;
        } | null;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {
        showGridlines: false,
        gridLayer: 1,
        zFactor: 1,
        intersectionExtensionLength: 1000,
        intersectionType: IntersectionType.WELLBORE,
        seismicColorScale: null,
        showSeismic: false,
    },
    derivedStates: {
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
    },
};

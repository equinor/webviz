import { BoundingBox3d_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { ColorScale } from "@lib/utils/ColorScale";

import {
    colorScaleAtom,
    gridLayerAtom,
    intersectionExtensionLengthAtom,
    showGridlinesAtom,
    showIntersectionAtom,
    useCustomBoundsAtom,
} from "./settings/atoms/baseAtoms";
import {
    selectedGridCellIndexRangesAtom,
    selectedGridModelBoundingBox3dAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
    selectedWellboreUuidsAtom,
} from "./settings/atoms/derivedAtoms";
import { GridCellIndexRanges } from "./typesAndEnums";

type SettingsToViewInterface = {
    showGridlines: boolean;
    showIntersection: boolean;
    gridLayer: number;
    intersectionExtensionLength: number;
    colorScale: ColorScale | null;
    useCustomBounds: boolean;
    realization: number | null;
    wellboreUuids: string[];
    gridModelName: string | null;
    gridModelBoundingBox3d: BoundingBox3d_api | null;
    gridModelParameterName: string | null;
    gridModelParameterDateOrInterval: string | null;
    gridCellIndexRanges: GridCellIndexRanges;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    showGridlines: (get) => {
        return get(showGridlinesAtom);
    },
    showIntersection: (get) => {
        return get(showIntersectionAtom);
    },
    gridLayer: (get) => {
        return get(gridLayerAtom);
    },
    intersectionExtensionLength: (get) => {
        return get(intersectionExtensionLengthAtom);
    },
    colorScale: (get) => {
        return get(colorScaleAtom);
    },
    useCustomBounds: (get) => {
        return get(useCustomBoundsAtom);
    },
    realization: (get) => {
        return get(selectedRealizationAtom);
    },
    wellboreUuids: (get) => {
        return get(selectedWellboreUuidsAtom);
    },
    gridModelName: (get) => {
        return get(selectedGridModelNameAtom);
    },
    gridModelBoundingBox3d: (get) => {
        return get(selectedGridModelBoundingBox3dAtom);
    },
    gridModelParameterName: (get) => {
        return get(selectedGridModelParameterNameAtom);
    },
    gridModelParameterDateOrInterval: (get) => {
        return get(selectedGridModelParameterDateOrIntervalAtom);
    },
    gridCellIndexRanges: (get) => {
        return get(selectedGridCellIndexRangesAtom);
    },
};

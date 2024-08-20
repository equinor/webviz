import { BoundingBox3d_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { IntersectionType } from "@framework/types/intersection";
import { ColorScale } from "@lib/utils/ColorScale";

import {
    addCustomIntersectionPolylineEditModeActiveAtom,
    colorScaleAtom,
    editCustomIntersectionPolylineEditModeActiveAtom,
    gridLayerAtom,
    intersectionExtensionLengthAtom,
    intersectionTypeAtom,
    showGridlinesAtom,
    showIntersectionAtom,
    useCustomBoundsAtom,
} from "./settings/atoms/baseAtoms";
import {
    selectedCustomIntersectionPolylineIdAtom,
    selectedEnsembleIdentAtom,
    selectedGridCellIndexRangesAtom,
    selectedGridModelBoundingBox3dAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedHighlightedWellboreUuidAtom,
    selectedRealizationAtom,
    selectedWellboreUuidsAtom,
} from "./settings/atoms/derivedAtoms";
import { GridCellIndexRanges } from "./typesAndEnums";
import {
    editCustomIntersectionPolylineEditModeActiveAtom as viewEditCustomIntersectionPolylineEditModeActiveAtom,
    intersectionTypeAtom as viewIntersectionTypeAtom,
} from "./view/atoms/baseAtoms";

export type SettingsToViewInterface = {
    ensembleIdent: EnsembleIdent | null;
    highlightedWellboreUuid: string | null;
    customIntersectionPolylineId: string | null;
    intersectionType: IntersectionType;
    addCustomIntersectionPolylineEditModeActive: boolean;
    editCustomIntersectionPolylineEditModeActive: boolean;
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

export type ViewToSettingsInterface = {
    editCustomIntersectionPolylineEditModeActive: boolean;
    intersectionType: IntersectionType;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
    viewToSettings: ViewToSettingsInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    ensembleIdent: (get) => {
        return get(selectedEnsembleIdentAtom);
    },
    highlightedWellboreUuid: (get) => {
        return get(selectedHighlightedWellboreUuidAtom);
    },
    customIntersectionPolylineId: (get) => {
        return get(selectedCustomIntersectionPolylineIdAtom);
    },
    intersectionType: (get) => {
        return get(intersectionTypeAtom);
    },
    addCustomIntersectionPolylineEditModeActive: (get) => {
        return get(addCustomIntersectionPolylineEditModeActiveAtom);
    },
    editCustomIntersectionPolylineEditModeActive: (get) => {
        return get(editCustomIntersectionPolylineEditModeActiveAtom);
    },
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

export const viewToSettingsInterfaceInitialization: InterfaceInitialization<ViewToSettingsInterface> = {
    editCustomIntersectionPolylineEditModeActive: (get) => {
        return get(viewEditCustomIntersectionPolylineEditModeActiveAtom);
    },
    intersectionType: (get) => {
        return get(viewIntersectionTypeAtom);
    },
};

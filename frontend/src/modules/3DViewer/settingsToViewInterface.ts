import { BoundingBox3d_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { ColorScale } from "@lib/utils/ColorScale";

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

export type SettingsToViewInterface = {
    baseStates: {
        showGridlines: boolean;
        showIntersection: boolean;
        gridLayer: number;
        intersectionExtensionLength: number;
        colorScale: ColorScale | null;
        useCustomBounds: boolean;
    };
    derivedStates: {
        realization: number | null;
        wellboreUuids: string[];
        gridModelName: string | null;
        gridModelBoundingBox3d: BoundingBox3d_api | null;
        gridModelParameterName: string | null;
        gridModelParameterDateOrInterval: string | null;
        gridCellIndexRanges: GridCellIndexRanges;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {
        showGridlines: false,
        showIntersection: false,
        gridLayer: 1,
        intersectionExtensionLength: 1000,
        colorScale: null,
        useCustomBounds: false,
    },
    derivedStates: {
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
    },
};

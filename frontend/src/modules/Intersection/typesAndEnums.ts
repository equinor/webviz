import { PolylineIntersection_trans } from "./view/queries/queryDataTransforms";

export const CURVE_FITTING_EPSILON = 5; // meters

export enum IntersectionType {
    CUSTOM_POLYLINE = "custom-polyline",
    WELLBORE = "wellbore",
}

export type CustomIntersectionPolyline = {
    id: string;
    name: string;
    polyline: number[][];
};

export enum LayerType {
    GRID = "grid",
    SEISMIC = "seismic",
    SURFACES = "surfaces",
    WELLPICKS = "wellpicks",
}

export const LAYER_TYPE_TO_STRING_MAPPING = {
    [LayerType.GRID]: "Grid",
    [LayerType.SEISMIC]: "Seismic",
    [LayerType.SURFACES]: "Surfaces",
    [LayerType.WELLPICKS]: "Wellpicks",
};

export enum LayerActionType {
    ADD_LAYER = "add-layer",
    REMOVE_LAYER = "remove-layer",
    TOGGLE_LAYER_VISIBILITY = "toggle-layer-visibility",
    TOGGLE_LAYER_SETTINGS_VISIBILITY = "toggle-layer-settings-visibility",
    UPDATE_SETTING = "update-settings",
    MOVE_LAYER = "move-layer",
    CHANGE_ORDER = "change-order",
}

export type LayerActionPayloads = {
    [LayerActionType.ADD_LAYER]: { type: LayerType };
    [LayerActionType.REMOVE_LAYER]: { id: string };
    [LayerActionType.TOGGLE_LAYER_VISIBILITY]: { id: string };
    [LayerActionType.TOGGLE_LAYER_SETTINGS_VISIBILITY]: { id: string };
    [LayerActionType.UPDATE_SETTING]: { id: string; settings: Record<string, unknown> };
    [LayerActionType.MOVE_LAYER]: { id: string; moveToIndex: number };
    [LayerActionType.CHANGE_ORDER]: { orderedIds: string[] };
};

export type LayerAction<T extends LayerActionType> = {
    type: T;
    payload: LayerActionPayloads[T];
};

export type LayerActions = {
    [K in keyof LayerActionPayloads]: LayerActionPayloads[K] extends never
        ? { type: K }
        : { type: K; payload: LayerActionPayloads[K] };
}[keyof LayerActionPayloads];

export type PolylineIntersectionResult = {
    id: string;
    polylineIntersection: PolylineIntersection_trans | undefined;
};

export type CombinedPolylineIntersectionResults = {
    combinedPolylineIntersectionResults: PolylineIntersectionResult[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

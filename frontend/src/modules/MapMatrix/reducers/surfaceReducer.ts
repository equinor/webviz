import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { TimeType } from "@modules/_shared/Surface";

import { SurfaceReducerState, SurfaceSpecification, SyncedSettings } from "../types";

export enum SurfaceReducerActionType {
    SetEnsembleIdents,
    AddSurface,
    RemoveSurface,
    SetSurface,
    SetSyncedSettings,
    SetTimeMode,
    SetAttributeType,
    SetColorScaleGradientType,
}
type SurfaceReducerPayload = {
    [SurfaceReducerActionType.SetEnsembleIdents]: { ensembleIdents: EnsembleIdent[] };
    [SurfaceReducerActionType.AddSurface]: SurfaceSpecification;
    [SurfaceReducerActionType.RemoveSurface]: { id: string };
    [SurfaceReducerActionType.SetSurface]: { surfaceSpecification: SurfaceSpecification };
    [SurfaceReducerActionType.SetSyncedSettings]: { syncedSettings: SyncedSettings };
    [SurfaceReducerActionType.SetTimeMode]: { timeMode: TimeType };
    [SurfaceReducerActionType.SetAttributeType]: { attributeType: SurfaceAttributeType_api };
    [SurfaceReducerActionType.SetColorScaleGradientType]: { colorScaleGradientType: ColorScaleGradientType };
};
type SurfaceReducerActions = {
    [T in SurfaceReducerActionType]: {
        type: T;
        payload: SurfaceReducerPayload[T];
    };
}[SurfaceReducerActionType];

export function surfaceDispatcher(state: SurfaceReducerState, action: SurfaceReducerActions) {
    if (action.type === SurfaceReducerActionType.SetEnsembleIdents) {
        return {
            ...state,
            ensembleIdents: action.payload.ensembleIdents,
        };
    }
    if (action.type === SurfaceReducerActionType.AddSurface) {
        return {
            ...state,
            surfaceSpecifications: [...state.surfaceSpecifications, action.payload],
        };
    }
    if (action.type === SurfaceReducerActionType.RemoveSurface) {
        return {
            ...state,
            surfaceSpecifications: state.surfaceSpecifications.filter((surface) => surface.uuid !== action.payload.id),
        };
    }
    if (action.type === SurfaceReducerActionType.SetSurface) {
        const updatedSurfaceSpecifications = state.surfaceSpecifications.map((surface) =>
            surface.uuid === action.payload.surfaceSpecification.uuid ? action.payload.surfaceSpecification : surface
        );
        synchronizeSurfaceSpecifications(updatedSurfaceSpecifications, state.syncedSettings);
        return {
            ...state,
            surfaceSpecifications: updatedSurfaceSpecifications,
        };
    }
    if (action.type === SurfaceReducerActionType.SetSyncedSettings) {
        synchronizeSurfaceSpecifications(state.surfaceSpecifications, action.payload.syncedSettings);
        return {
            ...state,
            syncedSettings: action.payload.syncedSettings,
            surfaceSpecifications: state.surfaceSpecifications,
        };
    }
    if (action.type === SurfaceReducerActionType.SetTimeMode) {
        return {
            ...state,
            timeMode: action.payload.timeMode,
        };
    }
    if (action.type === SurfaceReducerActionType.SetAttributeType) {
        return {
            ...state,
            attributeType: action.payload.attributeType,
        };
    }
    if (action.type === SurfaceReducerActionType.SetColorScaleGradientType) {
        return {
            ...state,
            colorScaleGradientType: action.payload.colorScaleGradientType,
        };
    }
    return state;
}

function synchronizeSurfaceSpecifications(
    surfaceSpecifications: SurfaceSpecification[],
    syncedSettings: SyncedSettings
) {
    const firstSurfaceSpecification = surfaceSpecifications[0];
    surfaceSpecifications.forEach((surface, index) => {
        if (index !== 0) {
            if (syncedSettings.ensemble) {
                surface.ensembleIdent = firstSurfaceSpecification.ensembleIdent;
            }
            if (syncedSettings.name) {
                surface.surfaceName = firstSurfaceSpecification.surfaceName;
            }
            if (syncedSettings.attribute) {
                surface.surfaceAttribute = firstSurfaceSpecification.surfaceAttribute;
            }
            if (syncedSettings.timeOrInterval) {
                surface.surfaceTimeOrInterval = firstSurfaceSpecification.surfaceTimeOrInterval;
            }
            if (syncedSettings.realizationNum) {
                surface.realizationNum = firstSurfaceSpecification.realizationNum;
            }
        }
    });
}

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { SurfaceTimeType } from "@modules/_shared/Surface";
import { WellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import {
    SurfaceAttributeType,
    SurfaceReducerState,
    SyncedSettings,
    ViewSpecification,
    WellsSpecification,
} from "../types";

export enum SurfaceReducerActionType {
    SetEnsembleIdents,
    AddView,
    RemoveView,
    SetView,
    SetSyncedSettings,
    SetTimeMode,
    SetAttributeType,
    setWellsSpecification,
}
type SurfaceReducerPayload = {
    [SurfaceReducerActionType.SetEnsembleIdents]: { ensembleIdents: EnsembleIdent[] };
    [SurfaceReducerActionType.AddView]: ViewSpecification;
    [SurfaceReducerActionType.RemoveView]: { id: string };
    [SurfaceReducerActionType.SetView]: { viewSpecification: ViewSpecification };
    [SurfaceReducerActionType.SetSyncedSettings]: { syncedSettings: SyncedSettings };
    [SurfaceReducerActionType.SetTimeMode]: { timeMode: SurfaceTimeType };
    [SurfaceReducerActionType.SetAttributeType]: { attributeType: SurfaceAttributeType };
    [SurfaceReducerActionType.setWellsSpecification]: { wellsSpecification: WellsSpecification };
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
    if (action.type === SurfaceReducerActionType.AddView) {
        return {
            ...state,
            viewSpecifications: [...state.viewSpecifications, action.payload],
        };
    }
    if (action.type === SurfaceReducerActionType.RemoveView) {
        return {
            ...state,
            viewSpecifications: state.viewSpecifications.filter((view) => view.uuid !== action.payload.id),
        };
    }
    if (action.type === SurfaceReducerActionType.SetView) {
        const updatedViewSpecifications = state.viewSpecifications.map((surface) =>
            surface.uuid === action.payload.viewSpecification.uuid ? action.payload.viewSpecification : surface
        );

        return {
            ...state,
            viewSpecifications: synchronizeViewSpecifications(updatedViewSpecifications, state.syncedSettings),
        };
    }
    if (action.type === SurfaceReducerActionType.SetSyncedSettings) {
        return {
            ...state,
            syncedSettings: action.payload.syncedSettings,
            viewSpecifications: synchronizeViewSpecifications(state.viewSpecifications, action.payload.syncedSettings),
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
    if (action.type === SurfaceReducerActionType.setWellsSpecification) {
        return {
            ...state,
            wellsSpecification: action.payload.wellsSpecification,
        };
    }

    return state;
}

function synchronizeViewSpecifications(viewSpecifications: ViewSpecification[], syncedSettings: SyncedSettings) {
    if (viewSpecifications.length === 0) {
        return viewSpecifications;
    }
    const firstViewSpecification = viewSpecifications[0];

    // Create a new array with updated objects to ensure changes are detected
    const updatedViewSpecifications = viewSpecifications.map((view, index) => {
        if (index !== 0) {
            const updatedView = { ...view }; // Create a shallow copy
            if (syncedSettings.ensemble) {
                updatedView.ensembleIdent = firstViewSpecification.ensembleIdent;
            }
            if (syncedSettings.name) {
                updatedView.surfaceName = firstViewSpecification.surfaceName;
            }
            if (syncedSettings.attribute) {
                updatedView.surfaceAttribute = firstViewSpecification.surfaceAttribute;
            }
            if (syncedSettings.timeOrInterval) {
                updatedView.surfaceTimeOrInterval = firstViewSpecification.surfaceTimeOrInterval;
            }
            if (syncedSettings.realizationNum) {
                updatedView.realizationNum = firstViewSpecification.realizationNum;
            }
            if (syncedSettings.colorRange) {
                updatedView.colorRange = firstViewSpecification.colorRange;
            }
            if (syncedSettings.colorPaletteId) {
                updatedView.colorPaletteId = firstViewSpecification.colorPaletteId;
            }
            return updatedView;
        }
        return view;
    });

    return updatedViewSpecifications; // Return the new array for state update
}

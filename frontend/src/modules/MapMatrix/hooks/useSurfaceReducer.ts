import { useReducer } from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { TimeType } from "@modules/_shared/Surface";

import { SurfaceReducerActionType, surfaceDispatcher } from "../reducers/surfaceReducer";
import { SurfaceReducerState, SurfaceSpecification, SyncedSettings } from "../types";

export const initialSurfaceReducerState: SurfaceReducerState = {
    ensembleIdents: [],
    surfaceSpecifications: [],
    syncedSettings: {
        ensemble: false,
        name: false,
        attribute: false,
        timeOrInterval: false,
        realizationNum: false,
    },
    timeMode: TimeType.None,
    attributeType: SurfaceAttributeType_api.DEPTH,
    colorScaleGradientType: ColorScaleGradientType.Sequential,
};

export const useSurfaceReducer = () => {
    const [state, dispatch] = useReducer(surfaceDispatcher, initialSurfaceReducerState);

    const setEnsembleIdents = (ensembleIdents: EnsembleIdent[]) => {
        dispatch({
            type: SurfaceReducerActionType.SetEnsembleIdents,
            payload: { ensembleIdents },
        });
    };
    const addSurface = (surfaceSpecification: SurfaceSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.AddSurface,
            payload: surfaceSpecification,
        });
    };

    const removeSurface = (id: string) => {
        dispatch({
            type: SurfaceReducerActionType.RemoveSurface,
            payload: { id },
        });
    };

    const setSurface = (surfaceSpecification: SurfaceSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.SetSurface,
            payload: { surfaceSpecification },
        });
    };

    const setSyncedSettings = (syncedSettings: SyncedSettings) => {
        dispatch({
            type: SurfaceReducerActionType.SetSyncedSettings,
            payload: { syncedSettings },
        });
    };

    const setTimeMode = (timeMode: TimeType) => {
        dispatch({
            type: SurfaceReducerActionType.SetTimeMode,
            payload: { timeMode },
        });
    };

    const setAttributeType = (attributeType: SurfaceAttributeType_api) => {
        dispatch({
            type: SurfaceReducerActionType.SetAttributeType,
            payload: { attributeType },
        });
    };
    const setColorScaleGradientType = (colorScaleGradientType: ColorScaleGradientType) => {
        dispatch({
            type: SurfaceReducerActionType.SetColorScaleGradientType,
            payload: { colorScaleGradientType },
        });
    };

    return {
        state,
        setEnsembleIdents,
        addSurface,
        removeSurface,
        setSurface,
        setSyncedSettings,
        setTimeMode,
        setAttributeType,
        setColorScaleGradientType,
    };
};

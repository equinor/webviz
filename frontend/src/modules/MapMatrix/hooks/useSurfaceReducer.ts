import { useReducer } from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SurfaceTimeType } from "@modules/_shared/Surface";
import { WellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import { SurfaceReducerActionType, surfaceDispatcher } from "../reducers/surfaceReducer";
import { mapMatrixDefaultState } from "../state";
import {
    SurfaceAttributeType,
    SurfaceReducerState,
    SyncedSettings,
    ViewSpecification,
    WellsSpecification,
} from "../types";

export const initialSurfaceReducerState: SurfaceReducerState = {
    ensembleIdents: [],
    viewSpecifications: [],
    syncedSettings: {
        ensemble: false,
        name: false,
        attribute: false,
        timeOrInterval: false,
        realizationNum: false,
        colorRange: false,
        colorPaletteId: false,
    },
    timeMode: SurfaceTimeType.None,
    attributeType: SurfaceAttributeType.STATIC_ATTRIBUTE,
    wellsSpecification: mapMatrixDefaultState.wellsSpecification,
};

export const useSurfaceReducer = () => {
    const [state, dispatch] = useReducer(surfaceDispatcher, initialSurfaceReducerState);

    const setEnsembleIdents = (ensembleIdents: EnsembleIdent[]) => {
        dispatch({
            type: SurfaceReducerActionType.SetEnsembleIdents,
            payload: { ensembleIdents },
        });
    };
    const addView = (viewSpecification: ViewSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.AddView,
            payload: viewSpecification,
        });
    };

    const removeView = (id: string) => {
        dispatch({
            type: SurfaceReducerActionType.RemoveView,
            payload: { id },
        });
    };

    const setView = (viewSpecification: ViewSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.SetView,
            payload: { viewSpecification },
        });
    };

    const setSyncedSettings = (syncedSettings: SyncedSettings) => {
        dispatch({
            type: SurfaceReducerActionType.SetSyncedSettings,
            payload: { syncedSettings },
        });
    };

    const setTimeMode = (timeMode: SurfaceTimeType) => {
        dispatch({
            type: SurfaceReducerActionType.SetTimeMode,
            payload: { timeMode },
        });
    };

    const setAttributeType = (attributeType: SurfaceAttributeType) => {
        dispatch({
            type: SurfaceReducerActionType.SetAttributeType,
            payload: { attributeType },
        });
    };
    const setWellsSpecification = (wellsSpecification: WellsSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.setWellsSpecification,
            payload: { wellsSpecification },
        });
    };

    return {
        state,
        setEnsembleIdents,
        addView,
        removeView,
        setView,
        setSyncedSettings,
        setTimeMode,
        setAttributeType,
        setWellsSpecification,
    };
};

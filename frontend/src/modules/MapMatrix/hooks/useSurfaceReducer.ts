import { useReducer } from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { SurfaceTimeType } from "@modules/_shared/Surface";
import { WellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import { SurfaceReducerActionType, surfaceDispatcher } from "../reducers/surfaceReducer";
import { SurfaceAttributeType, SurfaceReducerState, SurfaceSpecification, SyncedSettings } from "../types";

export const initialSurfaceReducerState: SurfaceReducerState = {
    ensembleIdents: [],
    surfaceSpecifications: [],
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
    attributeType: SurfaceAttributeType.PROPERTY,
    wellAddresses: [],
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
    const setWellBoreAddresses = (wellAddresses: WellBoreAddress[]) => {
        dispatch({
            type: SurfaceReducerActionType.SetWellBoreAddresses,
            payload: { wellAddresses },
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
        setWellBoreAddresses,
    };
};

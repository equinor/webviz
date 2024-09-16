import { apiService } from "@framework/ApiService";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";
import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "@modules/3DViewer/view/queries/queryDataTransforms";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationGridContext } from "./RealizationGridContext";
import { RealizationGridSettings } from "./types";

import { LayerDelegate } from "../../../delegates/LayerDelegate";
import { Layer } from "../../../interfaces";

export class RealizationGridLayer
    implements
        Layer<
            RealizationGridSettings,
            {
                gridSurfaceData: GridSurface_trans;
                gridParameterData: GridMappedProperty_trans;
            }
        >
{
    private _layerDelegate: LayerDelegate<
        RealizationGridSettings,
        {
            gridSurfaceData: GridSurface_trans;
            gridParameterData: GridMappedProperty_trans;
        }
    >;
    private _itemDelegate: ItemDelegate;

    constructor() {
        this._itemDelegate = new ItemDelegate("Realization Grid layer");
        this._layerDelegate = new LayerDelegate(this, new RealizationGridContext());
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<
        RealizationGridSettings,
        {
            gridSurfaceData: GridSurface_trans;
            gridParameterData: GridMappedProperty_trans;
        }
    > {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationGridSettings,
        newSettings: RealizationGridSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fechData(queryClient: QueryClient): Promise<{
        gridSurfaceData: GridSurface_trans;
        gridParameterData: GridMappedProperty_trans;
    }> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const gridName = settings[SettingType.GRID_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.GRID_ATTRIBUTE].getDelegate().getValue();
        let timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }
        let availableDimensions = settings[SettingType.GRID_LAYER].getDelegate().getAvailableValues();
        if (!availableDimensions.length || availableDimensions[0] === null) {
            availableDimensions = [0, 0, 0];
        }
        const layerIndex = settings[SettingType.GRID_LAYER].getDelegate().getValue();
        const iMin = 0;
        const iMax = availableDimensions[0] || 0;
        const jMin = 0;
        const jMax = availableDimensions[1] || 0;
        const kMin = layerIndex || 0;
        const kMax = layerIndex || 0;
        const queryKey = [
            "gridParameter",
            ensembleIdent,
            gridName,
            attribute,
            timeOrInterval,
            realizationNum,
            iMin,
            iMax,
            jMin,
            jMax,
            kMin,
            kMax,
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const gridParameterPromise = queryClient
            .fetchQuery({
                queryKey,
                queryFn: () =>
                    apiService.grid3D.gridParameter(
                        ensembleIdent?.getCaseUuid() ?? "",
                        ensembleIdent?.getEnsembleName() ?? "",
                        gridName ?? "",
                        attribute ?? "",
                        realizationNum ?? 0,
                        timeOrInterval,
                        iMin,
                        iMax - 1,
                        jMin,
                        jMax - 1,
                        kMin,
                        kMax
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then(transformGridMappedProperty);

        const gridSurfacePromise = queryClient
            .fetchQuery({
                queryKey: ["getGridData", ensembleIdent, gridName, realizationNum, iMin, iMax, jMin, jMax, kMin, kMax],
                queryFn: () =>
                    apiService.grid3D.gridSurface(
                        ensembleIdent?.getCaseUuid() ?? "",
                        ensembleIdent?.getEnsembleName() ?? "",
                        gridName ?? "",
                        realizationNum ?? 0,
                        iMin,
                        iMax - 1,
                        jMin,
                        jMax - 1,
                        kMin,
                        kMax
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then(transformGridSurface);

        return Promise.all([gridSurfacePromise, gridParameterPromise]).then(([gridSurfaceData, gridParameterData]) => ({
            gridSurfaceData,
            gridParameterData,
        }));
    }
}

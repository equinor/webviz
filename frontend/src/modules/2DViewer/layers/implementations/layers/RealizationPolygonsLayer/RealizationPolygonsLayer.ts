import { PolygonData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { LayerDelegate } from "@modules/2DViewer/layers/delegates/LayerDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationPolygonsContext } from "./RealizationPolygonsContext";
import { RealizationPolygonsSettings } from "./types";

import { Layer } from "../../../interfaces";

export class RealizationPolygonsLayer implements Layer<RealizationPolygonsSettings, PolygonData_api[]> {
    private _layerDelegate: LayerDelegate<RealizationPolygonsSettings, PolygonData_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor() {
        this._itemDelegate = new ItemDelegate("Realization Polygons");
        this._layerDelegate = new LayerDelegate(this, new RealizationPolygonsContext());
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<RealizationPolygonsSettings, PolygonData_api[]> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationPolygonsSettings,
        newSettings: RealizationPolygonsSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fechData(queryClient: QueryClient): Promise<PolygonData_api[]> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const polygonsName = settings[SettingType.POLYGONS_NAME].getDelegate().getValue();
        const polygonsAttribute = settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().getValue();

        const queryKey = [
            "getPolygonsData",
            ensembleIdent?.getCaseUuid() ?? "",
            ensembleIdent?.getEnsembleName() ?? "",
            realizationNum ?? 0,
            polygonsName ?? "",
            polygonsAttribute ?? "",
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient.fetchQuery({
            queryKey,
            queryFn: () =>
                apiService.polygons.getPolygonsData(
                    ensembleIdent?.getCaseUuid() ?? "",
                    ensembleIdent?.getEnsembleName() ?? "",
                    realizationNum ?? 0,
                    polygonsName ?? "",
                    polygonsAttribute ?? ""
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });

        return promise;
    }
}

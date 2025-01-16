import { PolygonData_api, getPolygonsDataOptions } from "@api";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { BoundingBox, Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationPolygonsSettingsContext } from "./RealizationPolygonsSettingsContext";
import { RealizationPolygonsSettings } from "./types";

export class RealizationPolygonsLayer implements Layer<RealizationPolygonsSettings, PolygonData_api[]> {
    private _layerDelegate: LayerDelegate<RealizationPolygonsSettings, PolygonData_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Realization Polygons", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationPolygonsSettingsContext(layerManager),
            LayerColoringType.NONE
        );
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

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const bbox: BoundingBox = {
            x: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
            y: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
            z: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
        };

        for (const polygon of data) {
            for (const point of polygon.x_arr) {
                bbox.x[0] = Math.min(bbox.x[0], point);
                bbox.x[1] = Math.max(bbox.x[1], point);
            }
            for (const point of polygon.y_arr) {
                bbox.y[0] = Math.min(bbox.y[0], point);
                bbox.y[1] = Math.max(bbox.y[1], point);
            }
            for (const point of polygon.z_arr) {
                bbox.z[0] = Math.min(bbox.z[0], point);
                bbox.z[1] = Math.max(bbox.z[1], point);
            }
        }

        return bbox;
    }

    fetchData(queryClient: QueryClient): Promise<PolygonData_api[]> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const polygonsName = settings[SettingType.POLYGONS_NAME].getDelegate().getValue();
        const polygonsAttribute = settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().getValue();

        const queryOptions = getPolygonsDataOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                name: polygonsName ?? "",
                attribute: polygonsAttribute ?? "",
            },
        });

        this._layerDelegate.registerQueryKey(queryOptions.queryKey);

        const promise = queryClient.fetchQuery({
            ...getPolygonsDataOptions({
                query: {
                    case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                    ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                    realization_num: realizationNum ?? 0,
                    name: polygonsName ?? "",
                    attribute: polygonsAttribute ?? "",
                },
            }),
        });

        return promise;
    }

    serializeState(): SerializedLayer<RealizationPolygonsSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationPolygonsSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationPolygonsLayer);

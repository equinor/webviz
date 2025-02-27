import { SurfaceDataPng_api, SurfaceTimeType_api, getSurfaceDataOptions } from "@api";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { DataLayer, LayerColoringType } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { DataLayerManager } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import {
    BoundingBox,
    CustomDataLayerImplementation,
    SerializedLayer,
} from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { StatisticalSurfaceSettingsContext } from "./StatisticalSurfaceSettingsContext";
import { StatisticalSurfaceSettings } from "./types";

export class StatisticalSurfaceLayer
    implements CustomDataLayerImplementation<StatisticalSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _itemDelegate: ItemDelegate;
    private _layerDelegate: DataLayer<StatisticalSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>;

    constructor(layerManager: DataLayerManager) {
        this._itemDelegate = new ItemDelegate("Statistical Surface", layerManager);
        this._layerDelegate = new DataLayer(
            this,
            layerManager,
            new StatisticalSurfaceSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): DataLayer<StatisticalSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: StatisticalSurfaceSettings,
        newSettings: StatisticalSurfaceSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return {
            x: [data.transformed_bbox_utm.min_x, data.transformed_bbox_utm.max_x],
            y: [data.transformed_bbox_utm.min_y, data.transformed_bbox_utm.max_y],
            z: [0, 0],
        };
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    fetchData(queryClient: QueryClient): Promise<SurfaceDataFloat_trans | SurfaceDataPng_api> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();
        const workbenchSession = this.getLayerDelegate().getLayerManager().getWorkbenchSession();
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        const statisticFunction = settings[SettingType.STATISTIC_FUNCTION].getDelegate().getValue();
        const sensitivityNameCasePair = settings[SettingType.SENSITIVITY].getDelegate().getValue();

        if (ensembleIdent && surfaceName && attribute) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);

            // Get filtered realizations from workbench
            let filteredRealizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(ensembleIdent)
                .getFilteredRealizations();
            const currentEnsemble = workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent);

            // If sensitivity is set, filter realizations further to only include the realizations that are in the sensitivity
            if (sensitivityNameCasePair) {
                const sensitivity = currentEnsemble
                    ?.getSensitivities()
                    ?.getCaseByName(sensitivityNameCasePair.sensitivityName, sensitivityNameCasePair.sensitivityCase);

                const sensitivityRealizations = sensitivity?.realizations ?? [];

                filteredRealizations = filteredRealizations.filter((realization) =>
                    sensitivityRealizations.includes(realization)
                );
            }

            // If realizations are filtered, update the address
            const allRealizations = currentEnsemble?.getRealizations() ?? [];
            if (!isEqual([...allRealizations], [...filteredRealizations])) {
                addrBuilder.withStatisticRealizations([...filteredRealizations]);
            }

            if (timeOrInterval !== SurfaceTimeType_api.NO_TIME) {
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }
            addrBuilder.withStatisticFunction(statisticFunction);
            surfaceAddress = addrBuilder.buildStatisticalAddress();
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const queryOptions = getSurfaceDataOptions({
            query: {
                surf_addr_str: surfAddrStr ?? "",
                data_format: "png",
                resample_to_def_str: null,
            },
        });

        this._layerDelegate.registerQueryKey(queryOptions.queryKey);

        const promise = queryClient
            .fetchQuery({
                ...queryOptions,
            })
            .then((data) => transformSurfaceData(data));

        return promise;
    }

    serializeState(): SerializedLayer<StatisticalSurfaceSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<StatisticalSurfaceSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(StatisticalSurfaceLayer);

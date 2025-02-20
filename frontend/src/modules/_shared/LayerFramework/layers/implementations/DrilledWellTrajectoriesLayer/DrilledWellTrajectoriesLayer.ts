import { WellboreTrajectory_api, getWellTrajectoriesOptions } from "@api";
import * as bbox from "@lib/utils/boundingBox";
import * as vec3 from "@lib/utils/vec3";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { DrilledWellTrajectoriesSettingsContext } from "./DrilledWellTrajectoriesSettingsContext";
import { DrilledWellTrajectoriesSettings } from "./types";

export class DrilledWellTrajectoriesLayer implements Layer<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]> {
    private _layerDelegate: LayerDelegate<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Drilled Wellbore trajectories", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new DrilledWellTrajectoriesSettingsContext(layerManager),
            LayerColoringType.NONE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: DrilledWellTrajectoriesSettings,
        newSettings: DrilledWellTrajectoriesSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): bbox.BBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const boundingBox = bbox.create(
            vec3.create(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
            vec3.create(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
        );

        for (const trajectory of data) {
            for (const point of trajectory.eastingArr) {
                boundingBox.min.x = Math.min(boundingBox.min.x, point);
                boundingBox.max.x = Math.max(boundingBox.max.x, point);
            }
            for (const point of trajectory.northingArr) {
                boundingBox.min.y = Math.min(boundingBox.min.y, point);
                boundingBox.max.y = Math.max(boundingBox.max.y, point);
            }
            for (const point of trajectory.tvdMslArr) {
                boundingBox.min.z = Math.min(boundingBox.min.z, point);
                boundingBox.max.z = Math.max(boundingBox.max.z, point);
            }
        }

        return boundingBox;
    }

    fetchData(queryClient: QueryClient): Promise<WellboreTrajectory_api[]> {
        const workbenchSession = this.getSettingsContext().getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const selectedWellboreHeaders = settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue();
        let selectedWellboreUuids: string[] = [];
        if (selectedWellboreHeaders) {
            selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
        }

        let fieldIdentifier: string | null = null;
        if (ensembleIdent) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                fieldIdentifier = ensemble.getFieldIdentifier();
            }
        }

        const queryKey = ["getWellTrajectories", fieldIdentifier];
        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient
            .fetchQuery({
                ...getWellTrajectoriesOptions({
                    query: { field_identifier: fieldIdentifier ?? "" },
                }),
                staleTime: 1800000, // TODO: Both stale and gcTime are set to 30 minutes for now since SMDA is quite slow for fields with many wells - this should be adjusted later
                gcTime: 1800000,
            })
            .then((response: WellboreTrajectory_api[]) => {
                return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
            });

        return promise;
    }

    serializeState(): SerializedLayer<DrilledWellTrajectoriesSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<DrilledWellTrajectoriesSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(DrilledWellTrajectoriesLayer);

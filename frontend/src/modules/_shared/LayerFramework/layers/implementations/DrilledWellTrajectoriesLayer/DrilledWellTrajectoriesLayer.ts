import { WellboreTrajectory_api, getWellTrajectoriesOptions } from "@api";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { DataLayer, LayerColoringType } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { DataLayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/DataLayerManager";
import {
    BoundingBox,
    CustomDataLayerImplementation,
    SerializedLayer,
} from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { DrilledWellTrajectoriesSettingsContext } from "./DrilledWellTrajectoriesSettingsContext";
import { DrilledWellTrajectoriesSettings } from "./types";

export class DrilledWellTrajectoriesLayer
    implements CustomDataLayerImplementation<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]>
{
    private _layerDelegate: DataLayer<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: DataLayerManager) {
        this._itemDelegate = new ItemDelegate("Drilled Wellbore trajectories", layerManager);
        this._layerDelegate = new DataLayer(
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

    getLayerDelegate(): DataLayer<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: DrilledWellTrajectoriesSettings,
        newSettings: DrilledWellTrajectoriesSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const bbox: BoundingBox = {
            x: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
            y: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
            z: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
        };

        for (const trajectory of data) {
            for (const point of trajectory.eastingArr) {
                bbox.x[0] = Math.min(bbox.x[0], point);
                bbox.x[1] = Math.max(bbox.x[1], point);
            }
            for (const point of trajectory.northingArr) {
                bbox.y[0] = Math.min(bbox.y[0], point);
                bbox.y[1] = Math.max(bbox.y[1], point);
            }
            for (const point of trajectory.tvdMslArr) {
                bbox.z[0] = Math.min(bbox.z[0], point);
                bbox.z[1] = Math.max(bbox.z[1], point);
            }
        }

        return bbox;
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

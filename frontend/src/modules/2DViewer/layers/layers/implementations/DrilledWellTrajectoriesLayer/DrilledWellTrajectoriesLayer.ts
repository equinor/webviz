import { WellboreTrajectory_api, getWellTrajectoriesOptions } from "@api";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { LayerManager } from "@modules/2DViewer/layers/framework/LayerManager/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/layers/LayerRegistry";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { DrilledWellTrajectoriesSettingsContext } from "./DrilledWellTrajectoriesSettingsContext";
import { DrilledWellTrajectoriesSettings } from "./types";

import { LayerColoringType, LayerDelegate } from "../../../delegates/LayerDelegate";
import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";

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

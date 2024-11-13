import { WellborePick_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/LayerRegistry";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { SettingType } from "@modules/2DViewer/layers/implementations/settings/settingsTypes";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { DrilledWellborePicksContext } from "./DrilledWellborePicksContext";
import { DrilledWellborePicksSettings } from "./types";

import { LayerColoringType, LayerDelegate } from "../../../delegates/LayerDelegate";
import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";

export class DrilledWellborePicksLayer implements Layer<DrilledWellborePicksSettings, WellborePick_api[]> {
    private _layerDelegate: LayerDelegate<DrilledWellborePicksSettings, WellborePick_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Drilled Wellbore picks", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new DrilledWellborePicksContext(layerManager),
            LayerColoringType.NONE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<DrilledWellborePicksSettings, WellborePick_api[]> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: DrilledWellborePicksSettings,
        newSettings: DrilledWellborePicksSettings
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
            bbox.x[0] = Math.min(bbox.x[0], trajectory.easting);
            bbox.x[1] = Math.max(bbox.x[1], trajectory.easting);

            bbox.y[0] = Math.min(bbox.y[0], trajectory.northing);
            bbox.y[1] = Math.max(bbox.y[1], trajectory.northing);

            bbox.z[0] = Math.min(bbox.z[0], trajectory.tvdMsl);
            bbox.z[1] = Math.max(bbox.z[1], trajectory.tvdMsl);
        }

        return bbox;
    }

    fechData(queryClient: QueryClient): Promise<WellborePick_api[]> {
        const workbenchSession = this.getSettingsContext().getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const selectedWellboreHeaders = settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue();
        let selectedWellboreUuids: string[] = [];
        if (selectedWellboreHeaders) {
            selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
        }
        const selectedPickIdentifier = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        let fieldIdentifier: string | null = null;
        if (ensembleIdent) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                fieldIdentifier = ensemble.getFieldIdentifier();
            }
        }

        const queryKey = ["getWellborePicksForPickIdentifier", fieldIdentifier, selectedPickIdentifier];
        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient
            .fetchQuery({
                queryKey,
                queryFn: () =>
                    apiService.well.getWellborePicksForPickIdentifier(
                        fieldIdentifier ?? "",
                        selectedPickIdentifier ?? ""
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((response: WellborePick_api[]) => {
                return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
            });

        return promise;
    }

    serializeState(): SerializedLayer<DrilledWellborePicksSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(state: SerializedLayer<DrilledWellborePicksSettings>): void {
        this._layerDelegate.deserializeState(state);
    }
}

LayerRegistry.registerLayer(DrilledWellborePicksLayer);

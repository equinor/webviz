import { WellborePick_api, getWellborePicksForPickIdentifierOptions } from "@api";
import { BBox } from "@lib/utils/boundingBox";
import { OBBox, fromAxisAlignedBoundingBox } from "@lib/utils/orientedBoundingBox";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { DrilledWellborePicksSettingsContext } from "./DrilledWellborePicksSettingsContext";
import { DrilledWellborePicksSettings } from "./types";

export class DrilledWellborePicksLayer implements Layer<DrilledWellborePicksSettings, WellborePick_api[]> {
    private _layerDelegate: LayerDelegate<DrilledWellborePicksSettings, WellborePick_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Drilled Wellbore picks", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new DrilledWellborePicksSettingsContext(layerManager),
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

    makeBoundingBox(): OBBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const bbox: BBox = {
            min: { x: Infinity, y: Infinity, z: Infinity },
            max: { x: -Infinity, y: -Infinity, z: -Infinity },
        };

        for (const pick of data) {
            bbox.min.x = Math.min(bbox.min.x, pick.easting);
            bbox.max.x = Math.max(bbox.max.x, pick.easting);
            bbox.min.y = Math.min(bbox.min.y, pick.northing);
            bbox.max.y = Math.max(bbox.max.y, pick.northing);
            bbox.min.z = Math.min(bbox.min.z, pick.tvdMsl);
            bbox.max.z = Math.max(bbox.max.z, pick.tvdMsl);
        }

        return fromAxisAlignedBoundingBox(bbox);
    }

    fetchData(queryClient: QueryClient): Promise<WellborePick_api[]> {
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
                ...getWellborePicksForPickIdentifierOptions({
                    query: {
                        field_identifier: fieldIdentifier ?? "",
                        pick_identifier: selectedPickIdentifier ?? "",
                    },
                }),
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

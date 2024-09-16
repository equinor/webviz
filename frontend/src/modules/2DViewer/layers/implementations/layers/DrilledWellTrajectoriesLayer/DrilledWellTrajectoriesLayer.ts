import { WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { DrilledWellTrajectoriesContext } from "./DrilledWellTrajectoriesContext";
import { DrilledWellTrajectoriesSettings } from "./types";

import { LayerDelegate } from "../../../delegates/LayerDelegate";
import { Layer } from "../../../interfaces";

export class DrilledWellTrajectoriesLayer implements Layer<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]> {
    private _layerDelegate: LayerDelegate<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor() {
        this._itemDelegate = new ItemDelegate("Drilled Well Trajectories");
        this._layerDelegate = new LayerDelegate(this, new DrilledWellTrajectoriesContext());
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

    fechData(queryClient: QueryClient): Promise<WellboreTrajectory_api[]> {
        const workbenchSession = this.getSettingsContext().getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const selectedWellboreHeaders = settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue();
        const selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
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
                queryKey,
                queryFn: () => apiService.well.getFieldWellTrajectories(fieldIdentifier ?? ""),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((response: WellboreTrajectory_api[]) => {
                return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
            });

        return promise;
    }
}

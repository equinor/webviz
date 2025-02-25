import { WellborePick_api } from "@api";
import { LayerAbstractImpl } from "@modules/_shared/LayerFramework/abstracts";
import { LayerColoringType } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import _ from "lodash";

import { WellPicksSettingsContext } from "./WellPicksLayerContext";
import { WellPicksLayerSettings } from "./types";

export class WellPicksLayer extends LayerAbstractImpl<WellPicksLayerSettings, WellborePick_api[]> {
    constructor(layerManager: LayerManager) {
        const settingsContext = new WellPicksSettingsContext(layerManager);

        super(layerManager, "Bore Well-picks", settingsContext, LayerColoringType.COLORSET);
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: WellPicksLayerSettings,
        newSettings: WellPicksLayerSettings
    ): boolean {
        return !_.isEqual(prevSettings, newSettings);
    }

    fetchData(): Promise<WellborePick_api[]> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const chosenWellPicks = settings[SettingType.WELL_PICKS].getDelegate().getValue() ?? [];

        // ! Not actually any reason for this to be a promise. No data to fetch, it's already available in the well-picks
        return new Promise((resolve) => {
            resolve(chosenWellPicks);
        });
    }
}

LayerRegistry.registerLayer(WellPicksLayer);

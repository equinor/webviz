import { WellborePick_api, getWellborePicksForPickIdentifierOptions } from "@api";
import {
    BoundingBox,
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { isEqual } from "lodash";

import { DrilledWellborePicksSettings } from "./settingsTypes";

export class DrilledWellborePicksLayer
    implements CustomDataLayerImplementation<DrilledWellborePicksSettings, WellborePick_api[]>
{
    settings!: [
        SettingType.ENSEMBLE,
        SettingType.SMDA_WELLBORE_HEADERS,
        SettingType.SURFACE_NAME,
        SettingType.ATTRIBUTE
    ];

    doSettingsChangesRequireDataRefetch(
        prevSettings: DrilledWellborePicksSettings,
        newSettings: DrilledWellborePicksSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox({
        getData,
    }: DataLayerInformationAccessors<DrilledWellborePicksSettings, WellborePick_api[]>): BoundingBox | null {
        const data = getData();
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

    fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<DrilledWellborePicksSettings>): Promise<WellborePick_api[]> {
        const selectedWellboreHeaders = getSetting(SettingType.SMDA_WELLBORE_HEADERS);
        let selectedWellboreUuids: string[] = [];
        if (selectedWellboreHeaders) {
            selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
        }
        const selectedPickIdentifier = getSetting(SettingType.SURFACE_NAME);
        const fieldIdentifier = getGlobalSetting("fieldId");

        const queryKey = ["getWellborePicksForPickIdentifier", fieldIdentifier, selectedPickIdentifier];
        registerQueryKey(queryKey);

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
}

LayerRegistry.registerLayer(DrilledWellborePicksLayer);

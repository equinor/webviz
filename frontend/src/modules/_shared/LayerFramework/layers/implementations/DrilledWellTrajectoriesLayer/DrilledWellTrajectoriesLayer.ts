import { WellboreTrajectory_api, getDrilledWellboreHeadersOptions, getWellTrajectoriesOptions } from "@api";
import {
    BoundingBox,
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    DefineDependenciesArgs,
    FetchDataParams,
    LayerColoringType,
} from "@modules/_shared/LayerFramework/interfaces";
import { MakeSettingTypesMap, SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { isEqual } from "lodash";

import { DrilledWellTrajectoriesSettings } from "./types";

type SettingsWithTypes = MakeSettingTypesMap<DrilledWellTrajectoriesSettings>;
export class DrilledWellTrajectoriesLayer
    implements CustomDataLayerImplementation<DrilledWellTrajectoriesSettings, WellboreTrajectory_api[]>
{
    settings: DrilledWellTrajectoriesSettings = [SettingType.ENSEMBLE, SettingType.SMDA_WELLBORE_HEADERS];
    getDefaultName() {
        return "Drilled Well Trajectories";
    }

    getColoringType(): LayerColoringType {
        return LayerColoringType.NONE;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox({
        getData,
    }: DataLayerInformationAccessors<SettingsWithTypes, WellboreTrajectory_api[]>): BoundingBox | null {
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

    fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<SettingsWithTypes, WellboreTrajectory_api[]>): Promise<WellboreTrajectory_api[]> {
        const ensembleIdent = getSetting(SettingType.ENSEMBLE);
        const fieldIdentifier = getGlobalSetting("fieldId");
        const selectedWellboreHeaders = getSetting(SettingType.SMDA_WELLBORE_HEADERS);
        let selectedWellboreUuids: string[] = [];
        if (selectedWellboreHeaders) {
            selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
        }

        const queryKey = ["getWellTrajectories", fieldIdentifier];
        registerQueryKey(queryKey);

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

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellTrajectoriesSettings, SettingsWithTypes>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });
        availableSettingsUpdater(SettingType.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });
    }
}

import { WellboreTrajectory_api, getDrilledWellboreHeadersOptions, getWellTrajectoriesOptions } from "@api";
import {
    CustomDataLayerImplementation,
    DefineDependenciesArgs,
    FetchDataParams,
    LayerColoringType,
} from "@modules/_shared/LayerFramework/interfaces";
import { MakeSettingTypesMap, Setting } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { isEqual } from "lodash";

const drilledWellTrajectoriesSettings = [Setting.ENSEMBLE, Setting.SMDA_WELLBORE_HEADERS] as const;
type DrilledWellTrajectoriesSettings = typeof drilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellTrajectoriesSettings>;

type Data = WellboreTrajectory_api[];

export class DrilledWellTrajectoriesLayer
    implements CustomDataLayerImplementation<DrilledWellTrajectoriesSettings, Data>
{
    settings = drilledWellTrajectoriesSettings;

    getDefaultSettingsValues(): MakeSettingTypesMap<DrilledWellTrajectoriesSettings> {
        return {
            [Setting.ENSEMBLE]: null,
            [Setting.SMDA_WELLBORE_HEADERS]: null,
        };
    }

    getDefaultName() {
        return "Drilled Well Trajectories";
    }

    getColoringType(): LayerColoringType {
        return LayerColoringType.NONE;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<SettingsWithTypes, Data>): Promise<Data> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const fieldIdentifier = getGlobalSetting("fieldId");
        const selectedWellboreHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);
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
            .then((response: Data) => {
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
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

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
        availableSettingsUpdater(Setting.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });
    }
}

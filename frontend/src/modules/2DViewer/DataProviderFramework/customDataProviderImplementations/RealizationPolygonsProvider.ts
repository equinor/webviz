import { isEqual } from "lodash";

import type { PolygonData_api } from "@api";
import { getPolygonsDataOptions, getPolygonsDirectoryOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

const realizationPolygonsSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.POLYGONS_ATTRIBUTE,
    Setting.POLYGONS_NAME,
] as const;
export type RealizationPolygonsSettings = typeof realizationPolygonsSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationPolygonsSettings>;

export type RealizationPolygonsData = PolygonData_api[];
export class RealizationPolygonsProvider
    implements CustomDataProviderImplementation<RealizationPolygonsSettings, RealizationPolygonsData>
{
    settings = realizationPolygonsSettings;

    getDefaultName(): string {
        return "Realization Polygons";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationPolygonsSettings>) {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

            return [...realizations];
        });

        const realizationPolygonsMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getPolygonsDirectoryOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.POLYGONS_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(new Set(data.map((polygonsMeta) => polygonsMeta.attribute_name))),
            ];

            return availableAttributes;
        });

        availableSettingsUpdater(Setting.POLYGONS_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(Setting.POLYGONS_ATTRIBUTE);
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!attribute || !data) {
                return [];
            }

            const availableSurfaceNames = [
                ...Array.from(
                    new Set(
                        data.filter((polygonsMeta) => polygonsMeta.attribute_name === attribute).map((el) => el.name),
                    ),
                ),
            ];

            return availableSurfaceNames;
        });
    }

    fetchData({
        getSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<RealizationPolygonsSettings, RealizationPolygonsData>): Promise<PolygonData_api[]> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const polygonsName = getSetting(Setting.POLYGONS_NAME);
        const polygonsAttribute = getSetting(Setting.POLYGONS_ATTRIBUTE);

        const queryOptions = getPolygonsDataOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                name: polygonsName ?? "",
                attribute: polygonsAttribute ?? "",
            },
        });

        registerQueryKey(queryOptions.queryKey);

        const promise = queryClient.fetchQuery({
            ...getPolygonsDataOptions({
                query: {
                    case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                    ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                    realization_num: realizationNum ?? 0,
                    name: polygonsName ?? "",
                    attribute: polygonsAttribute ?? "",
                },
            }),
        });

        return promise;
    }
}

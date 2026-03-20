import { isEqual } from "lodash";

import type { PolygonData_api } from "@api";
import { getPolygonsDataOptions, getPolygonsDirectoryOptions, PolygonsAttributeType_api } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

const realizationPolygonsSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.POLYGONS_ATTRIBUTE,
    Setting.POLYGONS_NAME,
    Setting.POLYGON_VISUALIZATION,
] as const;
const DISALLOWED_SURFACE_TYPES_FROM_API = [PolygonsAttributeType_api.FAULT_LINES];
export type RealizationPolygonsSettings = typeof realizationPolygonsSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationPolygonsSettings>;

export type RealizationPolygonsData = PolygonData_api[];
export class RealizationPolygonsProvider implements CustomDataProviderImplementation<
    RealizationPolygonsSettings,
    RealizationPolygonsData
> {
    settings = realizationPolygonsSettings;

    getDefaultName(): string {
        return "Polygons";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    setupBindings({ setting, makeSharedResult, queryClient }: SetupBindingsContext<RealizationPolygonsSettings>) {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return ensembles
                    .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                    .map((ensemble) => ensemble.getIdent());
            },
        });

        setting(Setting.REALIZATION).bindValueConstraints({
            read(read) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realizationFilterFunction: read.globalSetting("realizationFilterFunction"),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunction }) {
                if (!ensembleIdent) {
                    return [];
                }
                return [...realizationFilterFunction(ensembleIdent)];
            },
        });

        const polygonsMetadataDep = makeSharedResult({
            debugName: "PolygonsMetadata",
            read(read) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                if (!ensembleIdent) {
                    return null;
                }

                return await queryClient.fetchQuery({
                    ...getPolygonsDirectoryOptions({
                        query: {
                            case_uuid: ensembleIdent.getCaseUuid(),
                            ensemble_name: ensembleIdent.getEnsembleName(),
                            ...makeCacheBustingQueryParam(ensembleIdent),
                        },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.POLYGONS_ATTRIBUTE).bindValueConstraints({
            read(read) {
                return {
                    data: read.sharedResult(polygonsMetadataDep),
                };
            },
            resolve({ data }) {
                if (!data) {
                    return [];
                }
                const filteredPolygonsMeta = data.filter(
                    (polygonsMeta) => !DISALLOWED_SURFACE_TYPES_FROM_API.includes(polygonsMeta.attribute_type),
                );
                return [...new Set(filteredPolygonsMeta.map((polygonsMeta) => polygonsMeta.attribute_name))];
            },
        });

        setting(Setting.POLYGONS_NAME).bindValueConstraints({
            read(read) {
                return {
                    attribute: read.localSetting(Setting.POLYGONS_ATTRIBUTE),
                    data: read.sharedResult(polygonsMetadataDep),
                };
            },
            resolve({ attribute, data }) {
                if (!attribute || !data) {
                    return [];
                }
                return [
                    ...new Set(
                        data.filter((polygonsMeta) => polygonsMeta.attribute_name === attribute).map((el) => el.name),
                    ),
                ];
            },
        });
    }

    fetchData({
        getSetting,
        fetchQuery,
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
                ...makeCacheBustingQueryParam(ensembleIdent ?? null),
            },
        });

        const promise = fetchQuery({
            ...queryOptions,
        });

        return promise;
    }
}

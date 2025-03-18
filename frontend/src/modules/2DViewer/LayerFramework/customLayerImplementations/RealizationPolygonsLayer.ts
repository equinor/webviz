import { PolygonData_api, getPolygonsDataOptions, getPolygonsDirectoryOptions } from "@api";
import {
    CustomDataLayerImplementation,
    DefineDependenciesArgs,
    FetchDataParams,
    LayerColoringType,
} from "@modules/_shared/LayerFramework/interfaces";
import { MakeSettingTypesMap, Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";

import { isEqual } from "lodash";

const realizationPolygonsSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.POLYGONS_ATTRIBUTE,
    Setting.POLYGONS_NAME,
] as const;
export type RealizationPolygonsSettings = typeof realizationPolygonsSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationPolygonsSettings>;

export type Data = PolygonData_api[];
export class RealizationPolygonsLayer implements CustomDataLayerImplementation<RealizationPolygonsSettings, Data> {
    settings = realizationPolygonsSettings;

    getDefaultSettingsValues() {
        return {
            [Setting.ENSEMBLE]: null,
            [Setting.REALIZATION]: null,
            [Setting.POLYGONS_ATTRIBUTE]: null,
            [Setting.POLYGONS_NAME]: null,
        };
    }

    getDefaultName(): string {
        return "Realization Polygons";
    }

    getColoringType(): LayerColoringType {
        return LayerColoringType.NONE;
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
                        data.filter((polygonsMeta) => polygonsMeta.attribute_name === attribute).map((el) => el.name)
                    )
                ),
            ];

            return availableSurfaceNames;
        });
    }

    fetchData({
        getSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<RealizationPolygonsSettings, Data>): Promise<PolygonData_api[]> {
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

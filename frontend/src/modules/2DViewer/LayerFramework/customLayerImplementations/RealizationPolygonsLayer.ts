import { PolygonData_api, getPolygonsDataOptions, getPolygonsDirectoryOptions } from "@api";
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

const realizationPolygonsSettings = [
    SettingType.ENSEMBLE,
    SettingType.REALIZATION,
    SettingType.POLYGONS_ATTRIBUTE,
    SettingType.POLYGONS_NAME,
] as const;
type RealizationPolygonsSettings = typeof realizationPolygonsSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationPolygonsSettings>;

type Data = PolygonData_api[];
export class RealizationPolygonsLayer implements CustomDataLayerImplementation<RealizationPolygonsSettings, Data> {
    settings = realizationPolygonsSettings;

    getDefaultSettingsValues() {
        return {
            [SettingType.ENSEMBLE]: null,
            [SettingType.REALIZATION]: null,
            [SettingType.POLYGONS_ATTRIBUTE]: null,
            [SettingType.POLYGONS_NAME]: null,
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

    makeBoundingBox({ getData }: DataLayerInformationAccessors<SettingsWithTypes, Data>): BoundingBox | null {
        const data = getData();
        if (!data) {
            return null;
        }

        const bbox: BoundingBox = {
            x: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
            y: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
            z: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
        };

        for (const polygon of data) {
            for (const point of polygon.x_arr) {
                bbox.x[0] = Math.min(bbox.x[0], point);
                bbox.x[1] = Math.max(bbox.x[1], point);
            }
            for (const point of polygon.y_arr) {
                bbox.y[0] = Math.min(bbox.y[0], point);
                bbox.y[1] = Math.max(bbox.y[1], point);
            }
            for (const point of polygon.z_arr) {
                bbox.z[0] = Math.min(bbox.z[0], point);
                bbox.z[1] = Math.max(bbox.z[1], point);
            }
        }

        return bbox;
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationPolygonsSettings, SettingsWithTypes>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(SettingType.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

            return [...realizations];
        });

        const realizationPolygonsMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

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

        availableSettingsUpdater(SettingType.POLYGONS_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(new Set(data.map((polygonsMeta) => polygonsMeta.attribute_name))),
            ];

            return availableAttributes;
        });

        availableSettingsUpdater(SettingType.POLYGONS_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(SettingType.POLYGONS_ATTRIBUTE);
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
    }: FetchDataParams<SettingsWithTypes, Data>): Promise<PolygonData_api[]> {
        const ensembleIdent = getSetting(SettingType.ENSEMBLE);
        const realizationNum = getSetting(SettingType.REALIZATION);
        const polygonsName = getSetting(SettingType.POLYGONS_NAME);
        const polygonsAttribute = getSetting(SettingType.POLYGONS_ATTRIBUTE);

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

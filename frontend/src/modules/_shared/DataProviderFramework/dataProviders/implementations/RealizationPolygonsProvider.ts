import { isEqual } from "lodash";

import type { PolygonData_api } from "@api";
import { getPolygonsDataOptions, getPolygonsDirectoryOptions, PolygonsAttributeType_api } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import type { PolygonVisualizationSpec } from "@modules/_shared/components/PolygonVisualizationForm";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
    ProviderSnapshot,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
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

export type RealizationPolygonsProviderMeta = {
    polygonVisualization: PolygonVisualizationSpec;
};

export class RealizationPolygonsProvider
    implements
        CustomDataProviderImplementation<
            RealizationPolygonsSettings,
            RealizationPolygonsData,
            Record<string, never>,
            RealizationPolygonsProviderMeta
        >
{
    settings = realizationPolygonsSettings;

    makeProviderSnapshot(
        args: DataProviderInformationAccessors<RealizationPolygonsSettings, RealizationPolygonsData>,
    ): ProviderSnapshot<RealizationPolygonsData, RealizationPolygonsProviderMeta> {
        const { getSetting, getData } = args;
        const data = getData();
        const polygonVisualization = getSetting(Setting.POLYGON_VISUALIZATION);
        const attributeName = getSetting(Setting.POLYGONS_ATTRIBUTE) ?? "Polygons";

        return {
            data,
            valueRange: null,
            dataLabel: attributeName,
            meta: {
                polygonVisualization: polygonVisualization!,
            },
        };
    }

    getDefaultName(): string {
        return "Polygons";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    defineDependencies({
        helperDependency,
        valueConstraintsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationPolygonsSettings>) {
        valueConstraintsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        valueConstraintsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
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
                        ...makeCacheBustingQueryParam(ensembleIdent),
                    },
                    signal: abortSignal,
                }),
            });
        });

        valueConstraintsUpdater(Setting.POLYGONS_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!data) {
                return [];
            }
            const filteredPolygonsMeta = data.filter(
                (polygonsMeta) => !DISALLOWED_SURFACE_TYPES_FROM_API.includes(polygonsMeta.attribute_type),
            );

            const availableAttributes = [
                ...Array.from(new Set(filteredPolygonsMeta.map((polygonsMeta) => polygonsMeta.attribute_name))),
            ];
            return availableAttributes;
        });

        valueConstraintsUpdater(Setting.POLYGONS_NAME, ({ getHelperDependency, getLocalSetting }) => {
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

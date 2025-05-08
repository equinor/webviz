<<<<<<<< HEAD:frontend/src/modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceLayer.ts
import type { SurfaceAttributeType_api, SurfaceDataPng_api } from "@api";
========
import { isEqual } from "lodash";

import type { SurfaceDataPng_api } from "@api";
>>>>>>>> origin/dpf-improve-dep-tree:frontend/src/modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSurfaceProvider.ts
import { SurfaceTimeType_api, getRealizationSurfacesMetadataOptions, getSurfaceDataOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { FullSurfaceAddress } from "@modules/_shared/Surface";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import type { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";


const realizationSurfaceSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.SURFACE_NAME,
    Setting.TIME_OR_INTERVAL,
    Setting.COLOR_SCALE,
] as const;
export type RealizationSurfaceSettings = typeof realizationSurfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationSurfaceSettings>;

export enum SurfaceDataFormat {
    FLOAT = "float",
    PNG = "png",
}

export type RealizationSurfaceData =
    | { format: SurfaceDataFormat.FLOAT; surfaceData: SurfaceDataFloat_trans }
    | { format: SurfaceDataFormat.PNG; surfaceData: SurfaceDataPng_api };

export class RealizationSurfaceProvider
    implements CustomDataProviderImplementation<RealizationSurfaceSettings, RealizationSurfaceData>
{
    settings = realizationSurfaceSettings;

    private _dataFormat: SurfaceDataFormat;
    private _attributeTypesFilter: SurfaceAttributeType_api[] = [];

    constructor(attributeTypesFilter?: SurfaceAttributeType_api[], dataFormat?: SurfaceDataFormat) {
        this._attributeTypesFilter = attributeTypesFilter ?? [];
        this._dataFormat = dataFormat ?? SurfaceDataFormat.PNG;
    }

    getDefaultName(): string {
        return "Realization Surface";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(
            {
                ...prevSettings,
                colorScale: null,
            },
            { ...newSettings, colorScale: null },
        );
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<RealizationSurfaceSettings, RealizationSurfaceData>): boolean {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const surfaceName = getSetting(Setting.SURFACE_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);

        return (
            ensembleIdent !== null &&
            realizationNum !== null &&
            surfaceName !== null &&
            attribute !== null &&
            timeOrInterval !== null
        );
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<RealizationSurfaceSettings, RealizationSurfaceData>): [number, number] | null {
        const data = getData()?.surfaceData;
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationSurfaceSettings>) {
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

        const realizationSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getRealizationSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSurfaceMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(
                    new Set(
                        data.surfaces
                            .filter(
                                (el) =>
                                    this._attributeTypesFilter.includes(el.attribute_type) ||
                                    this._attributeTypesFilter.length === 0,
                            )
                            .map((surface) => surface.attribute_name),
                    ),
                ),
            ];

            return availableAttributes;
        });

        availableSettingsUpdater(Setting.SURFACE_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const data = getHelperDependency(realizationSurfaceMetadataDep);

            if (!attribute || !data) {
                return [];
            }

            const availableSurfaceNames = [
                ...Array.from(
                    new Set(
                        data.surfaces.filter((surface) => surface.attribute_name === attribute).map((el) => el.name),
                    ),
                ),
            ];

            return availableSurfaceNames;
        });

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const surfaceName = getLocalSetting(Setting.SURFACE_NAME);
            const data = getHelperDependency(realizationSurfaceMetadataDep);

            if (!attribute || !surfaceName || !data) {
                return [];
            }

            const availableTimeOrIntervals: string[] = [];
            const availableTimeTypes = [
                ...Array.from(
                    new Set(
                        data.surfaces
                            .filter((surface) => surface.attribute_name === attribute && surface.name === surfaceName)
                            .map((el) => el.time_type),
                    ),
                ),
            ];

            if (availableTimeTypes.includes(SurfaceTimeType_api.NO_TIME)) {
                availableTimeOrIntervals.push(SurfaceTimeType_api.NO_TIME);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.TIME_POINT)) {
                availableTimeOrIntervals.push(...data.time_points_iso_str);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.INTERVAL)) {
                availableTimeOrIntervals.push(...data.time_intervals_iso_str);
            }

            return availableTimeOrIntervals;
        });
    }

    fetchData({
        getSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<RealizationSurfaceSettings, RealizationSurfaceData>): Promise<RealizationSurfaceData> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();

        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const surfaceName = getSetting(Setting.SURFACE_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);

        if (ensembleIdent && surfaceName && attribute && realizationNum !== null) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withRealization(realizationNum);

            if (timeOrInterval !== SurfaceTimeType_api.NO_TIME) {
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }

            surfaceAddress = addrBuilder.buildRealizationAddress();
        } else {
            console.debug("RealizationSurfaceLayer: Missing required settings for fetching data");
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const surfaceDataOptions = getSurfaceDataOptions({
            query: {
                surf_addr_str: surfAddrStr ?? "",
                data_format: this._dataFormat,
                resample_to_def_str: null,
            },
        });

        registerQueryKey(surfaceDataOptions.queryKey);

        const promise = queryClient
            .fetchQuery(
                surfaceDataOptions,
            )
            .then((data) => ({ format: this._dataFormat, surfaceData: transformSurfaceData(data) }));

        return promise as Promise<RealizationSurfaceData>;
    }
}

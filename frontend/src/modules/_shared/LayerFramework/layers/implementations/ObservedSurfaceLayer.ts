import type { SurfaceDataPng_api } from "@api";
import { SurfaceTimeType_api, getObservedSurfacesMetadataOptions, getSurfaceDataOptions } from "@api";
import type {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/LayerFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import type { FullSurfaceAddress } from "@modules/_shared/Surface";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import type { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import { isEqual } from "lodash";

const observedSurfaceSettings = [
    Setting.ENSEMBLE,
    Setting.ATTRIBUTE,
    Setting.SURFACE_NAME,
    Setting.TIME_OR_INTERVAL,
    Setting.COLOR_SCALE,
] as const;
export type ObservedSurfaceSettings = typeof observedSurfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<ObservedSurfaceSettings>;

export enum SurfaceDataFormat {
    FLOAT = "float",
    PNG = "png",
}

export type ObservedSurfaceData =
    | { format: SurfaceDataFormat.FLOAT; surfaceData: SurfaceDataFloat_trans }
    | { format: SurfaceDataFormat.PNG; surfaceData: SurfaceDataPng_api };

export class ObservedSurfaceLayer
    implements CustomDataLayerImplementation<ObservedSurfaceSettings, ObservedSurfaceData>
{
    settings = observedSurfaceSettings;

    private _dataFormat: SurfaceDataFormat;

    constructor(dataFormat?: SurfaceDataFormat) {
        this._dataFormat = dataFormat ?? SurfaceDataFormat.PNG;
    }

    getDefaultName() {
        return "Observed Surface";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataLayerInformationAccessors<ObservedSurfaceSettings, ObservedSurfaceData>): [number, number] | null {
        const data = getData()?.surfaceData;
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<ObservedSurfaceSettings>) {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembleSet = workbenchSession.getEnsembleSet();

            const ensembleIdents = ensembleSet
                .getRegularEnsembleArray()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const observedSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getObservedSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(observedSurfaceMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(new Set(data.surfaces.map((surface) => surface.attribute_name))),
            ];

            return availableAttributes;
        });

        availableSettingsUpdater(Setting.SURFACE_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const data = getHelperDependency(observedSurfaceMetadataDep);

            if (!attribute || !data) {
                return [];
            }

            const availableSurfaceNames = [
                ...Array.from(
                    new Set(
                        data.surfaces.filter((surface) => surface.attribute_name === attribute).map((el) => el.name)
                    )
                ),
            ];

            return availableSurfaceNames;
        });

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const surfaceName = getLocalSetting(Setting.SURFACE_NAME);
            const data = getHelperDependency(observedSurfaceMetadataDep);

            if (!attribute || !surfaceName || !data) {
                return [];
            }

            const availableTimeOrIntervals: string[] = [];
            const availableTimeTypes = [
                ...Array.from(
                    new Set(
                        data.surfaces
                            .filter((surface) => surface.attribute_name === attribute && surface.name === surfaceName)
                            .map((el) => el.time_type)
                    )
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
    }: FetchDataParams<ObservedSurfaceSettings, ObservedSurfaceData>): Promise<ObservedSurfaceData> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();

        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const surfaceName = getSetting(Setting.SURFACE_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);

        if (ensembleIdent && surfaceName && attribute && timeOrInterval) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withTimeOrInterval(timeOrInterval);

            surfaceAddress = addrBuilder.buildObservedAddress();
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const queryKey = ["getSurfaceData", surfAddrStr, null, "png"];

        registerQueryKey(queryKey);

        const promise = queryClient
            .fetchQuery({
                ...getSurfaceDataOptions({
                    query: {
                        surf_addr_str: surfAddrStr ?? "",
                        data_format: this._dataFormat,
                        resample_to_def_str: null,
                    },
                }),
            })
            .then((data) => ({ format: this._dataFormat, surfaceData: transformSurfaceData(data) }));

        return promise as Promise<ObservedSurfaceData>;
    }
}

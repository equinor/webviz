import { isEqual } from "lodash-es";

import {
    getInitialFluidContactSurfaceDataOptions,
    getInitialFluidContactSurfacesMetadataOptions,
    type InitialFluidContactType_api,
} from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortStringArray } from "@lib/utils/arrays";
import { assertNonNull } from "@lib/utils/assertNonNull";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";

import {
    getAvailableEnsembleIdentsForField,
    getAvailableRealizationsForEnsembleIdent,
} from "../../dependencyFunctions/sharedSettingUpdaterFunctions";

import { SurfaceDataFormat, type SurfaceData } from "./types";

const initialFluidContactSurfaceSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.SURFACE_NAME,
    Setting.FLUID_CONTACT,
    Setting.DEPTH_COLOR_SCALE,
    Setting.CONTOURS,
] as const;

export type InitialFluidContactSurfaceSettings = typeof initialFluidContactSurfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<InitialFluidContactSurfaceSettings>;

export class InitialFluidContactSurfaceProvider implements CustomDataProviderImplementation<
    InitialFluidContactSurfaceSettings,
    SurfaceData
> {
    settings = initialFluidContactSurfaceSettings;

    getDefaultName(): string {
        return "Initial Fluid Contact Surface";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<InitialFluidContactSurfaceSettings, SurfaceData>): [number, number] | null {
        const surfaceData = getData()?.surfaceData;
        return surfaceData ? [surfaceData.value_min, surfaceData.value_max] : null;
    }

    setupBindings({
        setting,
        makeSharedResult,
        queryClient,
    }: SetupBindingsContext<InitialFluidContactSurfaceSettings>): void {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
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
                return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunction);
            },
        });

        const metadata = makeSharedResult({
            debugName: "InitialFluidContactSurfaceMetadata",
            read(read) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                if (!ensembleIdent) {
                    return null;
                }
                return await queryClient.fetchQuery({
                    ...getInitialFluidContactSurfacesMetadataOptions({
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

        setting(Setting.FLUID_CONTACT).bindValueConstraints({
            read(read) {
                return { metadata: read.sharedResult(metadata) };
            },
            resolve({ metadata }) {
                return [...new Set(metadata?.map((item) => item.contact) ?? [])].sort();
            },
        });

        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read(read) {
                return {
                    contact: read.localSetting(Setting.FLUID_CONTACT),
                    metadata: read.sharedResult(metadata),
                };
            },
            resolve({ contact, metadata }) {
                const names = metadata?.filter((item) => item.contact === contact).map((item) => item.name) ?? [];
                return sortStringArray([...new Set(names)], []);
            },
        });
    }

    fetchData({
        getSetting,
        fetchQuery,
    }: FetchDataParams<InitialFluidContactSurfaceSettings, SurfaceData>): Promise<SurfaceData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const realizationNum = assertNonNull(getSetting(Setting.REALIZATION), "No realization selected");
        const surfaceName = assertNonNull(getSetting(Setting.SURFACE_NAME), "No surface selected");
        const contact = assertNonNull(getSetting(Setting.FLUID_CONTACT), "No fluid contact selected");

        const queryOptions = getInitialFluidContactSurfaceDataOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                realization_num: realizationNum,
                name: surfaceName,
                contact: contact as InitialFluidContactType_api,
                data_format: SurfaceDataFormat.FLOAT,
                resample_to_def_str: null,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return fetchQuery(queryOptions).then((data) => ({
            format: SurfaceDataFormat.FLOAT,
            surfaceData: transformSurfaceData(data),
        })) as Promise<SurfaceData>;
    }
}

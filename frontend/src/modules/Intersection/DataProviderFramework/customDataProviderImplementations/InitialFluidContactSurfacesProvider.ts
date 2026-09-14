import { isEqual } from "lodash-es";

import type { SurfaceIntersectionData_api } from "@api";
import {
    SurfaceStandardResult_api,
    getInitialFluidContactSurfacesMetadataOptions,
    postGetSurfaceIntersectionOptions,
} from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortStringArray } from "@lib/utils/arrays";
import { assertNonNull } from "@lib/utils/assertNonNull";
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchWellboreHeaders,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableIntersectionOptions,
    getAvailableRealizationsForEnsembleIdent,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { createValidExtensionLength } from "@modules/_shared/DataProviderFramework/settings/utils/extensionLengthUtils";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";

import { createResampledPolylinePointsAndCumulatedLengthArray } from "./utils";

const initialFluidContactSurfacesSettings = [
    Setting.INTERSECTION,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.SURFACE_NAME,
    Setting.FLUID_CONTACT,
    Setting.COLOR_SET,
] as const;

export type InitialFluidContactSurfacesSettings = typeof initialFluidContactSurfacesSettings;
type SettingsWithTypes = MakeSettingTypesMap<InitialFluidContactSurfacesSettings>;

export type InitialFluidContactSurfacesStoredData = {
    polylineWithSectionLengths: PolylineWithSectionLengths;
};

export type InitialFluidContactSurfacesData = SurfaceIntersectionData_api[];

export class InitialFluidContactSurfacesProvider implements CustomDataProviderImplementation<
    InitialFluidContactSurfacesSettings,
    InitialFluidContactSurfacesData,
    InitialFluidContactSurfacesStoredData
> {
    settings = initialFluidContactSurfacesSettings;

    getDefaultName(): string {
        return "Initial Fluid Contact Surface";
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: SettingsWithTypes | null,
        newSettings: SettingsWithTypes,
    ): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings.intersection, newSettings.intersection) ||
            !isEqual(prevSettings.ensemble, newSettings.ensemble) ||
            !isEqual(prevSettings.realization, newSettings.realization) ||
            !isEqual(prevSettings.fluidContact, newSettings.fluidContact) ||
            !isEqual(prevSettings.surfaceName, newSettings.surfaceName)
        );
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<
        InitialFluidContactSurfacesSettings,
        InitialFluidContactSurfacesData,
        InitialFluidContactSurfacesStoredData
    >): boolean {
        return (
            getSetting(Setting.INTERSECTION) !== null &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.FLUID_CONTACT) !== null &&
            getSetting(Setting.SURFACE_NAME) !== null
        );
    }

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<InitialFluidContactSurfacesSettings, InitialFluidContactSurfacesStoredData>): void {
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

        const wellboreHeaders = makeSharedResult({
            debugName: "WellboreHeaders",
            read(read) {
                return { fieldIdentifier: read.globalSetting("fieldId") };
            },
            async resolve({ fieldIdentifier }, { abortSignal }) {
                return fetchWellboreHeaders(fieldIdentifier, abortSignal, queryClient);
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read(read) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeaders),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ wellboreHeaders: headers, intersectionPolylines, fieldIdentifier }) {
                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );
                return getAvailableIntersectionOptions(headers ?? [], fieldIntersectionPolylines);
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
                return queryClient.fetchQuery({
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
            resolve({ metadata: surfaceMetadata }) {
                return [...new Set(surfaceMetadata?.map((item) => item.contact) ?? [])].sort();
            },
        });

        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read(read) {
                return {
                    contact: read.localSetting(Setting.FLUID_CONTACT),
                    metadata: read.sharedResult(metadata),
                };
            },
            resolve({ contact, metadata: surfaceMetadata }) {
                const names =
                    surfaceMetadata?.filter((item) => item.contact === contact).map((item) => item.name) ?? [];
                return sortStringArray([...new Set(names)], []);
            },
        });

        const intersectionPolyline = makeSharedResult({
            debugName: "IntersectionPolylineWithSectionLengths",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    intersection: read.localSetting(Setting.INTERSECTION),
                };
            },
            async resolve({ fieldIdentifier, intersection }, { abortSignal }) {
                return createIntersectionPolylineWithSectionLengthsForField(
                    fieldIdentifier,
                    intersection,
                    workbenchSession,
                    queryClient,
                    abortSignal,
                );
            },
        });

        storedData("polylineWithSectionLengths").bindValue({
            read(read) {
                return { intersectionPolyline: read.sharedResult(intersectionPolyline) };
            },
            resolve({ intersectionPolyline: polyline }) {
                if (!polyline || polyline.polylineUtmXy.length === 0) {
                    return { polylineUtmXy: [], actualSectionLengths: [] };
                }
                return polyline;
            },
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        fetchQuery,
    }: FetchDataParams<
        InitialFluidContactSurfacesSettings,
        InitialFluidContactSurfacesData,
        InitialFluidContactSurfacesStoredData
    >): Promise<InitialFluidContactSurfacesData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const contact = assertNonNull(getSetting(Setting.FLUID_CONTACT), "No fluid contact selected");
        const surfaceName = assertNonNull(getSetting(Setting.SURFACE_NAME), "No surface selected");
        const realization = assertNonNull(getSetting(Setting.REALIZATION), "No realization selected");
        const polyline = assertNonNull(
            getStoredData("polylineWithSectionLengths"),
            "No polyline and actual section lengths found in stored data",
        );

        if (polyline.polylineUtmXy.length < 4) {
            throw new Error("Invalid polyline in stored data. Must contain at least two (x,y)-points");
        }

        const resampledPolyline = createResampledPolylinePointsAndCumulatedLengthArray(
            polyline.polylineUtmXy,
            polyline.actualSectionLengths,
            -createValidExtensionLength(getSetting(Setting.INTERSECTION)),
            25,
        );

        const surfAddrStr = new SurfaceAddressBuilder()
            .withEnsembleIdent(ensembleIdent)
            .withName(surfaceName)
            .withStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, contact)
            .withRealization(realization)
            .buildRealizationAddrStr();

        const queryOptions = postGetSurfaceIntersectionOptions({
            query: { surf_addr_str: surfAddrStr },
            body: {
                cumulative_length_polyline: {
                    x_points: resampledPolyline.xPoints,
                    y_points: resampledPolyline.yPoints,
                    cum_lengths: resampledPolyline.cumulatedHorizontalPolylineLengthArr,
                },
            },
        });

        return fetchQuery(queryOptions).then((data) => [data]);
    }
}

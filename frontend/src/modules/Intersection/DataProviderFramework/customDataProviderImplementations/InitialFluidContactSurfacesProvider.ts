import { hashKey } from "@tanstack/query-core";
import { isEqual } from "lodash-es";

import type { Options, PostStatisticalSurfaceIntersectionHybridData_api, SurfaceIntersectionData_api } from "@api";
import {
    SurfaceStandardResult_api,
    SurfaceStatisticFunction_api,
    getInitialFluidContactSurfacesMetadataOptions,
    postStatisticalSurfaceIntersectionHybrid,
    postStatisticalSurfaceIntersectionHybridQueryKey,
    postGetSurfaceIntersectionOptions,
} from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
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
import {
    resolveSensitivityConstraints,
    resolveStatisticFunctionConstraints,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/_commonSettingsUpdaters";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Representation } from "@modules/_shared/DataProviderFramework/settings/implementations/RepresentationSetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { createValidExtensionLength } from "@modules/_shared/DataProviderFramework/settings/utils/extensionLengthUtils";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";

import { createResampledPolylinePointsAndCumulatedLengthArray } from "./utils";

const initialFluidContactSurfacesSettings = [
    Setting.INTERSECTION,
    Setting.ENSEMBLE,
    Setting.REPRESENTATION,
    Setting.REALIZATION,
    Setting.STATISTIC_FUNCTION,
    Setting.SENSITIVITY,
    Setting.SURFACE_NAME,
    Setting.FLUID_CONTACT,
    Setting.COLOR_SET,
] as const;

export type InitialFluidContactSurfacesSettings = typeof initialFluidContactSurfacesSettings;
type SettingsWithTypes = MakeSettingTypesMap<InitialFluidContactSurfacesSettings>;

export type InitialFluidContactSurfacesStoredData = {
    polylineWithSectionLengths: PolylineWithSectionLengths;
    realizations: readonly number[];
    realizationMode: string;
};

export type InitialFluidContactSurfacesData = SurfaceIntersectionData_api[];

export class InitialFluidContactSurfacesProvider implements CustomDataProviderImplementation<
    InitialFluidContactSurfacesSettings,
    InitialFluidContactSurfacesData,
    InitialFluidContactSurfacesStoredData
> {
    settings = initialFluidContactSurfacesSettings;

    getDefaultSettingsValues() {
        return { [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api.MEAN };
    }

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
            !isEqual(prevSettings.representation, newSettings.representation) ||
            !isEqual(prevSettings.realization, newSettings.realization) ||
            !isEqual(prevSettings.statisticFunction, newSettings.statisticFunction) ||
            !isEqual(prevSettings.sensitivity, newSettings.sensitivity) ||
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
            (getSetting(Setting.REPRESENTATION) === Representation.REALIZATION
                ? getSetting(Setting.REALIZATION) !== null
                : getSetting(Setting.STATISTIC_FUNCTION) !== null) &&
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
        setting(Setting.REALIZATION).bindAttributes({
            read(read) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                const enabled = representation === Representation.REALIZATION;
                return { enabled, visible: enabled };
            },
        });

        for (const statisticalSetting of [Setting.STATISTIC_FUNCTION, Setting.SENSITIVITY] as const) {
            setting(statisticalSetting).bindAttributes({
                read(read) {
                    return { representation: read.localSetting(Setting.REPRESENTATION) };
                },
                resolve({ representation }) {
                    const enabled = representation === Representation.ENSEMBLE_STATISTICS;
                    return { enabled, visible: enabled };
                },
            });
        }

        setting(Setting.REPRESENTATION).bindValueConstraints({
            resolve() {
                return [Representation.REALIZATION, Representation.ENSEMBLE_STATISTICS];
            },
        });

        setting(Setting.STATISTIC_FUNCTION).bindValueConstraints({
            resolve() {
                return resolveStatisticFunctionConstraints();
            },
        });

        setting(Setting.SENSITIVITY).bindValueConstraints({
            read(read) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            resolve({ ensembleIdent }) {
                return resolveSensitivityConstraints(ensembleIdent, workbenchSession);
            },
        });

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

        storedData("realizations").bindValue({
            read(read) {
                return {
                    filterFunction: read.globalSetting("realizationFilterFunction"),
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            resolve({ filterFunction, ensembleIdent }) {
                return ensembleIdent ? [...filterFunction(ensembleIdent)] : [];
            },
        });

        storedData("realizationMode").bindValue({
            read(read) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                return representation ?? Representation.REALIZATION;
            },
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        getWorkbenchSession,
        fetchQuery,
        setProgressMessage,
        onFetchCancelOrFinish,
    }: FetchDataParams<
        InitialFluidContactSurfacesSettings,
        InitialFluidContactSurfacesData,
        InitialFluidContactSurfacesStoredData
    >): Promise<InitialFluidContactSurfacesData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const contact = assertNonNull(getSetting(Setting.FLUID_CONTACT), "No fluid contact selected");
        const surfaceName = assertNonNull(getSetting(Setting.SURFACE_NAME), "No surface selected");
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
        const requestBody = {
            cumulative_length_polyline: {
                x_points: resampledPolyline.xPoints,
                y_points: resampledPolyline.yPoints,
                cum_lengths: resampledPolyline.cumulatedHorizontalPolylineLengthArr,
            },
        };

        const addrBuilder = new SurfaceAddressBuilder()
            .withEnsembleIdent(ensembleIdent)
            .withName(surfaceName)
            .withStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, contact);

        if (getSetting(Setting.REPRESENTATION) === Representation.REALIZATION) {
            const realization = assertNonNull(getSetting(Setting.REALIZATION), "No realization selected");
            const queryOptions = postGetSurfaceIntersectionOptions({
                query: {
                    surf_addr_str: addrBuilder.withRealization(realization).buildRealizationAddrStr(),
                },
                body: requestBody,
            });

            return fetchQuery(queryOptions).then((data) => [data]);
        }

        const statisticFunction = assertNonNull(
            getSetting(Setting.STATISTIC_FUNCTION),
            "No statistic function selected",
        );
        let filteredRealizations = [...(getStoredData("realizations") ?? [])];
        const currentEnsemble = getWorkbenchSession().getEnsembleSet().findEnsemble(ensembleIdent);
        const sensitivityNameCasePair = getSetting(Setting.SENSITIVITY);
        if (sensitivityNameCasePair) {
            const sensitivity = currentEnsemble
                ?.getSensitivities()
                ?.getCaseByName(sensitivityNameCasePair.sensitivityName, sensitivityNameCasePair.sensitivityCase);
            filteredRealizations = filteredRealizations.filter((realization) =>
                (sensitivity?.realizations ?? []).includes(realization),
            );
        }

        addrBuilder.withStatisticFunction(statisticFunction);

        const allRealizations = currentEnsemble?.getRealizations() ?? [];
        if (!isEqual([...allRealizations], filteredRealizations)) {
            addrBuilder.withStatisticRealizations(filteredRealizations);
        }

        const apiFunctionArgs: Options<PostStatisticalSurfaceIntersectionHybridData_api, false> = {
            query: {
                surf_addr_str: addrBuilder.buildStatisticalAddrStr(),
            },
            body: requestBody,
        };
        const queryKey = postStatisticalSurfaceIntersectionHybridQueryKey(apiFunctionArgs);
        const queryOptions = wrapLongRunningQuery({
            queryFn: postStatisticalSurfaceIntersectionHybrid,
            queryFnArgs: apiFunctionArgs,
            queryKey,
            delayBetweenPollsSecs: 1,
            maxTotalDurationSecs: 120,
        });
        const unsubscribe = lroProgressBus.subscribe(hashKey(queryKey), setProgressMessage);
        onFetchCancelOrFinish(unsubscribe);

        return fetchQuery({ ...queryOptions }).then((data) => [data]);
    }
}

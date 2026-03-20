import { isEqual } from "lodash";

import { getSeismicCubeMetaListOptions, postGetSeismicFenceOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { assertNonNull } from "@lib/utils/assertNonNull";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import { createSectionWiseResampledPolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineUtils";
import type { SeismicFenceData_trans } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { transformSeismicFenceData } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { createSeismicFencePolylineFromPolylineXy } from "@modules/_shared/Intersection/seismicIntersectionUtils";

import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../../interfacesAndTypes/customDataProviderImplementation";
import type { MakeSettingTypesMap } from "../../../interfacesAndTypes/utils";
import { Representation } from "../../../settings/implementations/RepresentationSetting";
import { Setting } from "../../../settings/settingsDefinitions";
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchWellboreHeaders,
} from "../../dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableIntersectionOptions,
    getAvailableRealizationsForEnsembleIdent,
} from "../../dependencyFunctions/sharedSettingUpdaterFunctions";

import { representationToApiRepresentation } from "./representationUtils";

const intersectionSeismicSettings = [
    Setting.INTERSECTION,

    Setting.ENSEMBLE,
    Setting.REPRESENTATION,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
    Setting.WELLBORE_EXTENSION_LENGTH,
] as const;
export type IntersectionSeismicSettings = typeof intersectionSeismicSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionSeismicSettings>;

export type IntersectionSeismicStoredData = {
    sourcePolylineWithSectionLengths: PolylineWithSectionLengths;
    seismicFencePolylineWithSectionLengths: PolylineWithSectionLengths;
};

export type IntersectionSeismicData = SeismicFenceData_trans;

export class IntersectionSeismicProvider implements CustomDataProviderImplementation<
    IntersectionSeismicSettings,
    IntersectionSeismicData,
    IntersectionSeismicStoredData
> {
    settings = intersectionSeismicSettings;

    getDefaultSettingsValues() {
        const defaultColorPalette =
            defaultContinuousDivergingColorPalettes.find((elm) => elm.getId() === "red-to-blue") ??
            defaultContinuousDivergingColorPalettes[0];
        const defaultColorScale = new ColorScale({
            colorPalette: defaultColorPalette,
            gradientType: ColorScaleGradientType.Diverging,
            type: ColorScaleType.Continuous,
            steps: 10,
        });

        return {
            [Setting.WELLBORE_EXTENSION_LENGTH]: 500.0,
            [Setting.COLOR_SCALE]: {
                colorScale: defaultColorScale,
                areBoundariesUserDefined: false,
            },
            [Setting.OPACITY_PERCENT]: 100,
        };
    }

    getDefaultName(): string {
        return `Seismic fence `;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings.intersection, newSettings.intersection) ||
            !isEqual(prevSettings.wellboreExtensionLength, newSettings.wellboreExtensionLength) ||
            !isEqual(prevSettings.ensemble, newSettings.ensemble) ||
            !isEqual(prevSettings.representation, newSettings.representation) ||
            !isEqual(prevSettings.realization, newSettings.realization) ||
            !isEqual(prevSettings.attribute, newSettings.attribute) ||
            !isEqual(prevSettings.timeOrInterval, newSettings.timeOrInterval)
        );
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<IntersectionSeismicSettings, IntersectionSeismicData, IntersectionSeismicStoredData>):
        | [number, number]
        | null {
        const data = getData();
        if (!data) {
            return null;
        }

        // Fill value is NaN
        const minValue = data.fenceTracesFloat32Arr
            .filter((value) => !Number.isNaN(value))
            .reduce((acc, value) => Math.min(acc, value), Infinity);
        const maxValue = data.fenceTracesFloat32Arr
            .filter((value) => !Number.isNaN(value))
            .reduce((acc, value) => Math.max(acc, value), -Infinity);

        return [minValue, maxValue];
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<
        IntersectionSeismicSettings,
        IntersectionSeismicData,
        IntersectionSeismicStoredData
    >): boolean {
        // Extension has to be set if intersection is wellbore
        const isValidExtensionLength =
            getSetting(Setting.INTERSECTION)?.type !== IntersectionType.WELLBORE ||
            getSetting(Setting.WELLBORE_EXTENSION_LENGTH) !== null;

        return (
            getSetting(Setting.INTERSECTION) !== null &&
            isValidExtensionLength &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null
        );
    }

    setupBindings({
        setting,
        makeSharedResult,
        storedData,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<IntersectionSeismicSettings, IntersectionSeismicStoredData>): void {
        setting(Setting.WELLBORE_EXTENSION_LENGTH).bindAttributes({
            read(read) {
                return {
                    intersection: read.localSetting(Setting.INTERSECTION),
                };
            },
            resolve({ intersection }) {
                const isEnabled = intersection?.type === IntersectionType.WELLBORE;
                return { enabled: isEnabled };
            },
        });

        setting(Setting.REALIZATION).bindAttributes({
            read(read) {
                return {
                    representation: read.localSetting(Setting.REPRESENTATION),
                };
            },
            resolve({ representation }) {
                const enabled =
                    representation === Representation.REALIZATION ||
                    representation === Representation.OBSERVATION_PER_REALIZATION;
                return { enabled, visible: enabled };
            },
        });

        setting(Setting.ENSEMBLE).bindValueConstraints({
            read(read) {
                return {
                    fieldId: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldId, ensembles }) {
                return getAvailableEnsembleIdentsForField(fieldId, ensembles);
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

        setting(Setting.REPRESENTATION).bindValueConstraints({
            resolve() {
                return [
                    Representation.REALIZATION,
                    Representation.OBSERVATION,
                    Representation.OBSERVATION_PER_REALIZATION,
                ];
            },
        });

        const seismicCubeMetaList = makeSharedResult({
            debugName: "seismicCubeMetaList",
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
                    ...getSeismicCubeMetaListOptions({
                        query: {
                            case_uuid: ensembleIdent.getCaseUuid() ?? "",
                            ensemble_name: ensembleIdent.getEnsembleName() ?? "",
                            ...makeCacheBustingQueryParam(ensembleIdent ?? null),
                        },

                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.ATTRIBUTE).bindValueConstraints({
            read(read) {
                return {
                    seismicCubeMetaList: read.sharedResult(seismicCubeMetaList),
                    representation: read.localSetting(Setting.REPRESENTATION),
                };
            },
            resolve({ seismicCubeMetaList, representation }) {
                if (!seismicCubeMetaList) {
                    return [];
                }

                const apiRepresentation = representationToApiRepresentation(
                    representation ?? Representation.REALIZATION,
                );

                return Array.from(
                    new Set(
                        seismicCubeMetaList
                            .filter((el) => el.isDepth && el.representation === apiRepresentation)
                            .map((el) => el.seismicAttribute),
                    ),
                ).sort();
            },
        });

        const wellboreHeader = makeSharedResult({
            debugName: "wellboreHeaders",
            read(read) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                return await fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read(read) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeader) ?? [],
                    intersectionPolylines: read.globalSetting("intersectionPolylines") ?? [],
                    fieldId: read.globalSetting("fieldId"),
                };
            },
            resolve({ wellboreHeaders, intersectionPolylines, fieldId }) {
                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldId,
                );

                return getAvailableIntersectionOptions(wellboreHeaders ?? [], fieldIntersectionPolylines);
            },
        });

        setting(Setting.TIME_OR_INTERVAL).bindValueConstraints({
            read(read) {
                return {
                    seismicCubeMetaList: read.sharedResult(seismicCubeMetaList),
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                };
            },
            resolve({ seismicCubeMetaList, attribute }) {
                if (!seismicCubeMetaList || !attribute) {
                    return [];
                }

                return Array.from(
                    new Set(
                        seismicCubeMetaList
                            .filter((el) => el.seismicAttribute === attribute)
                            .map((el) => el.isoDateOrInterval),
                    ),
                ).sort();
            },
        });

        const intersectionPolylineWithSectionLengths = makeSharedResult({
            debugName: "intersectionPolylineWithSectionLengths",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    intersection: read.localSetting(Setting.INTERSECTION),
                    wellboreExtensionLength: read.localSetting(Setting.WELLBORE_EXTENSION_LENGTH),
                };
            },
            async resolve({ fieldIdentifier, intersection, wellboreExtensionLength }, { abortSignal }) {
                return await createIntersectionPolylineWithSectionLengthsForField(
                    fieldIdentifier,
                    intersection,
                    wellboreExtensionLength ?? 0,
                    workbenchSession,
                    queryClient,
                    abortSignal,
                );
            },
        });

        storedData("sourcePolylineWithSectionLengths").bindValue({
            read(read) {
                return {
                    intersectionPolylineWithSectionLengths: read.sharedResult(intersectionPolylineWithSectionLengths),
                };
            },
            resolve({ intersectionPolylineWithSectionLengths }) {
                // If no intersection is selected, or polyline is empty, cancel update
                if (
                    !intersectionPolylineWithSectionLengths ||
                    intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
                ) {
                    return { polylineUtmXy: [], actualSectionLengths: [] };
                }

                return intersectionPolylineWithSectionLengths;
            },
        });

        storedData("seismicFencePolylineWithSectionLengths").bindValue({
            read(read) {
                return {
                    intersectionPolylineWithSectionLengths: read.sharedResult(intersectionPolylineWithSectionLengths),
                    seismicCubeMetaList: read.sharedResult(seismicCubeMetaList),
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                    timeOrInterval: read.localSetting(Setting.TIME_OR_INTERVAL),
                };
            },
            resolve({ intersectionPolylineWithSectionLengths, seismicCubeMetaList, attribute, timeOrInterval }) {
                // If no intersection is selected, or polyline is empty, cancel update
                if (
                    !intersectionPolylineWithSectionLengths ||
                    intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
                ) {
                    return { polylineUtmXy: [], actualSectionLengths: [] };
                }

                // Find step size for resampling
                let sampleResolutionInMeters = 25.0; // Default value
                const matchingSeismicCubeMeta = seismicCubeMetaList?.find(
                    (meta) => meta.seismicAttribute === attribute && meta.isoDateOrInterval === timeOrInterval,
                );
                if (matchingSeismicCubeMeta) {
                    // Use the smallest increment in x- and y-direction from seismic cube spec, and divide by 2.0 as sample
                    // resolution for resampling the polyline.
                    sampleResolutionInMeters =
                        Math.min(
                            Math.abs(matchingSeismicCubeMeta.spec.xInc),
                            Math.abs(matchingSeismicCubeMeta.spec.yInc),
                        ) / 2.0;
                }

                // Resample the polyline, as seismic fence is created by one trace per (x,y) point in the polyline
                const resampledPolylineWithSectionLengths = createSectionWiseResampledPolylineWithSectionLengths(
                    intersectionPolylineWithSectionLengths,
                    sampleResolutionInMeters,
                );

                return resampledPolylineWithSectionLengths;
            },
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        fetchQuery,
    }: FetchDataParams<
        IntersectionSeismicSettings,
        IntersectionSeismicData,
        IntersectionSeismicStoredData
    >): Promise<IntersectionSeismicData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const realization = assertNonNull(getSetting(Setting.REALIZATION), "No realization number selected");
        const attribute = assertNonNull(getSetting(Setting.ATTRIBUTE), "No attribute selected");
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const representation = getSetting(Setting.REPRESENTATION);
        const seismicFencePolylineUtmXy = assertNonNull(
            getStoredData("seismicFencePolylineWithSectionLengths"),
            "No seismic fence polyline found in stored data",
        ).polylineUtmXy;

        if (seismicFencePolylineUtmXy.length < 4) {
            throw new Error("Invalid seismic fence polyline in stored data. Must contain at least two (x,y)-points");
        }

        const apiSeismicFencePolyline = createSeismicFencePolylineFromPolylineXy(seismicFencePolylineUtmXy);
        const queryOptions = postGetSeismicFenceOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                realization_num: realization,
                seismic_attribute: attribute,
                time_or_interval_str: timeOrInterval ?? "",
                representation: representationToApiRepresentation(representation ?? Representation.REALIZATION),
            },
            body: {
                polyline: apiSeismicFencePolyline,
            },
        });

        const seismicFenceDataPromise = fetchQuery(queryOptions).then(transformSeismicFenceData);

        return seismicFenceDataPromise;
    }
}

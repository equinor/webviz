import { isEqual } from "lodash";

import { getSeismicCubeMetaListOptions, postGetSeismicFenceOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { assertNonNull } from "@lib/utils/assertNonNull";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import { createSectionWiseResampledPolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineUtils";
import type { SeismicFenceData_trans } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { transformSeismicFenceData } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { createSeismicFencePolylineFromPolylineXy } from "@modules/_shared/Intersection/seismicIntersectionUtils";

import { Setting } from "../../../DataProviderFramework/settings/settingsDefinitions";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchWellboreHeaders,
} from "../dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableIntersectionOptions,
    getAvailableRealizationsForEnsembleIdent,
} from "../dependencyFunctions/sharedSettingUpdaterFunctions";

const intersectionRealizationSeismicSettings = [
    Setting.INTERSECTION,
    Setting.WELLBORE_EXTENSION_LENGTH,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
] as const;
export type IntersectionRealizationSeismicSettings = typeof intersectionRealizationSeismicSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionRealizationSeismicSettings>;

export type IntersectionRealizationSeismicStoredData = {
    sourcePolylineWithSectionLengths: PolylineWithSectionLengths;
    seismicFencePolylineWithSectionLengths: PolylineWithSectionLengths;
};

export enum SeismicDataSource {
    OBSERVED = "observed",
    SIMULATED = "simulated",
}

const SeismicDataSourceEnumToStringMapping = {
    [SeismicDataSource.OBSERVED]: "Observed",
    [SeismicDataSource.SIMULATED]: "Simulated",
};

export type IntersectionRealizationSeismicData = SeismicFenceData_trans;

export class IntersectionRealizationSeismicProvider implements CustomDataProviderImplementation<
    IntersectionRealizationSeismicSettings,
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicStoredData
> {
    settings = intersectionRealizationSeismicSettings;

    private _dataSource: SeismicDataSource;

    constructor(dataSource: SeismicDataSource) {
        this._dataSource = dataSource;
    }

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
        const dataSourceString = SeismicDataSourceEnumToStringMapping[this._dataSource];
        return `Seismic fence (${dataSourceString}`;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings.intersection, newSettings.intersection) ||
            !isEqual(prevSettings.wellboreExtensionLength, newSettings.wellboreExtensionLength) ||
            !isEqual(prevSettings.ensemble, newSettings.ensemble) ||
            !isEqual(prevSettings.realization, newSettings.realization) ||
            !isEqual(prevSettings.attribute, newSettings.attribute) ||
            !isEqual(prevSettings.timeOrInterval, newSettings.timeOrInterval)
        );
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<
        IntersectionRealizationSeismicSettings,
        IntersectionRealizationSeismicData,
        IntersectionRealizationSeismicStoredData
    >): [number, number] | null {
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
    }: DataProviderInformationAccessors<
        IntersectionRealizationSeismicSettings,
        IntersectionRealizationSeismicData,
        IntersectionRealizationSeismicStoredData
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
        storedData,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<IntersectionRealizationSeismicSettings, IntersectionRealizationSeismicStoredData>): void {
        setting(Setting.WELLBORE_EXTENSION_LENGTH).bindAttributes({
            read({ read }) {
                return {
                    intersection: read.localSetting(Setting.INTERSECTION),
                };
            },
            resolve({ intersection }) {
                const isEnabled = intersection?.type === IntersectionType.WELLBORE;
                return { enabled: isEnabled };
            },
        });

        setting(Setting.ENSEMBLE).bindValueConstraints({
            read({ read }) {
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
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realizationFilterFunc: read.globalSetting("realizationFilterFunction"),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunc }) {
                return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunc);
            },
        });

        const ensembleSeismicCubeMetaListDep = makeSharedResult({
            debugName: "EnsembleSeismicCubeMetaList",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            async resolve({ ensembleIdent }, abortSignal) {
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
            read({ read }) {
                return {
                    seismicCubeMetaList: read.sharedResult(ensembleSeismicCubeMetaListDep),
                };
            },
            resolve({ seismicCubeMetaList }) {
                if (!seismicCubeMetaList) {
                    return [];
                }

                // Get seismic attributes that are depth of correct data source
                const doRequestObservation = this._dataSource === SeismicDataSource.OBSERVED;
                const availableAttributes = Array.from(
                    new Set(
                        seismicCubeMetaList
                            .filter((el) => el.isDepth && el.isObservation === doRequestObservation)
                            .map((el) => el.seismicAttribute),
                    ),
                ).sort();

                return availableAttributes;
            },
        });

        const wellboreHeadersDep = makeSharedResult({
            debugName: "WellboreHeaders",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            resolve({ ensembleIdent }, abortSignal) {
                return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read({ read }) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeadersDep),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ wellboreHeaders, intersectionPolylines, fieldIdentifier }) {
                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );

                return getAvailableIntersectionOptions(wellboreHeaders ?? [], fieldIntersectionPolylines);
            },
        });

        setting(Setting.TIME_OR_INTERVAL).bindValueConstraints({
            read({ read }) {
                return {
                    seismicCubeMetaList: read.sharedResult(ensembleSeismicCubeMetaListDep),
                    seismicAttribute: read.localSetting(Setting.ATTRIBUTE),
                };
            },
            resolve({ seismicCubeMetaList, seismicAttribute }) {
                if (!seismicAttribute || !seismicCubeMetaList) {
                    return [];
                }

                const availableTimeOrIntervals = [
                    ...Array.from(
                        new Set(
                            seismicCubeMetaList
                                .filter((surface) => surface.seismicAttribute === seismicAttribute)
                                .map((el) => el.isoDateOrInterval),
                        ),
                    ).sort(),
                ];

                return availableTimeOrIntervals;
            },
        });

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = makeSharedResult({
            debugName: "IntersectionPolylineWithSectionLengths",
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    intersection: read.localSetting(Setting.INTERSECTION),
                    wellboreExtensionLength: read.localSetting(Setting.WELLBORE_EXTENSION_LENGTH),
                };
            },
            resolve({ fieldIdentifier, intersection, wellboreExtensionLength }) {
                return createIntersectionPolylineWithSectionLengthsForField(
                    fieldIdentifier,
                    intersection,
                    wellboreExtensionLength ?? 0,
                    workbenchSession,
                    queryClient,
                );
            },
        });

        storedData("sourcePolylineWithSectionLengths").bindValue({
            read({ read }) {
                return {
                    intersectionPolylineWithSectionLengths: read.sharedResult(intersectionPolylineWithSectionLengthsDep),
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
            read({ read }) {
                return {
                    intersectionPolylineWithSectionLengths: read.sharedResult(intersectionPolylineWithSectionLengthsDep),
                    seismicCubeMetaList: read.sharedResult(ensembleSeismicCubeMetaListDep),
                    seismicAttribute: read.localSetting(Setting.ATTRIBUTE),
                    timeOrInterval: read.localSetting(Setting.TIME_OR_INTERVAL),
                };
            },
            resolve({ intersectionPolylineWithSectionLengths, seismicCubeMetaList, seismicAttribute, timeOrInterval }) {
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
                    (meta) => meta.seismicAttribute === seismicAttribute && meta.isoDateOrInterval === timeOrInterval,
                );
                if (matchingSeismicCubeMeta) {
                    // Use the smallest increment in x- and y-direction from seismic cube spec, and divide by 2.0 as sample
                    // resolution for resampling the polyline.
                    sampleResolutionInMeters =
                        Math.min(Math.abs(matchingSeismicCubeMeta.spec.xInc), Math.abs(matchingSeismicCubeMeta.spec.yInc)) /
                        2.0;
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
        IntersectionRealizationSeismicSettings,
        IntersectionRealizationSeismicData,
        IntersectionRealizationSeismicStoredData
    >): Promise<IntersectionRealizationSeismicData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const realization = assertNonNull(getSetting(Setting.REALIZATION), "No realization number selected");
        const attribute = assertNonNull(getSetting(Setting.ATTRIBUTE), "No attribute selected");
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
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
                observed: this._dataSource === SeismicDataSource.OBSERVED,
            },
            body: {
                polyline: apiSeismicFencePolyline,
            },
        });

        const seismicFenceDataPromise = fetchQuery(queryOptions).then(transformSeismicFenceData);

        return seismicFenceDataPromise;
    }
}

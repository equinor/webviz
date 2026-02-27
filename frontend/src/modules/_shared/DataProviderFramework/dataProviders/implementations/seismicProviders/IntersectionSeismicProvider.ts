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

import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../../interfacesAndTypes/customSettingsHandler";
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

export class IntersectionSeismicProvider
    implements
        CustomDataProviderImplementation<
            IntersectionSeismicSettings,
            IntersectionSeismicData,
            IntersectionSeismicStoredData
        >
{
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
    }: DataProviderInformationAccessors<
        IntersectionSeismicSettings,
        IntersectionSeismicData,
        IntersectionSeismicStoredData
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

    defineDependencies({
        helperDependency,
        valueConstraintsUpdater,
        settingAttributesUpdater,
        queryClient,
        workbenchSession,
        storedDataUpdater,
    }: DefineDependenciesArgs<IntersectionSeismicSettings, IntersectionSeismicStoredData>): void {
        settingAttributesUpdater(Setting.WELLBORE_EXTENSION_LENGTH, ({ getLocalSetting }) => {
            const intersection = getLocalSetting(Setting.INTERSECTION);

            const isEnabled = intersection?.type === IntersectionType.WELLBORE;
            return { enabled: isEnabled };
        });
        settingAttributesUpdater(Setting.REALIZATION, ({ getLocalSetting }) => {
            const representation = getLocalSetting(Setting.REPRESENTATION);
            const enabled =
                representation === Representation.REALIZATION ||
                representation === Representation.OBSERVATION_PER_REALIZATION;
            return { enabled, visible: enabled };
        });
        valueConstraintsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");
            return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
        });

        valueConstraintsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");
            return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunc);
        });
        valueConstraintsUpdater(Setting.REPRESENTATION, () => {
            return [Representation.REALIZATION, Representation.OBSERVATION, Representation.OBSERVATION_PER_REALIZATION];
        });
        const seismicCubeMetaListDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

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
        });

        valueConstraintsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency, getLocalSetting }) => {
            const seismicCubeMetaList = getHelperDependency(seismicCubeMetaListDep);

            if (!seismicCubeMetaList) {
                return [];
            }

            const representation = getLocalSetting(Setting.REPRESENTATION);
            const apiRepresentation = representationToApiRepresentation(representation);

            return Array.from(
                new Set(
                    seismicCubeMetaList
                        .filter((el) => el.isDepth && el.representation === apiRepresentation)
                        .map((el) => el.seismicAttribute),
                ),
            ).sort();
        });

        const wellboreHeadersDep = helperDependency(({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
        });

        valueConstraintsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep) ?? [];
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");
            const fieldIdentifier = getGlobalSetting("fieldId");

            const fieldIntersectionPolylines = intersectionPolylines.filter(
                (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
            );

            return getAvailableIntersectionOptions(wellboreHeaders, fieldIntersectionPolylines);
        });

        valueConstraintsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const seismicCubeMetaList = getHelperDependency(seismicCubeMetaListDep);
            const seismicAttribute = getLocalSetting(Setting.ATTRIBUTE);

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
        });

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = helperDependency(({ getLocalSetting, getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const intersection = getLocalSetting(Setting.INTERSECTION);
            const wellboreExtensionLength = getLocalSetting(Setting.WELLBORE_EXTENSION_LENGTH) ?? 0;

            return createIntersectionPolylineWithSectionLengthsForField(
                fieldIdentifier,
                intersection,
                wellboreExtensionLength,
                workbenchSession,
                queryClient,
            );
        });

        storedDataUpdater("sourcePolylineWithSectionLengths", ({ getHelperDependency }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );

            // If no intersection is selected, or polyline is empty, cancel update
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return { polylineUtmXy: [], actualSectionLengths: [] };
            }

            return intersectionPolylineWithSectionLengths;
        });

        storedDataUpdater("seismicFencePolylineWithSectionLengths", ({ getHelperDependency, getLocalSetting }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );

            const seismicCubeMetaList = getHelperDependency(seismicCubeMetaListDep);
            const seismicAttribute = getLocalSetting(Setting.ATTRIBUTE);
            const timeOrInterval = getLocalSetting(Setting.TIME_OR_INTERVAL);

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
                representation: representationToApiRepresentation(representation),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
            body: {
                polyline: apiSeismicFencePolyline,
            },
        });

        const seismicFenceDataPromise = fetchQuery(queryOptions).then(transformSeismicFenceData);

        return seismicFenceDataPromise;
    }
}

import { isEqual } from "lodash";

import { getGridModelsInfoOptions, postGetPolylineIntersectionOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import { assertNonNull } from "@lib/utils/assertNonNull";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { PolylineIntersection_trans } from "@modules/_shared/Intersection/gridIntersectionTransform";
import { transformPolylineIntersection } from "@modules/_shared/Intersection/gridIntersectionTransform";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";

import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchWellboreHeaders,
} from "../dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableIntersectionOptions,
    getAvailableEnsembleIdentsForField,
    getAvailableRealizationsForEnsembleIdent,
} from "../dependencyFunctions/sharedSettingUpdaterFunctions";

const intersectionRealizationGridSettings = [
    Setting.INTERSECTION,
    Setting.WELLBORE_EXTENSION_LENGTH,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.GRID_NAME,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
] as const;
export type IntersectionRealizationGridSettings = typeof intersectionRealizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionRealizationGridSettings>;

export type IntersectionRealizationGridStoredData = {
    polylineWithSectionLengths: PolylineWithSectionLengths;
};

export type IntersectionRealizationGridData = PolylineIntersection_trans;

export type IntersectionRealizationGridProviderArgs = {
    enableWellboreExtensionLength: boolean;
};

export class IntersectionRealizationGridProvider
    implements
        CustomDataProviderImplementation<
            IntersectionRealizationGridSettings,
            IntersectionRealizationGridData,
            IntersectionRealizationGridStoredData
        >
{
    settings = intersectionRealizationGridSettings;

    private _isWellboreExtensionLengthEnabled = false;

    constructor(args: IntersectionRealizationGridProviderArgs) {
        this._isWellboreExtensionLengthEnabled = args.enableWellboreExtensionLength;
    }

    getDefaultSettingsValues() {
        return {
            [Setting.WELLBORE_EXTENSION_LENGTH]: 500.0,
            [Setting.SAMPLE_RESOLUTION_IN_METERS]: 1,
            [Setting.SHOW_GRID_LINES]: false,
            [Setting.OPACITY_PERCENT]: 100,
        };
    }

    getDefaultName(): string {
        return "Intersection Realization Grid";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings.intersection, newSettings.intersection) ||
            !isEqual(prevSettings.wellboreExtensionLength, newSettings.wellboreExtensionLength) ||
            !isEqual(prevSettings.ensemble, newSettings.ensemble) ||
            !isEqual(prevSettings.realization, newSettings.realization) ||
            !isEqual(prevSettings.gridName, newSettings.gridName) ||
            !isEqual(prevSettings.attribute, newSettings.attribute) ||
            !isEqual(prevSettings.timeOrInterval, newSettings.timeOrInterval)
        );
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        IntersectionRealizationGridStoredData
    >): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        if (data) {
            // Note: min and max for entire grid, not only for the intersection
            return [data.min_grid_prop_value, data.max_grid_prop_value];
        }

        return null;
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        IntersectionRealizationGridStoredData
    >): boolean {
        let isValidExtensionLength = true;
        if (this._isWellboreExtensionLengthEnabled) {
            // Must have extension length for wellbore
            isValidExtensionLength =
                getSetting(Setting.INTERSECTION)?.type !== IntersectionType.WELLBORE ||
                getSetting(Setting.WELLBORE_EXTENSION_LENGTH) !== null;
        }

        return (
            getSetting(Setting.INTERSECTION) !== null &&
            isValidExtensionLength &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.GRID_NAME) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null &&
            getSetting(Setting.SHOW_GRID_LINES) !== null &&
            getSetting(Setting.COLOR_SCALE) !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        settingAttributesUpdater,
        storedDataUpdater,
        queryClient,
        workbenchSession,
    }: DefineDependenciesArgs<IntersectionRealizationGridSettings, IntersectionRealizationGridStoredData>): void {
        const isWellboreExtensionLengthEnabled = this._isWellboreExtensionLengthEnabled;

        settingAttributesUpdater(Setting.WELLBORE_EXTENSION_LENGTH, ({ getLocalSetting }) => {
            const intersection = getLocalSetting(Setting.INTERSECTION);
            if (!isWellboreExtensionLengthEnabled) {
                return { enabled: false, visible: false };
            }

            const isEnabled = intersection?.type === IntersectionType.WELLBORE;
            return { enabled: isEnabled, visible: true };
        });

        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");
            return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
        });

        availableSettingsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");
            return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunc);
        });

        const realizationGridDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realization = getLocalSetting(Setting.REALIZATION);

            if (!ensembleIdent || realization === null) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getGridModelsInfoOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                        realization_num: realization,
                    },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.GRID_NAME, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationGridDataDep);

            if (!data) {
                return [];
            }

            const availableGridNames = Array.from(new Set(data.map((gridModelInfo) => gridModelInfo.grid_name))).sort();

            return availableGridNames;
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(Setting.GRID_NAME);
            const data = getHelperDependency(realizationGridDataDep);

            if (!gridName || !data) {
                return [];
            }

            const gridAttributeArr =
                data.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

            const availableGridAttributes = Array.from(
                new Set(gridAttributeArr.map((gridAttribute) => gridAttribute.property_name)),
            ).sort();

            return availableGridAttributes;
        });

        const wellboreHeadersDep = helperDependency(({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
        });

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep) ?? [];
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");
            const fieldIdentifier = getGlobalSetting("fieldId");

            const fieldIntersectionPolylines = intersectionPolylines.filter(
                (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
            );

            return getAvailableIntersectionOptions(wellboreHeaders, fieldIntersectionPolylines);
        });

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(Setting.GRID_NAME);
            const gridAttribute = getLocalSetting(Setting.ATTRIBUTE);
            const data = getHelperDependency(realizationGridDataDep);

            if (!gridName || !gridAttribute || !data) {
                return [];
            }

            const gridAttributeArr =
                data.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

            const availableTimeOrIntervals = Array.from(
                new Set(
                    gridAttributeArr
                        .filter((attr) => attr.property_name === gridAttribute)
                        .map((gridAttribute) => gridAttribute.iso_date_or_interval ?? "NO_TIME"),
                ),
            ).sort((a, b) => {
                if (a === "NO_TIME") return -1;
                if (b === "NO_TIME") return 1;
                return a.localeCompare(b);
            });

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

        storedDataUpdater("polylineWithSectionLengths", ({ getHelperDependency }) => {
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
    }

    fetchData({
        getSetting,
        getStoredData,
        fetchQuery,
    }: FetchDataParams<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        IntersectionRealizationGridStoredData
    >): Promise<IntersectionRealizationGridData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const realizationNum = assertNonNull(getSetting(Setting.REALIZATION), "No realization number selected");
        const gridName = assertNonNull(getSetting(Setting.GRID_NAME), "No grid name selected");
        const parameterName = assertNonNull(getSetting(Setting.ATTRIBUTE), "No attribute selected");
        let timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }

        const polylineWithSectionLengths = assertNonNull(
            getStoredData("polylineWithSectionLengths"),
            "No polyline and actual section lengths found in stored data",
        );
        if (polylineWithSectionLengths.polylineUtmXy.length < 4) {
            throw new Error("Invalid polyline in stored data. Must contain at least two (x,y)-points");
        }

        const queryOptions = postGetPolylineIntersectionOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                grid_name: gridName,
                parameter_name: parameterName,
                parameter_time_or_interval_str: timeOrInterval,
                realization_num: realizationNum,
            },
            body: { polyline_utm_xy: polylineWithSectionLengths.polylineUtmXy },
        });

        const gridIntersectionPromise = fetchQuery(queryOptions).then(transformPolylineIntersection);

        return gridIntersectionPromise;
    }
}

import { getDrilledWellboreHeadersOptions, getGridModelsInfoOptions, postGetPolylineIntersectionOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { PolylineIntersection_trans } from "@modules/_shared/Intersection/gridIntersectionTransform";
import { transformPolylineIntersection } from "@modules/_shared/Intersection/gridIntersectionTransform";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import type {
    PolylineIntersectionSpecification,
    WellboreIntersectionSpecification,
} from "@modules/_shared/Intersection/intersectionPolylineUtils";
import { makeIntersectionPolylineWithSectionLengthsPromise } from "@modules/_shared/Intersection/intersectionPolylineUtils";


import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";

const intersectionRealizationGridSettings = [
    Setting.INTERSECTION,
    Setting.INTERSECTION_EXTENSION_LENGTH,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.GRID_NAME,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
] as const;
export type IntersectionRealizationGridSettings = typeof intersectionRealizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionRealizationGridSettings>;

export type IntersectionRealizationGridStoredData = {
    polylineWithSectionLengths: PolylineWithSectionLengths;
};

export type IntersectionRealizationGridData = PolylineIntersection_trans;

export class IntersectionRealizationGridProvider
    implements
        CustomDataProviderImplementation<
            IntersectionRealizationGridSettings,
            IntersectionRealizationGridData,
            IntersectionRealizationGridStoredData
        >
{
    settings = intersectionRealizationGridSettings;

    private _isExtensionLengthEnabled = false;

    constructor(isExtensionLengthEnabled: boolean) {
        this._isExtensionLengthEnabled = isExtensionLengthEnabled;
    }

    getDefaultSettingsValues() {
        return {
            [Setting.SHOW_GRID_LINES]: false,
        };
    }

    getDefaultName(): string {
        return "Intersection Realization Grid";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
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
        if (this._isExtensionLengthEnabled) {
            // Must have extension length for wellbore
            isValidExtensionLength =
                getSetting(Setting.INTERSECTION)?.type !== IntersectionType.WELLBORE ||
                getSetting(Setting.INTERSECTION_EXTENSION_LENGTH) !== null;
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
        const isExtensionLengthIncluded = this._isExtensionLengthEnabled;

        settingAttributesUpdater(Setting.INTERSECTION_EXTENSION_LENGTH, () => {
            if (isExtensionLengthIncluded) {
                return { enabled: true, visible: true };
            }
            return { enabled: false, visible: false };
        });

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

            const availableGridNames = [...Array.from(new Set(data.map((gridModelInfo) => gridModelInfo.grid_name)))];

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

            const availableGridAttributes = [
                ...Array.from(new Set(gridAttributeArr.map((gridAttribute) => gridAttribute.property_name))),
            ];

            return availableGridAttributes;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");

            const intersectionOptions: IntersectionSettingValue[] = [];
            if (wellboreHeaders) {
                for (const wellboreHeader of wellboreHeaders) {
                    intersectionOptions.push({
                        type: IntersectionType.WELLBORE,
                        name: wellboreHeader.uniqueWellboreIdentifier,
                        uuid: wellboreHeader.wellboreUuid,
                    });
                }
            }

            for (const polyline of intersectionPolylines) {
                intersectionOptions.push({
                    type: IntersectionType.CUSTOM_POLYLINE,
                    name: polyline.name,
                    uuid: polyline.id,
                });
            }

            return intersectionOptions;
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

            const availableTimeOrIntervals = [
                ...Array.from(
                    new Set(
                        gridAttributeArr
                            .filter((attr) => attr.property_name === gridAttribute)
                            .map((gridAttribute) => gridAttribute.iso_date_or_interval ?? "NO_TIME"),
                    ),
                ),
            ];

            return availableTimeOrIntervals;
        });

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = helperDependency(
            async ({ getLocalSetting, getGlobalSetting }) => {
                const fieldIdentifier = getGlobalSetting("fieldId");
                const intersection = getLocalSetting(Setting.INTERSECTION);
                const intersectionExtensionLength = getLocalSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;

                // If no intersection is selected, return an empty polyline
                if (!intersection) {
                    const emptyPolylineWithSectionLengthsPromise = new Promise<PolylineWithSectionLengths>((resolve) =>
                        resolve({
                            polylineUtmXy: [],
                            actualSectionLengths: [],
                        }),
                    );

                    return emptyPolylineWithSectionLengthsPromise;
                }

                if (intersection.type === IntersectionType.CUSTOM_POLYLINE) {
                    const polyline = workbenchSession
                        .getUserCreatedItems()
                        .getIntersectionPolylines()
                        .getPolyline(intersection.uuid);
                    if (!polyline) {
                        throw new Error(`Could not find polyline with id ${intersection.uuid}`);
                    }
                    const intersectionSpecification: PolylineIntersectionSpecification = {
                        type: IntersectionType.CUSTOM_POLYLINE,
                        polyline: polyline,
                    };
                    return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification);
                }
                if (intersection.type === IntersectionType.WELLBORE) {
                    if (!fieldIdentifier) {
                        throw new Error("Field identifier is not set");
                    }

                    const intersectionSpecification: WellboreIntersectionSpecification = {
                        type: IntersectionType.WELLBORE,
                        wellboreUuid: intersection.uuid,
                        intersectionExtensionLength: intersectionExtensionLength,
                        fieldIdentifier: fieldIdentifier,
                        queryClient,
                    };
                    return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification);
                }

                throw new Error(`Unhandled intersection type ${intersection.type}`);
            },
        );

        storedDataUpdater("polylineWithSectionLengths", ({ getHelperDependency }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );

            // If no intersection is selected, or polyline is empty, return an empty polyline
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return {
                    polylineUtmXy: [],
                    actualSectionLengths: [],
                };
            }

            return intersectionPolylineWithSectionLengths;
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        IntersectionRealizationGridStoredData
    >): Promise<IntersectionRealizationGridData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const gridName = getSetting(Setting.GRID_NAME);
        const parameterName = getSetting(Setting.ATTRIBUTE);
        let timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }

        const polylineWithSectionLengths = getStoredData("polylineWithSectionLengths");
        if (!polylineWithSectionLengths) {
            throw new Error("No polyline and actual section lengths found in stored data");
        }
        if (polylineWithSectionLengths.polylineUtmXy.length < 4) {
            throw new Error("Invalid polyline in stored data. Must contain at least two (x,y)-points");
        }

        const queryOptions = postGetPolylineIntersectionOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                grid_name: gridName ?? "",
                parameter_name: parameterName ?? "",
                parameter_time_or_interval_str: timeOrInterval,
                realization_num: realizationNum ?? 0,
            },
            body: { polyline_utm_xy: polylineWithSectionLengths.polylineUtmXy },
        });

        registerQueryKey(queryOptions.queryKey);

        const gridIntersectionPromise = queryClient.fetchQuery(queryOptions).then(transformPolylineIntersection);

        return gridIntersectionPromise;
    }
}

import { getGridModelsInfoOptions, getGridParameterOptions, getGridSurfaceOptions } from "@api";
import type { GridMappedProperty_trans, GridSurface_trans } from "@modules/3DViewer/view/queries/queryDataTransforms";
import { transformGridMappedProperty, transformGridSurface } from "@modules/3DViewer/view/queries/queryDataTransforms";
import type {
    AreSettingsValidArgs,
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { RealizationGridData } from "@modules/_shared/DataProviderFramework/visualization/utils/types";

const realizationGridSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.GRID_NAME,
    Setting.GRID_LAYER_RANGE,
    Setting.TIME_OR_INTERVAL,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
] as const;
export type RealizationGridSettings = typeof realizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationGridSettings>;

export class RealizationGridProvider
    implements CustomDataProviderImplementation<RealizationGridSettings, RealizationGridData>
{
    settings = realizationGridSettings;

    getDefaultSettingsValues() {
        return {
            [Setting.SHOW_GRID_LINES]: false,
        };
    }

    getDefaultName() {
        return "Realization Grid";
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: SettingsWithTypes | null,
        newSettings: SettingsWithTypes,
    ): boolean {
        if (prevSettings === null) {
            return true;
        }
        if (
            prevSettings[Setting.ENSEMBLE] !== newSettings[Setting.ENSEMBLE] ||
            prevSettings[Setting.REALIZATION] !== newSettings[Setting.REALIZATION] ||
            prevSettings[Setting.GRID_NAME] !== newSettings[Setting.GRID_NAME] ||
            prevSettings[Setting.ATTRIBUTE] !== newSettings[Setting.ATTRIBUTE] ||
            prevSettings[Setting.TIME_OR_INTERVAL] !== newSettings[Setting.TIME_OR_INTERVAL] ||
            prevSettings[Setting.GRID_LAYER_RANGE] !== newSettings[Setting.GRID_LAYER_RANGE]
        ) {
            return true;
        }
        return false;
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<RealizationGridSettings, RealizationGridData>): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
    }

    fetchData({
        getSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<RealizationGridSettings, RealizationGridData>): Promise<{
        gridSurfaceData: GridSurface_trans;
        gridParameterData: GridMappedProperty_trans;
    }> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const gridName = getSetting(Setting.GRID_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        let timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }
        const range = getSetting(Setting.GRID_LAYER_RANGE);

        if (range === null) {
            throw new Error("Grid ranges are not set");
        }

        const gridParameterOptions = getGridParameterOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                grid_name: gridName ?? "",
                parameter_name: attribute ?? "",
                parameter_time_or_interval_str: timeOrInterval,
                realization_num: realizationNum ?? 0,
                i_min: range[0][0],
                i_max: range[0][1],
                j_min: range[1][0],
                j_max: range[1][1],
                k_min: range[2][0],
                k_max: range[2][1],
            },
        });

        registerQueryKey(gridParameterOptions.queryKey);

        const gridSurfaceOptions = getGridSurfaceOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                grid_name: gridName ?? "",
                realization_num: realizationNum ?? 0,
                i_min: range[0][0],
                i_max: range[0][1],
                j_min: range[1][0],
                j_max: range[1][1],
                k_min: range[2][0],
                k_max: range[2][1],
            },
        });

        registerQueryKey(gridSurfaceOptions.queryKey);

        const gridParameterPromise = queryClient.fetchQuery(gridParameterOptions).then(transformGridMappedProperty);

        const gridSurfacePromise = queryClient.fetchQuery(gridSurfaceOptions).then(transformGridSurface);

        return Promise.all([gridSurfacePromise, gridParameterPromise]).then(([gridSurfaceData, gridParameterData]) => ({
            gridSurfaceData,
            gridParameterData,
        }));
    }

    areCurrentSettingsValid({
        getSetting,
    }: AreSettingsValidArgs<RealizationGridSettings, RealizationGridData>): boolean {
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.GRID_NAME) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.GRID_LAYER_RANGE) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationGridSettings>) {
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

        availableSettingsUpdater(Setting.GRID_LAYER_RANGE, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(Setting.GRID_NAME);
            const data = getHelperDependency(realizationGridDataDep);

            if (!gridName || !data) {
                return [
                    [0, 0, 1],
                    [0, 0, 1],
                    [0, 0, 1],
                ];
            }

            const gridDimensions = data.find((gridModel) => gridModel.grid_name === gridName)?.dimensions ?? null;
            if (!gridDimensions) {
                return [
                    [0, 0, 1],
                    [0, 0, 1],
                    [0, 0, 1],
                ];
            }

            return [
                [0, gridDimensions.i_count - 1, 1],
                [0, gridDimensions.j_count - 1, 1],
                [0, gridDimensions.k_count - 1, 1],
            ];
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
    }
}

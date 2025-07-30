import { type SeismicCubeMeta_api, getSeismicCubeMetaListOptions, getSeismicSlicesOptions } from "@api";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { NO_UPDATE } from "@modules/_shared/DataProviderFramework/delegates/_utils/Dependency";
import type {
    AreSettingsValidArgs,
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { NullableStoredData } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/sharedTypes";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { isEqual } from "lodash";

import { type SeismicSliceData_trans, transformSeismicSlice } from "../utils/transformSeismicSlice";

const realizationSeismicSlicesSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SEISMIC_SLICES,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
] as const;
export type RealizationSeismicSlicesSettings = typeof realizationSeismicSlicesSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationSeismicSlicesSettings>;

export type RealizationSeismicSlicesData = {
    inline: SeismicSliceData_trans;
    crossline: SeismicSliceData_trans;
    depthSlice: SeismicSliceData_trans;
};

export type RealizationSeismicSlicesStoredData = {
    seismicCubeMeta: SeismicCubeMeta_api;
    seismicSlices: [number, number, number];
};

export class RealizationSeismicSlicesProvider
    implements
        CustomDataProviderImplementation<
            RealizationSeismicSlicesSettings,
            RealizationSeismicSlicesData,
            RealizationSeismicSlicesStoredData
        >
{
    settings = realizationSeismicSlicesSettings;

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
            [Setting.COLOR_SCALE]: {
                colorScale: defaultColorScale,
                areBoundariesUserDefined: false,
            },
            [Setting.OPACITY_PERCENT]: 100,
        };
    }

    getDefaultName(): string {
        return "Seismic Slices (realization)";
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: SettingsWithTypes | null,
        newSettings: SettingsWithTypes,
    ): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings[Setting.ENSEMBLE], newSettings[Setting.ENSEMBLE]) ||
            !isEqual(prevSettings[Setting.REALIZATION], newSettings[Setting.REALIZATION]) ||
            !isEqual(prevSettings[Setting.ATTRIBUTE], newSettings[Setting.ATTRIBUTE]) ||
            !isEqual(prevSettings[Setting.TIME_OR_INTERVAL], newSettings[Setting.TIME_OR_INTERVAL])
        );
    }

    areCurrentSettingsValid({
        getStoredData,
        getSetting,
    }: AreSettingsValidArgs<
        RealizationSeismicSlicesSettings,
        RealizationSeismicSlicesData,
        RealizationSeismicSlicesStoredData
    >): boolean {
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null &&
            getStoredData("seismicSlices") !== null &&
            getStoredData("seismicCubeMeta") !== null
        );
    }

    doStoredDataChangesRequireDataRefetch(
        prevStoredData: NullableStoredData<RealizationSeismicSlicesStoredData> | null,
        newStoredData: NullableStoredData<RealizationSeismicSlicesStoredData>,
    ): boolean {
        return !prevStoredData || !isEqual(prevStoredData.seismicSlices, newStoredData.seismicSlices);
    }

    makeValueRange(
        accessors: DataProviderInformationAccessors<
            RealizationSeismicSlicesSettings,
            RealizationSeismicSlicesData,
            RealizationSeismicSlicesStoredData
        >,
    ): [number, number] | null {
        const data = accessors.getData();
        if (!data) {
            return null;
        }

        return [
            Math.min(data.inline.value_min, data.crossline.value_min, data.depthSlice.value_min),
            Math.max(data.inline.value_max, data.crossline.value_max, data.depthSlice.value_max),
        ];
    }

    fetchData({
        getSetting,
        getStoredData,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<
        RealizationSeismicSlicesSettings,
        RealizationSeismicSlicesData
    >): Promise<RealizationSeismicSlicesData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const slices = getStoredData("seismicSlices");

        const queryOptions = getSeismicSlicesOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                seismic_attribute: attribute ?? "",
                time_or_interval_str: timeOrInterval ?? "",
                observed: false,
                inline_number: slices?.[0] ?? 0,
                crossline_number: slices?.[1] ?? 0,
                depth_slice_number: slices?.[2] ?? 0,
            },
        });

        registerQueryKey(queryOptions.queryKey);

        return queryClient
            .fetchQuery({
                ...queryOptions,
            })
            .then((data) => ({
                inline: transformSeismicSlice(data[0]),
                crossline: transformSeismicSlice(data[1]),
                depthSlice: transformSeismicSlice(data[2]),
            }));
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        storedDataUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationSeismicSlicesSettings, RealizationSeismicSlicesStoredData>): void {
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

        const realizationSeismicCrosslineDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realization = getLocalSetting(Setting.REALIZATION);

            if (!ensembleIdent || realization === null) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getSeismicCubeMetaListOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        storedDataUpdater("seismicCubeMeta", ({ getHelperDependency, getLocalSetting }) => {
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const timeOrInterval = getLocalSetting(Setting.TIME_OR_INTERVAL);

            if (!data || !attribute || !timeOrInterval) {
                return null;
            }

            return (
                data.find(
                    (seismicCubeMeta) =>
                        seismicCubeMeta.seismicAttribute === attribute &&
                        seismicCubeMeta.isoDateOrInterval === timeOrInterval,
                ) ?? null
            );
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!data) {
                return [];
            }

            const availableSeismicAttributes = Array.from(
                new Set(data.filter((el) => el.isDepth).map((el) => el.seismicAttribute)),
            ).sort();

            return availableSeismicAttributes;
        });

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(Setting.ATTRIBUTE);

            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!seismicAttribute || !data) {
                return [];
            }

            const availableTimeOrIntervals = [
                ...Array.from(
                    new Set(
                        data
                            .filter((surface) => surface.seismicAttribute === seismicAttribute)
                            .map((el) => el.isoDateOrInterval),
                    ),
                ),
            ];

            return availableTimeOrIntervals;
        });

        availableSettingsUpdater(Setting.SEISMIC_SLICES, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(Setting.ATTRIBUTE);
            const timeOrInterval = getLocalSetting(Setting.TIME_OR_INTERVAL);
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!seismicAttribute || !timeOrInterval || !data) {
                return [
                    [0, 0, 1],
                    [0, 0, 1],
                    [0, 0, 1],
                ];
            }
            const seismicInfo = data.filter(
                (seismicInfos) =>
                    seismicInfos.seismicAttribute === seismicAttribute &&
                    seismicInfos.isoDateOrInterval === timeOrInterval,
            )[0];

            const xMin = 0;
            const xMax = seismicInfo.spec.numCols - 1;
            const xInc = 1;

            const yMin = 0;
            const yMax = seismicInfo.spec.numRows - 1;
            const yInc = 1;

            const zMin = seismicInfo.spec.zOrigin;
            const zMax =
                seismicInfo.spec.zOrigin +
                seismicInfo.spec.zInc * seismicInfo.spec.zFlip * (seismicInfo.spec.numLayers - 1);
            const zInc = seismicInfo.spec.zInc;

            return [
                [xMin, xMax, xInc],
                [yMin, yMax, yInc],
                [zMin, zMax, zInc],
            ];
        });

        storedDataUpdater("seismicSlices", ({ getLocalSetting }) => {
            const slices = getLocalSetting(Setting.SEISMIC_SLICES);

            if (!slices) {
                return null;
            }

            if (slices.applied) {
                return slices.value;
            }

            return NO_UPDATE;
        });
    }
}

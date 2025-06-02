import { isEqual } from "lodash";

import { type SeismicCubeMeta_api, getDepthSliceOptions, getSeismicCubeMetaListOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { type SeismicSliceData_trans, transformSeismicSlice } from "../utils/transformSeismicSlice";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

const realizationSeismicSlicesSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SEISMIC_SLICES,
    Setting.COLOR_SCALE,
    Setting.OMIT_RANGE,
    Setting.OMIT_COLOR,
] as const;
export type RealizationSeismicSlicesSettings = typeof realizationSeismicSlicesSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationSeismicSlicesSettings>;

export type RealizationSeismicSlicesData = SeismicSliceData_trans;

export type RealizationSeismicSlicesStoredData = {
    seismicCubeMeta: SeismicCubeMeta_api[];
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
            !isEqual(prevSettings[Setting.TIME_OR_INTERVAL], newSettings[Setting.TIME_OR_INTERVAL]) ||
            !isEqual(prevSettings[Setting.SEISMIC_SLICES], newSettings[Setting.SEISMIC_SLICES])
        );
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
        return [data.value_min, data.value_max];
    }

    fetchData({
        getSetting,
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
        const slices = getSetting(Setting.SEISMIC_SLICES);

        const queryOptions = getDepthSliceOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                seismic_attribute: attribute ?? "",
                time_or_interval_str: timeOrInterval ?? "",
                observed: false,
                depth_slice_no: slices?.[2] ?? 0,
            },
        });

        registerQueryKey(queryOptions.queryKey);

        return queryClient
            .fetchQuery({
                ...queryOptions,
            })
            .then((data) => transformSeismicSlice(data));
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

        storedDataUpdater("seismicCubeMeta", ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!data) {
                return null;
            }

            return data;
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!data) {
                return [];
            }

            const availableSeismicAttributes = [
                ...Array.from(new Set(data.map((seismicInfos) => seismicInfos.seismicAttribute))),
            ];

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

        availableSettingsUpdater(Setting.OMIT_RANGE, () => {
            return [-10, 10, 0.001];
        });
    }
}

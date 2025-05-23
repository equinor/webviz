import { isEqual } from "lodash";

import { type SeismicCubeMeta_api, getCrosslineSliceOptions, getSeismicCubeMetaListOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { type SeismicSliceData_trans, transformSeismicSlice } from "../utils/transformSeismicSlice";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";

const realizationSeismicCrosslineSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SEISMIC_CROSSLINE,
    Setting.COLOR_SCALE,
] as const;
export type RealizationSeismicCrosslineSettings = typeof realizationSeismicCrosslineSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationSeismicCrosslineSettings>;

export type RealizationSeismicCrosslineData = SeismicSliceData_trans;

export type RealizationSeismicCrosslineStoredData = {
    seismicCubeMeta: SeismicCubeMeta_api[];
};

export class RealizationSeismicCrosslineProvider
    implements
        CustomDataProviderImplementation<
            RealizationSeismicCrosslineSettings,
            RealizationSeismicCrosslineData,
            RealizationSeismicCrosslineStoredData
        >
{
    settings = realizationSeismicCrosslineSettings;

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
        return "Seismic Crossline (realization)";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange(
        accessors: DataProviderInformationAccessors<
            RealizationSeismicCrosslineSettings,
            RealizationSeismicCrosslineData,
            RealizationSeismicCrosslineStoredData
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
        RealizationSeismicCrosslineSettings,
        RealizationSeismicCrosslineData,
        RealizationSeismicCrosslineStoredData
    >): Promise<RealizationSeismicCrosslineData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const crosslineNumber = getSetting(Setting.SEISMIC_CROSSLINE);

        const queryOptions = getCrosslineSliceOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                seismic_attribute: attribute ?? "",
                time_or_interval_str: timeOrInterval ?? "",
                observed: false,
                crossline_no: crosslineNumber ?? 0,
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
    }: DefineDependenciesArgs<RealizationSeismicCrosslineSettings, RealizationSeismicCrosslineStoredData>): void {
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

        availableSettingsUpdater(Setting.SEISMIC_CROSSLINE, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(Setting.ATTRIBUTE);
            const timeOrInterval = getLocalSetting(Setting.TIME_OR_INTERVAL);
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!seismicAttribute || !timeOrInterval || !data) {
                return [0, 0, 0];
            }
            const seismicInfo = data.filter(
                (seismicInfos) =>
                    seismicInfos.seismicAttribute === seismicAttribute &&
                    seismicInfos.isoDateOrInterval === timeOrInterval,
            )[0];
            const jMin = 0;
            const jMax = seismicInfo.spec.numRows - 1;

            return [jMin, jMax, 1];
        });
    }
}

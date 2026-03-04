import { isEqual } from "lodash";

import { type SeismicCubeMeta_api, getSeismicCubeMetaListOptions, getSeismicSlicesOptions } from "@api";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { NO_UPDATE } from "@modules/_shared/DataProviderFramework/delegates/_utils/Dependency";
import type {
    AreSettingsValidArgs,
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { NullableStoredData } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/sharedTypes";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

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
        fetchQuery,
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
                ...makeCacheBustingQueryParam(ensembleIdent ?? null),
            },
        });

        return fetchQuery({
            ...queryOptions,
        }).then((data) => ({
            inline: transformSeismicSlice(data[0]),
            crossline: transformSeismicSlice(data[1]),
            depthSlice: transformSeismicSlice(data[2]),
        }));
    }

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
    }: SetupBindingsContext<RealizationSeismicSlicesSettings, RealizationSeismicSlicesStoredData>): void {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                const ensembleIdents = ensembles
                    .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                    .map((ensemble) => ensemble.getIdent());

                return ensembleIdents;
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
                if (!ensembleIdent) {
                    return [];
                }

                const realizations = realizationFilterFunc(ensembleIdent);

                return [...realizations];
            },
        });

        const realizationSeismicCrosslineDataDep = makeSharedResult({
            debugName: "RealizationSeismicCrosslineData",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realization: read.localSetting(Setting.REALIZATION),
                };
            },
            async resolve({ ensembleIdent, realization }, abortSignal) {
                if (!ensembleIdent || realization === null) {
                    return null;
                }

                return await queryClient.fetchQuery({
                    ...getSeismicCubeMetaListOptions({
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

        storedData("seismicCubeMeta").bindValue({
            read({ read }) {
                return {
                    data: read.sharedResult(realizationSeismicCrosslineDataDep),
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                    timeOrInterval: read.localSetting(Setting.TIME_OR_INTERVAL),
                };
            },
            resolve({ data, attribute, timeOrInterval }) {
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
            },
        });

        setting(Setting.ATTRIBUTE).bindValueConstraints({
            read({ read }) {
                return {
                    data: read.sharedResult(realizationSeismicCrosslineDataDep),
                };
            },
            resolve({ data }) {
                if (!data) {
                    return [];
                }

                const availableSeismicAttributes = Array.from(
                    new Set(data.filter((el) => el.isDepth).map((el) => el.seismicAttribute)),
                ).sort();

                return availableSeismicAttributes;
            },
        });

        setting(Setting.TIME_OR_INTERVAL).bindValueConstraints({
            read({ read }) {
                return {
                    seismicAttribute: read.localSetting(Setting.ATTRIBUTE),
                    data: read.sharedResult(realizationSeismicCrosslineDataDep),
                };
            },
            resolve({ seismicAttribute, data }) {
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
            },
        });

        setting(Setting.SEISMIC_SLICES).bindValueConstraints({
            read({ read }) {
                return {
                    seismicAttribute: read.localSetting(Setting.ATTRIBUTE),
                    timeOrInterval: read.localSetting(Setting.TIME_OR_INTERVAL),
                    data: read.sharedResult(realizationSeismicCrosslineDataDep),
                };
            },
            resolve({ seismicAttribute, timeOrInterval, data }) {
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
            },
        });

        storedData("seismicSlices").bindValue({
            read({ read }) {
                return {
                    slices: read.localSetting(Setting.SEISMIC_SLICES),
                };
            },
            resolve({ slices }) {
                if (!slices) {
                    return null;
                }

                if (slices.applied) {
                    return slices.value;
                }

                return NO_UPDATE;
            },
        });
    }
}

import { isEqual } from "lodash";

import { type SeismicCubeMeta_api, getSeismicCubeMetaListOptions, getSeismicSlicesOptions } from "@api";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { NO_UPDATE } from "@modules/_shared/DataProviderFramework/delegates/_utils/Dependency";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { NullableStoredData } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/sharedTypes";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Representation } from "@modules/_shared/DataProviderFramework/settings/implementations/RepresentationSetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { representationToApiRepresentation } from "./representationUtils";
import { type SeismicSliceData_trans, transformSeismicSlice } from "./transformSeismicSlice";

const seismicSlicesSettings = [
    Setting.ENSEMBLE,
    Setting.REPRESENTATION,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SEISMIC_SLICES,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
] as const;
export type SeismicSlicesSettings = typeof seismicSlicesSettings;
type SettingsWithTypes = MakeSettingTypesMap<SeismicSlicesSettings>;

export type SeismicSlicesData = {
    inline: SeismicSliceData_trans;
    crossline: SeismicSliceData_trans;
    depthSlice: SeismicSliceData_trans;
};

export type SeismicSlicesStoredData = {
    seismicCubeMeta: SeismicCubeMeta_api;
    seismicSlices: [number, number, number];
};

export class SeismicSlicesProvider implements CustomDataProviderImplementation<
    SeismicSlicesSettings,
    SeismicSlicesData,
    SeismicSlicesStoredData
> {
    settings = seismicSlicesSettings;

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
        return "Seismic Slices";
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
            !isEqual(prevSettings[Setting.REPRESENTATION], newSettings[Setting.REPRESENTATION])
        );
    }

    areCurrentSettingsValid({
        getStoredData,
        getSetting,
    }: DataProviderAccessors<SeismicSlicesSettings, SeismicSlicesData, SeismicSlicesStoredData>): boolean {
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null &&
            getSetting(Setting.REPRESENTATION) !== null &&
            getStoredData("seismicSlices") !== null &&
            getStoredData("seismicCubeMeta") !== null
        );
    }

    doStoredDataChangesRequireDataRefetch(
        prevStoredData: NullableStoredData<SeismicSlicesStoredData> | null,
        newStoredData: NullableStoredData<SeismicSlicesStoredData>,
    ): boolean {
        return !prevStoredData || !isEqual(prevStoredData.seismicSlices, newStoredData.seismicSlices);
    }

    makeValueRange(
        accessors: DataProviderAccessors<SeismicSlicesSettings, SeismicSlicesData, SeismicSlicesStoredData>,
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
    }: FetchDataParams<SeismicSlicesSettings, SeismicSlicesData>): Promise<SeismicSlicesData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const representation = getSetting(Setting.REPRESENTATION);
        const slices = getStoredData("seismicSlices");

        const queryOptions = getSeismicSlicesOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                seismic_attribute: attribute ?? "",
                time_or_interval_str: timeOrInterval ?? "",
                representation: representationToApiRepresentation(representation ?? Representation.REALIZATION),
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
    }: SetupBindingsContext<SeismicSlicesSettings, SeismicSlicesStoredData>): void {
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
                if (!fieldId || !ensembles) {
                    return [];
                }

                return ensembles
                    .filter((ensemble) => ensemble.getFieldIdentifier() === fieldId)
                    .map((ensemble) => ensemble.getIdent());
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
                if (!ensembleIdent || !realizationFilterFunction) {
                    return [];
                }

                return [...realizationFilterFunction(ensembleIdent)];
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

        storedData("seismicCubeMeta").bindValue({
            read(read) {
                return {
                    seismicCubeMetaList: read.sharedResult(seismicCubeMetaList),
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                    timeOrInterval: read.localSetting(Setting.TIME_OR_INTERVAL),
                };
            },
            resolve({ seismicCubeMetaList, attribute, timeOrInterval }) {
                if (!seismicCubeMetaList || !attribute || !timeOrInterval) {
                    return null;
                }

                return (
                    seismicCubeMetaList.find(
                        (seismicCubeMeta) =>
                            seismicCubeMeta.seismicAttribute === attribute &&
                            seismicCubeMeta.isoDateOrInterval === timeOrInterval,
                    ) ?? null
                );
            },
        });

        setting(Setting.TIME_OR_INTERVAL).bindValueConstraints({
            read(read) {
                return {
                    seismicAttribute: read.localSetting(Setting.ATTRIBUTE),
                    seismicCubeMetaList: read.sharedResult(seismicCubeMetaList),
                };
            },
            resolve({ seismicAttribute, seismicCubeMetaList }) {
                if (!seismicAttribute || !seismicCubeMetaList) {
                    return [];
                }

                const availableTimeOrIntervals = [
                    ...new Set(
                        seismicCubeMetaList
                            .filter((surface) => surface.seismicAttribute === seismicAttribute)
                            .map((el) => el.isoDateOrInterval),
                    ),
                ];

                return availableTimeOrIntervals;
            },
        });

        setting(Setting.SEISMIC_SLICES).bindValueConstraints({
            read(read) {
                return {
                    seismicAttribute: read.localSetting(Setting.ATTRIBUTE),
                    timeOrInterval: read.localSetting(Setting.TIME_OR_INTERVAL),
                    seismicCubeMetaList: read.sharedResult(seismicCubeMetaList),
                };
            },
            resolve({ seismicAttribute, timeOrInterval, seismicCubeMetaList }) {
                if (!seismicAttribute || !timeOrInterval || !seismicCubeMetaList) {
                    return [
                        [0, 0, 1],
                        [0, 0, 1],
                        [0, 0, 1],
                    ];
                }
                const seismicInfo = seismicCubeMetaList.filter(
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
            read(read) {
                return {
                    seismicSlices: read.localSetting(Setting.SEISMIC_SLICES),
                };
            },
            resolve({ seismicSlices }) {
                if (!seismicSlices) {
                    return null;
                }

                if (seismicSlices.applied) {
                    return seismicSlices.value;
                }

                return NO_UPDATE;
            },
        });
    }
}

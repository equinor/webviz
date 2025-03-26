import { type SeismicCubeMeta_api, getInlineSliceOptions, getSeismicCubeMetaListOptions } from "@api";
import {
    type SeismicSliceData_trans,
    transformSeismicSlice,
} from "@modules/3DViewerNew/settings/queries/queryDataTransforms";
import type {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/LayerFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";

import { isEqual } from "lodash";

const realizationSeismicInlineSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SEISMIC_INLINE,
    Setting.COLOR_SCALE,
] as const;
export type RealizationSeismicInlineSettings = typeof realizationSeismicInlineSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationSeismicInlineSettings>;

export type RealizationSeismicInlineData = SeismicSliceData_trans;

export type RealizationSeismicInlineStoredData = {
    seismicCubeMeta: SeismicCubeMeta_api[];
};

export class RealizationSeismicInlineLayer
    implements
        CustomDataLayerImplementation<
            RealizationSeismicInlineSettings,
            RealizationSeismicInlineData,
            RealizationSeismicInlineStoredData
        >
{
    settings = realizationSeismicInlineSettings;

    getDefaultName(): string {
        return "Seismic Inline (realization)";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange(
        accessors: DataLayerInformationAccessors<
            RealizationSeismicInlineSettings,
            RealizationSeismicInlineData,
            RealizationSeismicInlineStoredData
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
        RealizationSeismicInlineSettings,
        RealizationSeismicInlineData
    >): Promise<RealizationSeismicInlineData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const inlineNumber = getSetting(Setting.SEISMIC_INLINE);

        const queryOptions = getInlineSliceOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                seismic_attribute: attribute ?? "",
                time_or_interval_str: timeOrInterval ?? "",
                observed: false,
                inline_no: inlineNumber ?? 0,
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
    }: DefineDependenciesArgs<RealizationSeismicInlineSettings, RealizationSeismicInlineStoredData>): void {
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

        availableSettingsUpdater(Setting.SEISMIC_INLINE, ({ getLocalSetting, getHelperDependency }) => {
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
            const iMin = 0;
            const iMax = seismicInfo.spec.numCols - 1;

            return [iMin, iMax, 1];
        });
    }
}

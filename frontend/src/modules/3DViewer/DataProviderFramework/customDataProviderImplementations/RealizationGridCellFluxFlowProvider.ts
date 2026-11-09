import {
    getGridLayerCornerGeometryOptions,
    getGridLayerCellPropertiesOptions,
    getGridModelsInfoOptions,
    getGridPillarGeometryOptions,
} from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortTimeOrIntervalArray } from "@lib/utils/arrays";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableRealizationsForEnsembleIdent,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import { NO_UPDATE } from "@modules/_shared/DataProviderFramework/delegates/_utils/Dependency";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    GridCellFluxData,
    GridCellFluxPhaseFlux,
} from "@modules/_shared/DataProviderFramework/visualization/utils/types";
import { reconstructCellCorners } from "@modules_shared/Grid3d/gridCellCornerReconstruction";
import {
    transformGridLayerCellProperties,
    transformGridLayerCornerGeometry,
    transformGridPillarGeometry,
} from "@modules_shared/utils/queryDataTransforms";

// FLR<PHASE><DIRECTION>+, the standard Eclipse inter-block flow-rate keywords.
const FLUX_PROPERTY_NAMES = {
    oil: { i: "FLROILI+", j: "FLROILJ+", k: "FLROILK+" },
    gas: { i: "FLRGASI+", j: "FLRGASJ+", k: "FLRGASK+" },
    water: { i: "FLRWATI+", j: "FLRWATJ+", k: "FLRWATK+" },
} as const;
type Phase = keyof typeof FLUX_PROPERTY_NAMES;
const PHASES = Object.keys(FLUX_PROPERTY_NAMES) as Phase[];
const ALL_FLUX_PROPERTY_NAMES = PHASES.flatMap((phase) => Object.values(FLUX_PROPERTY_NAMES[phase]));

const gridCellFluxSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.GRID_NAME,
    Setting.GRID_LAYER_K,
    Setting.TIME_OR_INTERVAL,
    Setting.PHASE,
    // TODO: just her to toggle debug, remove later
    Setting.SHOW_CELL_INDICES,
    Setting.SHOW_GRID_LINES,
    Setting.SHOW_CELL_VELOCITY,
] as const;

export type GridCellFluxSettings = typeof gridCellFluxSettings;
type SettingsWithTypes = MakeSettingTypesMap<GridCellFluxSettings>;

type StoredData = {
    availableGridDimensions: { i: number; j: number; k: number };
};

export class RealizationGridCellFluxFlowProvider implements CustomDataProviderImplementation<
    GridCellFluxSettings,
    GridCellFluxData,
    StoredData
> {
    settings = gridCellFluxSettings;

    getDefaultName() {
        return "Flow visualization";
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: SettingsWithTypes | null,
        newSettings: SettingsWithTypes,
    ): boolean {
        if (prevSettings === null) {
            return true;
        }
        // Note: FLUX_PHASES_SHOWN, FLUX_DIRECTIONS_SHOWN, SHOW_GRID_POINTS,
        // SHOW_GRID_PILLARS and SHOW_CELL_INDICES deliberately excluded -- all phases and
        // directions are always fetched, and these settings only gate what the layer
        // renders, not what data is fetched.
        return (
            prevSettings[Setting.ENSEMBLE] !== newSettings[Setting.ENSEMBLE] ||
            prevSettings[Setting.REALIZATION] !== newSettings[Setting.REALIZATION] ||
            prevSettings[Setting.GRID_NAME] !== newSettings[Setting.GRID_NAME] ||
            prevSettings[Setting.GRID_LAYER_K] !== newSettings[Setting.GRID_LAYER_K] ||
            prevSettings[Setting.TIME_OR_INTERVAL] !== newSettings[Setting.TIME_OR_INTERVAL]
        );
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<GridCellFluxSettings, GridCellFluxData, StoredData>): boolean {
        // Note: TIME_OR_INTERVAL deliberately excluded -- it only constrains which flux
        // dates are available, and resolves to no options at all when the case has no
        // flux properties. The geometry itself is not time-dependent, so it must still be
        // able to load in that case; fetchData() treats a missing time/interval as "no
        // flux data" rather than an error.
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.GRID_NAME) !== null &&
            getSetting(Setting.GRID_LAYER_K) !== null
        );
    }

    async fetchData({
        getSetting,
        fetchQuery,
    }: FetchDataParams<GridCellFluxSettings, GridCellFluxData, StoredData>): Promise<GridCellFluxData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const gridName = getSetting(Setting.GRID_NAME);
        const k = getSetting(Setting.GRID_LAYER_K) ?? 0;
        let timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }

        const caseUuid = ensembleIdent?.getCaseUuid() ?? "";
        const ensembleName = ensembleIdent?.getEnsembleName() ?? "";
        const cacheBust = makeCacheBustingQueryParam(ensembleIdent ?? null);

        const pillarGeometryPromise = fetchQuery(
            getGridPillarGeometryOptions({
                query: {
                    case_uuid: caseUuid,
                    ensemble_name: ensembleName,
                    grid_name: gridName ?? "",
                    realization_num: realizationNum ?? 0,
                    ...cacheBust,
                },
            }),
        ).then(transformGridPillarGeometry);

        const layerGeometryPromise = fetchQuery(
            getGridLayerCornerGeometryOptions({
                query: {
                    case_uuid: caseUuid,
                    ensemble_name: ensembleName,
                    grid_name: gridName ?? "",
                    realization_num: realizationNum ?? 0,
                    k: k,
                    ...cacheBust,
                },
            }),
        ).then(transformGridLayerCornerGeometry);

        // Phases are optional -- if the flux properties fail to load (e.g. not present
        // in this case), fall back to no flux data instead of failing the whole provider.
        const fluxPropertiesPromise = fetchQuery(
            getGridLayerCellPropertiesOptions({
                query: {
                    case_uuid: caseUuid,
                    ensemble_name: ensembleName,
                    grid_name: gridName ?? "",
                    property_names: ALL_FLUX_PROPERTY_NAMES,
                    property_time_or_interval_str: timeOrInterval,
                    realization_num: realizationNum ?? 0,
                    k: k,
                    ...cacheBust,
                },
            }),
        )
            .then(transformGridLayerCellProperties)
            .catch(() => null);

        const [pillarGeometry, layerGeometry, fluxProperties] = await Promise.all([
            pillarGeometryPromise,
            layerGeometryPromise,
            fluxPropertiesPromise,
        ]);

        const nx = pillarGeometry.i_count;
        const ny = pillarGeometry.j_count;

        const cellCornersFloat32Arr = reconstructCellCorners(pillarGeometry, layerGeometry);

        const phaseFlux: Partial<Record<Phase, GridCellFluxPhaseFlux>> = {};
        if (fluxProperties) {
            for (const phase of PHASES) {
                const iFaceFlux = fluxProperties.cellPropsFloat32ArrByName[FLUX_PROPERTY_NAMES[phase].i];
                const jFaceFlux = fluxProperties.cellPropsFloat32ArrByName[FLUX_PROPERTY_NAMES[phase].j];
                const kFaceFlux = fluxProperties.cellPropsFloat32ArrByName[FLUX_PROPERTY_NAMES[phase].k];
                if (iFaceFlux && jFaceFlux && kFaceFlux) {
                    phaseFlux[phase] = { iFaceFlux, jFaceFlux, kFaceFlux };
                }
            }
        }

        return {
            nx,
            ny,
            k,
            pillarsFloat32Arr: pillarGeometry.pillarsFloat32Arr,
            originUtmX: pillarGeometry.origin_utm_x,
            originUtmY: pillarGeometry.origin_utm_y,
            cellCornersFloat32Arr,
            activeUint8Arr: layerGeometry.activeUint8Arr,
            phaseFlux,
        };
    }

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
    }: SetupBindingsContext<GridCellFluxSettings, StoredData>) {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
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
                return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunction);
            },
        });

        const gridData = makeSharedResult({
            debugName: "RealizationGridCellFluxData",
            read(read) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realization: read.localSetting(Setting.REALIZATION),
                };
            },
            async resolve({ ensembleIdent, realization }, { abortSignal }) {
                if (!ensembleIdent || realization === null) {
                    return null;
                }

                return await queryClient.fetchQuery({
                    ...getGridModelsInfoOptions({
                        query: {
                            case_uuid: ensembleIdent.getCaseUuid(),
                            ensemble_name: ensembleIdent.getEnsembleName(),
                            realization_num: realization,
                            ...makeCacheBustingQueryParam(ensembleIdent),
                        },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.GRID_NAME).bindValueConstraints({
            read(read) {
                return { gridData: read.sharedResult(gridData) };
            },
            resolve({ gridData }) {
                if (!gridData) {
                    return [];
                }
                return [...new Set(gridData.map((gridModelInfo) => gridModelInfo.grid_name))];
            },
        });

        setting(Setting.GRID_LAYER_K).bindValueConstraints({
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridData }) {
                if (!gridName || !gridData) {
                    return [0, 0];
                }
                const gridDimensions = gridData.find((g) => g.grid_name === gridName)?.dimensions ?? null;
                const availableGridLayers: [number, number] = [0, 0];
                if (gridDimensions) {
                    availableGridLayers[1] = gridDimensions.k_count;
                }
                return availableGridLayers;
            },
        });

        // Flux attribute names are fixed (FLUX_PROPERTY_NAMES), not user-picked -- use
        // one canonical property (oil I-flux) as the basis for which report dates are
        // available, on the assumption that all flux properties share the same dates.
        setting(Setting.TIME_OR_INTERVAL).bindValueConstraints({
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridData }) {
                // Fall back to a single "NO_TIME" option when the flux properties are not
                // present in this case at all -- an empty options list would leave this
                // setting permanently unresolvable/invalid, which blocks the whole provider
                // (including geometry) even though flux is meant to be optional.
                if (!gridName || !gridData) {
                    return ["NO_TIME"];
                }
                const gridAttributeArr = gridData.find((g) => g.grid_name === gridName)?.property_info_arr ?? [];
                const timeOrIntervals = sortTimeOrIntervalArray(
                    Array.from(
                        new Set(
                            gridAttributeArr
                                .filter((attr) => attr.property_name === FLUX_PROPERTY_NAMES.oil.i)
                                .map((attr) => attr.iso_date_or_interval ?? "NO_TIME"),
                        ),
                    ),
                );
                return timeOrIntervals.length > 0 ? timeOrIntervals : ["NO_TIME"];
            },
        });

        storedData("availableGridDimensions").bindValue({
            read(read) {
                return { gridData: read.sharedResult(gridData) };
            },
            resolve({ gridData }) {
                if (!gridData || gridData.length === 0) {
                    return NO_UPDATE;
                }
                const dims = gridData[0].dimensions;
                return { i: dims.i_count, j: dims.j_count, k: dims.k_count };
            },
        });
    }
}

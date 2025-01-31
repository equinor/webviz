import {
    getGridParameterOptions,
    getGridSurfaceOptions,
    getWellTrajectoriesOptions,
    postGetPolylineIntersectionOptions,
} from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "@modules/3DViewer/view/queries/queryDataTransforms";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { BoundingBox, Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import {
    PolylineIntersection_trans,
    calcExtendedSimplifiedWellboreTrajectoryInXYPlane,
    transformPolylineIntersection,
} from "@modules/_shared/utils/wellbore";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationGridSettingsContext } from "./RealizationGridSettingsContext";
import { RealizationGridSettings } from "./types";

export class RealizationGridLayer
    implements
        Layer<
            RealizationGridSettings,
            {
                gridSurfaceData: GridSurface_trans | null;
                gridParameterData: GridMappedProperty_trans | null;
                polylineIntersectionData: PolylineIntersection_trans | null;
            }
        >
{
    private _layerDelegate: LayerDelegate<
        RealizationGridSettings,
        {
            gridSurfaceData: GridSurface_trans | null;
            gridParameterData: GridMappedProperty_trans | null;
            polylineIntersectionData: PolylineIntersection_trans | null;
        }
    >;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Realization Grid", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationGridSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<
        RealizationGridSettings,
        {
            gridSurfaceData: GridSurface_trans | null;
            gridParameterData: GridMappedProperty_trans | null;
            polylineIntersectionData: PolylineIntersection_trans | null;
        }
    > {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationGridSettings,
        newSettings: RealizationGridSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        if (data.polylineIntersectionData) {
            return null;
        }

        if (data.gridSurfaceData) {
            return {
                x: [
                    data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmin,
                    data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmax,
                ],
                y: [
                    data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymin,
                    data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymax,
                ],
                z: [data.gridSurfaceData.zmin, data.gridSurfaceData.zmax],
            };
        }

        return null;
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        if (data.polylineIntersectionData) {
            return [
                data.polylineIntersectionData.min_grid_prop_value,
                data.polylineIntersectionData.max_grid_prop_value,
            ];
        }

        if (data.gridParameterData) {
            return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
        }

        return null;
    }

    fetchData(queryClient: QueryClient): Promise<{
        gridSurfaceData: GridSurface_trans | null;
        gridParameterData: GridMappedProperty_trans | null;
        polylineIntersectionData: PolylineIntersection_trans | null;
    }> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const intersection = settings[SettingType.INTERSECTION].getDelegate().getValue();
        const gridName = settings[SettingType.GRID_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        let timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }
        let availableDimensions = settings[SettingType.GRID_LAYER_K_RANGE].getDelegate().getAvailableValues();
        if (!availableDimensions.length || availableDimensions[0] === null) {
            availableDimensions = [0, 0, 0];
        }
        const layerIRange = settings[SettingType.GRID_LAYER_I_RANGE].getDelegate().getValue();
        const iMin = layerIRange?.[0] ?? 0;
        const iMax = layerIRange?.[1] ?? 0;

        const layerJRange = settings[SettingType.GRID_LAYER_J_RANGE].getDelegate().getValue();
        const jMin = layerJRange?.[0] ?? 0;
        const jMax = layerJRange?.[1] ?? 0;

        const layerKRange = settings[SettingType.GRID_LAYER_K_RANGE].getDelegate().getValue();
        const kMin = layerKRange?.[0] ?? 0;
        const kMax = layerKRange?.[1] ?? 0;

        if (!intersection) {
            return this.fetchGridParameterAndSurface(
                queryClient,
                ensembleIdent,
                gridName,
                attribute,
                timeOrInterval,
                realizationNum,
                iMin,
                iMax,
                jMin,
                jMax,
                kMin,
                kMax
            );
        }

        return this.fetchPolylineIntersection(
            queryClient,
            ensembleIdent,
            gridName,
            attribute,
            timeOrInterval,
            realizationNum,
            intersection
        );
    }

    private fetchPolylineIntersection(
        queryClient: QueryClient,
        ensembleIdent: RegularEnsembleIdent | null,
        gridName: string | null,
        parameterName: string | null,
        timeOrInterval: string | null,
        realizationNum: number | null,
        intersection: { type: "wellbore" | "polyline"; name: string; uuid: string }
    ): Promise<{
        gridSurfaceData: GridSurface_trans | null;
        gridParameterData: GridMappedProperty_trans | null;
        polylineIntersectionData: PolylineIntersection_trans | null;
    }> {
        const fieldIdentifier = this._itemDelegate.getLayerManager().getGlobalSetting("fieldId");

        const queryKey = [
            "gridIntersection",
            ensembleIdent,
            gridName,
            parameterName,
            timeOrInterval,
            realizationNum,
            intersection,
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        let makePolylinePromise: Promise<number[]> = new Promise((resolve) => {
            if (intersection.type === "wellbore") {
                return queryClient
                    .fetchQuery({
                        ...getWellTrajectoriesOptions({
                            query: {
                                field_identifier: fieldIdentifier ?? "",
                                wellbore_uuids: [intersection.uuid],
                            },
                        }),
                    })
                    .then((data) => {
                        const path: number[][] = [];
                        for (const [index, northing] of data[0].northingArr.entries()) {
                            const easting = data[0].eastingArr[index];
                            const tvd_msl = data[0].tvdMslArr[index];

                            path.push([easting, northing, tvd_msl]);
                        }
                        const offset = data[0].tvdMslArr[0];

                        const intersectionReferenceSystem = new IntersectionReferenceSystem(path);
                        intersectionReferenceSystem.offset = offset;

                        const polylineUtmXy: number[] = [];
                        polylineUtmXy.push(
                            ...calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                                path,
                                0,
                                5
                            ).simplifiedWellboreTrajectoryXy.flat()
                        );

                        resolve(polylineUtmXy);
                    });
            } else {
                const intersectionPolyline = this._itemDelegate
                    .getLayerManager()
                    .getWorkbenchSession()
                    .getUserCreatedItems()
                    .getIntersectionPolylines()
                    .getPolyline(intersection.uuid);
                if (!intersectionPolyline) {
                    resolve([]);
                    return;
                }

                const polylineUtmXy: number[] = [];
                for (const point of intersectionPolyline.path) {
                    polylineUtmXy.push(point[0], point[1]);
                }

                resolve(polylineUtmXy);
            }
        });

        const gridIntersectionPromise = makePolylinePromise
            .then((polyline_utm_xy) =>
                queryClient.fetchQuery({
                    ...postGetPolylineIntersectionOptions({
                        query: {
                            case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                            ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                            grid_name: gridName ?? "",
                            parameter_name: parameterName ?? "",
                            parameter_time_or_interval_str: timeOrInterval,
                            realization_num: realizationNum ?? 0,
                        },
                        body: { polyline_utm_xy },
                    }),
                })
            )
            .then(transformPolylineIntersection)
            .then((data) => ({
                polylineIntersectionData: data,
                gridSurfaceData: null,
                gridParameterData: null,
            }));

        return gridIntersectionPromise;
    }

    private fetchGridParameterAndSurface(
        queryClient: QueryClient,
        ensembleIdent: RegularEnsembleIdent | null,
        gridName: string | null,
        parameterName: string | null,
        parameterTimeOrInterval: string | null,
        realizationNum: number | null,
        iMin: number,
        iMax: number,
        jMin: number,
        jMax: number,
        kMin: number,
        kMax: number
    ): Promise<{
        gridSurfaceData: GridSurface_trans | null;
        gridParameterData: GridMappedProperty_trans | null;
        polylineIntersectionData: PolylineIntersection_trans | null;
    }> {
        const queryKey = [
            "gridParameter",
            ensembleIdent,
            gridName,
            parameterName,
            parameterTimeOrInterval,
            realizationNum,
            iMin,
            iMax,
            jMin,
            jMax,
            kMin,
            kMax,
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const gridParameterPromise = queryClient
            .fetchQuery({
                ...getGridParameterOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        grid_name: gridName ?? "",
                        parameter_name: parameterName ?? "",
                        parameter_time_or_interval_str: parameterTimeOrInterval,
                        realization_num: realizationNum ?? 0,
                        i_min: iMin,
                        i_max: iMax - 1,
                        j_min: jMin,
                        j_max: jMax - 1,
                        k_min: kMin,
                        k_max: kMax,
                    },
                }),
            })
            .then(transformGridMappedProperty);

        const gridSurfacePromise = queryClient
            .fetchQuery({
                ...getGridSurfaceOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        grid_name: gridName ?? "",
                        realization_num: realizationNum ?? 0,
                        i_min: iMin,
                        i_max: iMax - 1,
                        j_min: jMin,
                        j_max: jMax - 1,
                        k_min: kMin,
                        k_max: kMax,
                    },
                }),
            })
            .then(transformGridSurface);

        return Promise.all([gridSurfacePromise, gridParameterPromise]).then(([gridSurfaceData, gridParameterData]) => ({
            gridSurfaceData,
            gridParameterData,
            polylineIntersectionData: null,
        }));
    }

    serializeState(): SerializedLayer<RealizationGridSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationGridSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationGridLayer);

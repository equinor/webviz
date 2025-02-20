import { getWellTrajectoriesOptions, postGetPolylineIntersectionOptions } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import * as bbox from "@lib/utils/boundingBox";
import * as vec3 from "@lib/utils/vec3";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import {
    PolylineIntersection_trans,
    calcExtendedSimplifiedWellboreTrajectoryInXYPlane,
    transformPolylineIntersection,
} from "@modules/_shared/utils/wellbore";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { IntersectionRealizationGridSettingsContext } from "./IntersectionRealizationGridSettingsContext";
import { IntersectionRealizationGridSettings } from "./types";

export class IntersectionRealizationGridLayer
    implements Layer<IntersectionRealizationGridSettings, PolylineIntersection_trans>
{
    private _layerDelegate: LayerDelegate<IntersectionRealizationGridSettings, PolylineIntersection_trans>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Intersection Realization Grid", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new IntersectionRealizationGridSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<IntersectionRealizationGridSettings, PolylineIntersection_trans> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: IntersectionRealizationGridSettings,
        newSettings: IntersectionRealizationGridSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): bbox.BBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const boundingBox = bbox.create(
            vec3.create(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
            vec3.create(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
        );

        for (const section of data.fenceMeshSections) {
            boundingBox.min.x = Math.min(boundingBox.min.x, section.start_utm_x, section.end_utm_x);
            boundingBox.max.x = Math.max(boundingBox.max.x, section.start_utm_x, section.end_utm_x);
            boundingBox.min.y = Math.min(boundingBox.min.y, section.start_utm_y, section.end_utm_y);
            boundingBox.max.y = Math.max(boundingBox.max.y, section.start_utm_y, section.end_utm_y);
            for (let i = 2; i < section.verticesUzFloat32Arr.length; i += 3) {
                boundingBox.min.z = Math.min(boundingBox.min.z, section.verticesUzFloat32Arr[i]);
                boundingBox.max.z = Math.max(boundingBox.max.z, section.verticesUzFloat32Arr[i]);
            }
        }

        return boundingBox;
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        if (data) {
            return [data.min_grid_prop_value, data.max_grid_prop_value];
        }

        return null;
    }

    fetchData(queryClient: QueryClient): Promise<PolylineIntersection_trans> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const intersection = settings[SettingType.INTERSECTION].getDelegate().getValue();
        const gridName = settings[SettingType.GRID_NAME].getDelegate().getValue();
        const parameterName = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        let timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }

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
            resolve([]);
        });

        if (intersection) {
            makePolylinePromise = new Promise((resolve) => {
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
        }

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
            .then(transformPolylineIntersection);

        return gridIntersectionPromise;
    }

    serializeState(): SerializedLayer<IntersectionRealizationGridSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<IntersectionRealizationGridSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(IntersectionRealizationGridLayer);

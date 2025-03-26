import type { SurfaceRealizationSampleValues_api } from "@api";
import { postGetSampleSurfaceInPointsOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import type { Vec2 } from "@lib/utils/vec2";
import { normalizeVec2, point2Distance } from "@lib/utils/vec2";
import type { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

import type { BoundingBox } from "./BaseLayer";
import { BaseLayer, LayerTopic } from "./BaseLayer";

export type SurfacesUncertaintyLayerSettings = {
    ensembleIdent: RegularEnsembleIdent | null;
    realizationNums: number[];
    polyline: {
        polylineUtmXy: number[];
        actualSectionLengths: number[];
    };
    surfaceNames: string[];
    attribute: string | null;
    extensionLength: number;
    resolution: number;
};

export type SurfaceUncertaintyData = {
    surfaceName: string;
    cumulatedLengths: number[];
    sampledValues: number[][];
};

function transformData(
    cumulatedLengths: number[],
    surfaceName: string,
    data: SurfaceRealizationSampleValues_api[],
): SurfaceUncertaintyData {
    const sampledValues: number[][] = data.map((realization) => realization.sampled_values);
    return {
        surfaceName: surfaceName,
        cumulatedLengths,
        sampledValues,
    };
}

export class SurfacesUncertaintyLayer extends BaseLayer<SurfacesUncertaintyLayerSettings, SurfaceUncertaintyData[]> {
    private _colorSet: ColorSet;

    constructor(name: string) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNums: [],
            polyline: {
                polylineUtmXy: [],
                actualSectionLengths: [],
            },
            surfaceNames: [],
            attribute: null,
            extensionLength: 0,
            resolution: 1,
        };
        super(name, defaultSettings);

        this._colorSet = new ColorSet(defaultColorPalettes[0]);
    }

    getColorSet(): ColorSet {
        return this._colorSet;
    }

    setColorSet(colorSet: ColorSet): void {
        this._colorSet = colorSet;
        this.notifySubscribers(LayerTopic.DATA);
    }

    private makeBoundingBox(): void {
        if (!this._data) {
            return;
        }

        let minX = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;

        for (const surface of this._data) {
            let totalLength = 0;
            for (let i = 2; i < this._settings.polyline.polylineUtmXy.length; i += 2) {
                totalLength += point2Distance(
                    {
                        x: this._settings.polyline.polylineUtmXy[i],
                        y: this._settings.polyline.polylineUtmXy[i + 1],
                    },
                    {
                        x: this._settings.polyline.polylineUtmXy[i - 2],
                        y: this._settings.polyline.polylineUtmXy[i - 1],
                    },
                );
            }
            minX = -this._settings.extensionLength;
            maxX = Math.max(maxX, totalLength + this._settings.extensionLength);
            for (const real of surface.sampledValues) {
                for (const z of real) {
                    minY = Math.min(minY, z);
                    maxY = Math.max(maxY, z);
                }
            }
        }

        super.setBoundingBox({
            x: [minX, maxX],
            y: [minY, maxY],
            z: [0, 0],
        });
    }

    getBoundingBox(): BoundingBox | null {
        const bbox = super.getBoundingBox();
        if (bbox) {
            return bbox;
        }

        this.makeBoundingBox();
        return super.getBoundingBox();
    }

    protected areSettingsValid(): boolean {
        return (
            this._settings.ensembleIdent !== null &&
            this._settings.attribute !== null &&
            this._settings.surfaceNames.length > 0 &&
            this._settings.realizationNums.length > 0 &&
            this._settings.polyline.polylineUtmXy.length > 0 &&
            this._settings.polyline.actualSectionLengths.length ===
                this._settings.polyline.polylineUtmXy.length / 2 - 1 &&
            this._settings.resolution > 0
        );
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: SurfacesUncertaintyLayerSettings,
        newSettings: SurfacesUncertaintyLayerSettings,
    ): boolean {
        return (
            !isEqual(prevSettings.surfaceNames, newSettings.surfaceNames) ||
            prevSettings.attribute !== newSettings.attribute ||
            !isEqual(prevSettings.realizationNums, newSettings.realizationNums) ||
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent) ||
            prevSettings.extensionLength !== newSettings.extensionLength ||
            !isEqual(prevSettings.polyline.polylineUtmXy, newSettings.polyline.polylineUtmXy) ||
            prevSettings.resolution !== newSettings.resolution
        );
    }

    protected async fetchData(queryClient: QueryClient): Promise<SurfaceUncertaintyData[]> {
        const promises: Promise<SurfaceUncertaintyData>[] = [];

        super.setBoundingBox(null);

        const polyline = this._settings.polyline.polylineUtmXy;

        const xPoints: number[] = [];
        const yPoints: number[] = [];
        let cumulatedHorizontalPolylineLength = -this._settings.extensionLength;
        const cumulatedHorizontalPolylineLengthArr: number[] = [];
        for (let i = 0; i < polyline.length; i += 2) {
            if (i > 0) {
                const distance = point2Distance(
                    { x: polyline[i], y: polyline[i + 1] },
                    { x: polyline[i - 2], y: polyline[i - 1] },
                );
                const actualDistance = this._settings.polyline.actualSectionLengths[i / 2 - 1];
                const numPoints = Math.floor(distance / this._settings.resolution) - 1;
                const scale = actualDistance / distance;

                for (let p = 1; p <= numPoints; p++) {
                    const vector: Vec2 = {
                        x: polyline[i] - polyline[i - 2],
                        y: polyline[i + 1] - polyline[i - 1],
                    };
                    const normalizedVector = normalizeVec2(vector);
                    xPoints.push(polyline[i - 2] + normalizedVector.x * this._settings.resolution * p);
                    yPoints.push(polyline[i - 1] + normalizedVector.y * this._settings.resolution * p);
                    cumulatedHorizontalPolylineLength += this._settings.resolution * scale;
                    cumulatedHorizontalPolylineLengthArr.push(cumulatedHorizontalPolylineLength);
                }
            }

            xPoints.push(polyline[i]);
            yPoints.push(polyline[i + 1]);

            if (i > 0) {
                const distance = point2Distance(
                    { x: polyline[i], y: polyline[i + 1] },
                    { x: xPoints[xPoints.length - 1], y: yPoints[yPoints.length - 1] },
                );

                cumulatedHorizontalPolylineLength += distance;
            }

            cumulatedHorizontalPolylineLengthArr.push(cumulatedHorizontalPolylineLength);
        }

        const queryBody = {
            sample_points: {
                x_points: xPoints,
                y_points: yPoints,
            },
        };

        for (const surfaceName of this._settings.surfaceNames) {
            const queryOptions = postGetSampleSurfaceInPointsOptions({
                query: {
                    case_uuid: this._settings.ensembleIdent?.getCaseUuid() ?? "",
                    ensemble_name: this._settings.ensembleIdent?.getEnsembleName() ?? "",
                    surface_name: surfaceName,
                    surface_attribute: this._settings.attribute ?? "",
                    realization_nums: this._settings.realizationNums,
                },
                body: queryBody,
            });

            this.registerQueryKey(queryOptions.queryKey);

            const promise = queryClient
                .fetchQuery({
                    ...queryOptions,
                })
                .then((data) => transformData(cumulatedHorizontalPolylineLengthArr, surfaceName, data));
            promises.push(promise);
        }

        return Promise.all(promises);
    }
}

export function isSurfacesUncertaintyLayer(layer: BaseLayer<any, any>): layer is SurfacesUncertaintyLayer {
    return layer instanceof SurfacesUncertaintyLayer;
}

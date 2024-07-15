import { SurfaceRealizationSampleValues_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { Vector2, pointDistance, normalizeVector } from "@lib/utils/vector2";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

import { BaseLayer, BoundingBox, LayerTopic } from "./BaseLayer";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfacesUncertaintyLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
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
    data: SurfaceRealizationSampleValues_api[]
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
                totalLength += pointDistance(
                    {
                        x: this._settings.polyline.polylineUtmXy[i],
                        y: this._settings.polyline.polylineUtmXy[i + 1],
                    },
                    {
                        x: this._settings.polyline.polylineUtmXy[i - 2],
                        y: this._settings.polyline.polylineUtmXy[i - 1],
                    }
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
        newSettings: SurfacesUncertaintyLayerSettings
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
                const distance = pointDistance(
                    { x: polyline[i], y: polyline[i + 1] },
                    { x: polyline[i - 2], y: polyline[i - 1] }
                );
                const actualDistance = this._settings.polyline.actualSectionLengths[i / 2 - 1];
                const numPoints = Math.floor(distance / this._settings.resolution) - 1;
                const scale = actualDistance / distance;

                for (let p = 1; p <= numPoints; p++) {
                    const vector: Vector2 = {
                        x: polyline[i] - polyline[i - 2],
                        y: polyline[i + 1] - polyline[i - 1],
                    };
                    const normalizedVector = normalizeVector(vector);
                    xPoints.push(polyline[i - 2] + normalizedVector.x * this._settings.resolution * p);
                    yPoints.push(polyline[i - 1] + normalizedVector.y * this._settings.resolution * p);
                    cumulatedHorizontalPolylineLength += this._settings.resolution * scale;
                    cumulatedHorizontalPolylineLengthArr.push(cumulatedHorizontalPolylineLength);
                }
            }

            xPoints.push(polyline[i]);
            yPoints.push(polyline[i + 1]);

            if (i > 0) {
                const distance = pointDistance(
                    { x: polyline[i], y: polyline[i + 1] },
                    { x: xPoints[xPoints.length - 1], y: yPoints[yPoints.length - 1] }
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
            const queryKey = [
                "getSurfaceIntersection",
                this._settings.ensembleIdent?.getCaseUuid() ?? "",
                this._settings.ensembleIdent?.getEnsembleName() ?? "",
                this._settings.realizationNums,
                surfaceName,
                this._settings.attribute ?? "",
                this._settings.polyline.polylineUtmXy,
                this._settings.extensionLength,
                this._settings.resolution,
            ];
            this.registerQueryKey(queryKey);

            const promise = queryClient
                .fetchQuery({
                    queryKey,
                    queryFn: () =>
                        apiService.surface.postSampleSurfaceInPoints(
                            this._settings.ensembleIdent?.getCaseUuid() ?? "",
                            this._settings.ensembleIdent?.getEnsembleName() ?? "",
                            surfaceName,
                            this._settings.attribute ?? "",
                            this._settings.realizationNums,
                            queryBody
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
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

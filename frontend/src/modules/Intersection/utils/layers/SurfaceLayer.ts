import { SurfaceIntersectionData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { Vec2, normalizeVec2, point2Distance } from "@lib/utils/vec2";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

import { BaseLayer, BoundingBox, LayerTopic } from "./BaseLayer";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfaceLayerSettings = {
    ensembleIdent: RegularEnsembleIdent | null;
    realizationNum: number | null;
    polyline: {
        polylineUtmXy: number[];
        actualSectionLengths: number[];
    };
    surfaceNames: string[];
    attribute: string | null;
    extensionLength: number;
    resolution: number;
};

export class SurfaceLayer extends BaseLayer<SurfaceLayerSettings, SurfaceIntersectionData_api[]> {
    private _colorSet: ColorSet;

    constructor(name: string) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
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
            minX = Math.min(minX, surface.cum_lengths[0]);
            maxX = Math.max(maxX, surface.cum_lengths[surface.cum_lengths.length - 1]);
            for (const z of surface.z_points) {
                minY = Math.min(minY, z);
                maxY = Math.max(maxY, z);
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
            this._settings.realizationNum !== null &&
            this._settings.polyline.polylineUtmXy.length > 0 &&
            this._settings.polyline.actualSectionLengths.length ===
                this._settings.polyline.polylineUtmXy.length / 2 - 1 &&
            this._settings.resolution > 0
        );
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: SurfaceLayerSettings,
        newSettings: SurfaceLayerSettings
    ): boolean {
        return (
            !isEqual(prevSettings.surfaceNames, newSettings.surfaceNames) ||
            prevSettings.attribute !== newSettings.attribute ||
            prevSettings.realizationNum !== newSettings.realizationNum ||
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent) ||
            prevSettings.extensionLength !== newSettings.extensionLength ||
            !isEqual(prevSettings.polyline.polylineUtmXy, newSettings.polyline.polylineUtmXy) ||
            prevSettings.resolution !== newSettings.resolution
        );
    }

    protected async fetchData(queryClient: QueryClient): Promise<SurfaceIntersectionData_api[]> {
        const promises: Promise<SurfaceIntersectionData_api>[] = [];

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
                    { x: polyline[i - 2], y: polyline[i - 1] }
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
                    { x: xPoints[xPoints.length - 1], y: yPoints[yPoints.length - 1] }
                );

                cumulatedHorizontalPolylineLength += distance;
            }

            cumulatedHorizontalPolylineLengthArr.push(cumulatedHorizontalPolylineLength);
        }

        const queryBody = {
            cumulative_length_polyline: {
                x_points: xPoints,
                y_points: yPoints,
                cum_lengths: cumulatedHorizontalPolylineLengthArr,
            },
        };

        for (const surfaceName of this._settings.surfaceNames) {
            const queryKey = [
                "getSurfaceIntersection",
                this._settings.ensembleIdent?.getCaseUuid() ?? "",
                this._settings.ensembleIdent?.getEnsembleName() ?? "",
                this._settings.realizationNum ?? 0,
                surfaceName,
                this._settings.attribute ?? "",
                this._settings.polyline.polylineUtmXy,
                this._settings.extensionLength,
                this._settings.resolution,
            ];
            this.registerQueryKey(queryKey);

            const promise = queryClient.fetchQuery({
                queryKey,
                queryFn: () =>
                    apiService.surface.postGetSurfaceIntersection(
                        this._settings.ensembleIdent?.getCaseUuid() ?? "",
                        this._settings.ensembleIdent?.getEnsembleName() ?? "",
                        this._settings.realizationNum ?? 0,
                        surfaceName,
                        this._settings.attribute ?? "",
                        queryBody
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
            promises.push(promise);
        }

        return Promise.all(promises);
    }
}

export function isSurfaceLayer(layer: BaseLayer<any, any>): layer is SurfaceLayer {
    return layer instanceof SurfaceLayer;
}

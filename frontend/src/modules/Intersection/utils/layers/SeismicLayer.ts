import { SeismicFenceData_api } from "@api";
import { SeismicInfo, findIndexOfSample, getSeismicInfo } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { Vector2D, pointDistance, vectorNormalize } from "@lib/utils/geometry";
import { b64DecodeFloatArrayToFloat32 } from "@modules/_shared/base64";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import { QueryClient } from "@tanstack/query-core";

import { Rgb, parse } from "culori";
import { isEqual } from "lodash";

import { BaseLayer, BoundingBox, LayerStatus, LayerTopic } from "./BaseLayer";

export type SeismicSliceImageOptions = {
    datapoints: number[][];
    yAxisValues: number[];
    trajectory: number[][];
    colorScale: ColorScale;
};

export enum SeismicDataType {
    SIMULATED = "simulated",
    OBSERVED = "observed",
}

export enum SeismicSurveyType {
    THREE_D = "3D",
    FOUR_D = "4D",
}

// Data structure for transformed data
// Remove the base64 encoded data and replace with a Float32Array
export type SeismicFenceData_trans = Omit<SeismicFenceData_api, "fence_traces_b64arr"> & {
    fenceTracesFloat32Arr: Float32Array;
};

export function transformSeismicFenceData(apiData: SeismicFenceData_api): SeismicFenceData_trans {
    const { fence_traces_b64arr, ...untransformedData } = apiData;
    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(fence_traces_b64arr);

    return {
        ...untransformedData,
        fenceTracesFloat32Arr: dataFloat32Arr,
    };
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SeismicLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    realizationNum: number | null;
    polylineUtmXy: number[];
    extensionLength: number;
    surveyType: SeismicSurveyType;
    dataType: SeismicDataType;
    attribute: string | null;
    dateOrInterval: string | null;
    resolution: number;
};

export type SeismicLayerData = {
    image: ImageBitmap | null;
    options: SeismicSliceImageOptions;
    seismicFenceData: SeismicFenceData_trans;
    seismicInfo: SeismicInfo | null;
};

export class SeismicLayer extends BaseLayer<SeismicLayerSettings, SeismicLayerData> {
    private _defaultColorScale: ColorScale;
    private _colorScalesParameterMap: Map<string, ColorScale> = new Map();
    private _useCustomColorScaleBoundariesParameterMap = new Map<string, boolean>();

    constructor(name: string, queryClient: QueryClient) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
            polylineUtmXy: [],
            extensionLength: 0,
            surveyType: SeismicSurveyType.THREE_D,
            dataType: SeismicDataType.SIMULATED,
            attribute: null,
            dateOrInterval: null,
            resolution: 1,
        };
        super(name, defaultSettings, queryClient);

        this._defaultColorScale = new ColorScale({
            colorPalette: defaultContinuousDivergingColorPalettes[0],
            gradientType: ColorScaleGradientType.Diverging,
            type: ColorScaleType.Continuous,
            steps: 10,
        });
    }

    private makeColorScaleAddress(): string | null {
        if (this._settings.attribute === null) {
            return null;
        }
        return `${this._settings.surveyType}-${this._settings.attribute ?? ""}`;
    }

    private makeBoundingBox(): void {
        if (!this._data || !this._data.seismicInfo) {
            return;
        }

        const minX = this._data.seismicInfo?.minX ?? 0;
        const maxX = this._data.seismicInfo?.maxX ?? 0;
        const minY = this._data.seismicInfo?.minTvdMsl ?? 0;
        const maxY = this._data.seismicInfo?.maxTvdMsl ?? 0;

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

    getColorScale(): ColorScaleWithName {
        const addr = this.makeColorScaleAddress();
        let colorScale = this._defaultColorScale;
        if (addr !== null) {
            colorScale = this._colorScalesParameterMap.get(addr) ?? this._defaultColorScale;
        }
        return ColorScaleWithName.fromColorScale(colorScale, this._settings.attribute ?? super.getName());
    }

    setColorScale(colorScale: ColorScale): void {
        const addr = this.makeColorScaleAddress();

        if (addr === null) {
            return;
        }

        this._colorScalesParameterMap.set(addr, colorScale);
        this.notifySubscribers(LayerTopic.DATA);

        if (!this._data) {
            return;
        }

        /*
        When already loading, we don't want to update the seismic image with the old data set
        */
        if (this._status === LayerStatus.LOADING) {
            return;
        }

        this._status = LayerStatus.LOADING;
        this.notifySubscribers(LayerTopic.STATUS);
        this.generateImageAndMakeInfo(this._data.seismicFenceData)
            .then((data) => {
                this._data = data;
                this.notifySubscribers(LayerTopic.DATA);
                this._status = LayerStatus.SUCCESS;
                this.notifySubscribers(LayerTopic.STATUS);
            })
            .catch(() => {
                this._status = LayerStatus.ERROR;
                this.notifySubscribers(LayerTopic.STATUS);
            });
    }

    getUseCustomColorScaleBoundaries(): boolean {
        return this._useCustomColorScaleBoundariesParameterMap.get(this._settings.attribute ?? "") ?? false;
    }

    setUseCustomColorScaleBoundaries(useCustomColorScaleBoundaries: boolean): void {
        this._useCustomColorScaleBoundariesParameterMap.set(
            this._settings.attribute ?? "",
            useCustomColorScaleBoundaries
        );
        this.notifySubscribers(LayerTopic.DATA);
    }

    protected areSettingsValid(): boolean {
        return (
            this._settings.ensembleIdent !== null &&
            this._settings.realizationNum !== null &&
            this._settings.polylineUtmXy.length > 0 &&
            this._settings.attribute !== null &&
            this._settings.dateOrInterval !== null &&
            this._settings.extensionLength > 0 &&
            this._settings.resolution > 0
        );
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: SeismicLayerSettings,
        newSettings: SeismicLayerSettings
    ): boolean {
        return (
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent) ||
            prevSettings.realizationNum !== newSettings.realizationNum ||
            !isEqual(prevSettings.polylineUtmXy, newSettings.polylineUtmXy) ||
            prevSettings.surveyType !== newSettings.surveyType ||
            prevSettings.dataType !== newSettings.dataType ||
            prevSettings.attribute !== newSettings.attribute ||
            prevSettings.dateOrInterval !== newSettings.dateOrInterval ||
            prevSettings.extensionLength !== newSettings.extensionLength
        );
    }

    private async generateImageAndMakeInfo(data: SeismicFenceData_trans): Promise<SeismicLayerData> {
        const datapoints = createSeismicSliceImageDatapointsArrayFromFenceData(data);
        const yAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(data);

        if (this._settings.polylineUtmXy.length === 0) {
            throw new Error("No polyline data available for seismic fence.");
        }

        // Calculate uz projection of the trajectory
        const sampledPolyline = this.samplePolyline();
        const trajectoryFenceProjection: number[][] = [];

        let u = -this._settings.extensionLength;
        for (const [index, point] of sampledPolyline.entries()) {
            if (index > 0) {
                const prevPoint = sampledPolyline[index - 1];
                u += pointDistance(
                    {
                        x: point[0],
                        y: point[1],
                    },
                    {
                        x: prevPoint[0],
                        y: prevPoint[1],
                    }
                );
            }

            // We don't care about depth/z when generatic the seismic image
            trajectoryFenceProjection.push([u, 0]);
        }

        const options: SeismicSliceImageOptions = {
            datapoints,
            yAxisValues,
            trajectory: trajectoryFenceProjection,
            colorScale: this.getColorScale(),
        };

        const useCustomColorScaleBoundaries = this.getUseCustomColorScaleBoundaries();

        const image = await generateSeismicSliceImage(
            { ...options },
            options.trajectory,
            options.colorScale.clone(),
            useCustomColorScaleBoundaries,
            {
                isLeftToRight: true,
            }
        )
            .then((result) => {
                return result;
            })
            .catch(() => {
                return null;
            });

        const seismicInfo = getSeismicInfo(options, trajectoryFenceProjection);

        return {
            image,
            options,
            seismicFenceData: data,
            seismicInfo,
        };
    }

    private samplePolyline(): number[][] {
        const trajectory: number[][] = [];
        const polyline = this._settings.polylineUtmXy;

        for (let i = 0; i < polyline.length; i += 2) {
            if (i > 0) {
                const distance = pointDistance(
                    { x: polyline[i], y: polyline[i + 1] },
                    { x: polyline[i - 2], y: polyline[i - 1] }
                );
                const numPoints = Math.floor(distance / this._settings.resolution) - 1;

                for (let p = 1; p <= numPoints; p++) {
                    const vector: Vector2D = {
                        x: polyline[i] - polyline[i - 2],
                        y: polyline[i + 1] - polyline[i - 1],
                    };
                    const normalizedVector = vectorNormalize(vector);
                    trajectory.push([
                        polyline[i - 2] + normalizedVector.x * this._settings.resolution * p,
                        polyline[i - 1] + normalizedVector.y * this._settings.resolution * p,
                    ]);
                }
            }

            trajectory.push([polyline[i], polyline[i + 1]]);
        }

        return trajectory;
    }

    protected async fetchData(): Promise<SeismicLayerData> {
        const sampledPolyline = this.samplePolyline();

        const xPoints: number[] = [];
        const yPoints: number[] = [];
        for (const point of sampledPolyline) {
            xPoints.push(point[0]);
            yPoints.push(point[1]);
        }

        const queryKey = [
            "postGetSeismicFence",
            this._settings.ensembleIdent?.getCaseUuid() ?? "",
            this._settings.ensembleIdent?.getEnsembleName() ?? "",
            this._settings.realizationNum ?? 0,
            this._settings.attribute ?? "",
            this._settings.dateOrInterval ?? "",
            this._settings.polylineUtmXy,
            this._settings.extensionLength,
            this._settings.surveyType,
            this._settings.dataType,
            this._settings.resolution,
        ];
        this.registerQueryKey(queryKey);

        return this._queryClient
            .fetchQuery({
                queryKey,
                queryFn: () =>
                    apiService.seismic.postGetSeismicFence(
                        this._settings.ensembleIdent?.getCaseUuid() ?? "",
                        this._settings.ensembleIdent?.getEnsembleName() ?? "",
                        this._settings.realizationNum ?? 0,
                        this._settings.attribute ?? "",
                        this._settings.dateOrInterval ?? "",
                        this._settings.dataType === SeismicDataType.OBSERVED,
                        { polyline: { x_points: xPoints, y_points: yPoints } }
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((data) => transformSeismicFenceData(data))
            .then(async (data) => {
                return this.generateImageAndMakeInfo(data);
            });
    }
}

export function isSeismicLayer(layer: BaseLayer<any, any>): layer is SeismicLayer {
    return layer instanceof SeismicLayer;
}

/**
 * Utility function to convert the 1D array of values from the fence data to a 2D array of values
 * for the seismic slice image.
 *
 * For the bit map image, the values are provided s.t. a seismic trace is a column in the image,
 * thus the data will be transposed.
 *
 * trace a,b,c and d
 *
 * num_traces = 4
 * num_samples_per_trace = 3
 * fence_traces = [a1, a2, a3, b1, b2, b3, c1, c2, c3, d1, d2, d3]
 *
 * Image:
 *
 * a1 b1 c1 d1
 * a2 b2 c2 d2
 * a3 b3 c3 d3
 */
export function createSeismicSliceImageDatapointsArrayFromFenceData(
    fenceData: SeismicFenceData_trans,
    fillValue = 0
): number[][] {
    const datapoints: number[][] = [];

    const numTraces = fenceData.num_traces;
    const numSamples = fenceData.num_samples_per_trace;
    const fenceValues = fenceData.fenceTracesFloat32Arr;

    for (let i = 0; i < numSamples; ++i) {
        const row: number[] = [];
        for (let j = 0; j < numTraces; ++j) {
            const index = i + j * numSamples;
            const fenceValue = fenceValues[index];
            const validFenceValue = Number.isNaN(fenceValue) ? fillValue : fenceValue;
            row.push(validFenceValue);
        }
        datapoints.push(row);
    }
    return datapoints;
}

/**
 * Utility to create an array of values for the Y axis of the seismic slice image. I.e. depth values
 * for the seismic depth axis.
 */
export function createSeismicSliceImageYAxisValuesArrayFromFenceData(fenceData: SeismicFenceData_trans): number[] {
    const yAxisValues: number[] = [];

    const numSamples = fenceData.num_samples_per_trace;
    const minDepth = fenceData.min_fence_depth;
    const maxDepth = fenceData.max_fence_depth;

    for (let i = 0; i < numSamples; ++i) {
        yAxisValues.push(minDepth + ((maxDepth - minDepth) / numSamples) * i);
    }
    return yAxisValues;
}

export async function generateSeismicSliceImage(
    data: { datapoints: number[][]; yAxisValues: number[] },
    trajectory: number[][],
    colorScale: ColorScale,
    useCustomColorScaleBoundaries: boolean,
    options: {
        isLeftToRight: boolean;
        seismicRange?: number;
        seismicMin?: number;
        seismicMax?: number;
    } = { isLeftToRight: true }
): Promise<ImageBitmap | null> {
    if (!(data.datapoints.length > 0 && trajectory.length > 1)) {
        return null;
    }
    const { datapoints: dp } = data;

    const min =
        options?.seismicMin ||
        options?.seismicRange ||
        dp.reduce((val: number, array: number[]) => Math.min(...array, val), 0);
    const max =
        options?.seismicMax ||
        options?.seismicRange ||
        dp.reduce((val: number, array: number[]) => Math.max(...array, val), 0);

    const absMax = Math.max(Math.abs(min), Math.abs(max));

    const dmin = -absMax;
    const dmax = absMax;

    if (!useCustomColorScaleBoundaries) {
        colorScale.setRange(dmin, dmax);
    }

    const length = trajectory[0][0] - trajectory[trajectory.length - 1][0];
    const width = Math.abs(Math.floor(length / 5));
    const height = data.yAxisValues.length;

    // Generate image
    const imageDataUint8Arr = new Uint8ClampedArray(width * height * 4);

    let offset = 0;

    let pos = options?.isLeftToRight ? trajectory[0][0] : trajectory[trajectory.length - 1][0];

    const step = (length / width) * (options?.isLeftToRight ? -1 : 1);

    let val1: number;
    let val2: number;
    let val: number;
    let color: [number, number, number];
    const black: [number, number, number] = [0, 0, 0];
    let opacity: number;

    for (let x = 0; x < width; x++) {
        offset = x * 4;
        const index = findIndexOfSample(trajectory, pos);
        const x1 = trajectory[index][0];
        const x2 = trajectory[index + 1][0];

        if (x1 === undefined || x2 === undefined) {
            throw new Error("Invalid trajectory");
        }

        const span = x2 - x1;
        const dx = pos - x1;
        const ratio = dx / span;

        for (let y = 0; y < height; y++) {
            val1 = dp[y]?.[index];
            val2 = dp[y]?.[index + 1];
            color = black;
            opacity = 0;
            if (val1 !== undefined && val2 !== undefined) {
                val = val1 * (1 - ratio) + val2 * ratio;
                const hexColor = colorScale.getColorForValue(val);
                const rgbColor = parse(hexColor) as Rgb | undefined;
                if (rgbColor) {
                    color = [rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255];
                    opacity = 255;
                }
            }

            imageDataUint8Arr.set([color[0], color[1], color[2], opacity], offset);

            offset += width * 4;
        }
        pos += step;
    }
    const imageData = new ImageData(imageDataUint8Arr, width, height);
    const image = await createImageBitmap(imageData, 0, 0, width, height);

    return image;
}

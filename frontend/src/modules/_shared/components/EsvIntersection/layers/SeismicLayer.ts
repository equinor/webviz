import type {
    OnMountEvent,
    OnRescaleEvent,
    OnUpdateEvent,
    SeismicCanvasDataOptions,
    SeismicInfo,
} from "@equinor/esv-intersection";
import { CanvasLayer, findIndexOfSample, getSeismicInfo, getSeismicOptions } from "@equinor/esv-intersection";
import type { Rgb } from "culori";
import { parse } from "culori";

import type { ColorScale } from "@lib/utils/ColorScale";
import {
    createSeismicSliceImageDatapointsArrayFromFenceTracesArray,
    createSeismicSliceImageYAxisValuesArrayForFence,
} from "@modules/_shared/Intersection/seismicIntersectionUtils";

// Options for generating seismic slice image using generateSeismicSliceImage
export type SeismicSliceImageOptions = {
    datapoints: number[][];
    yAxisValues: number[];
    trajectory: number[][];
    colorScale: ColorScale;
};

// Note: This type does not extend SeismicCanvasData because we want to generate the image and seismic info
// inside this render due to async seismic slice image generation
export type SeismicLayerData = {
    minFenceDepth: number;
    maxFenceDepth: number;
    numTraces: number;
    numSamplesPerTrace: number;
    fenceTracesArray: Float32Array;
    trajectoryFenceProjection: number[][];
    propertyName: string;
    propertyUnit: string;
    colorScale: ColorScale;
    useCustomColorScaleBoundaries: boolean;
};

export class SeismicLayer extends CanvasLayer<SeismicLayerData> {
    private _image: ImageBitmap | null = null;
    private _canvasDataOptions: SeismicCanvasDataOptions | null = null;
    private _seismicInfo: SeismicInfo | null = null;

    getSeismicInfo(): SeismicInfo | null {
        return this._seismicInfo;
    }

    override onMount(event: OnMountEvent): void {
        super.onMount(event);
    }

    override onUpdate(event: OnUpdateEvent<SeismicLayerData>): void {
        super.onUpdate(event);

        if (!event.data) {
            return;
        }

        // Create seismic info and canvas data options
        const datapoints = createSeismicSliceImageDatapointsArrayFromFenceTracesArray(
            event.data.fenceTracesArray,
            event.data.numTraces,
            event.data.numSamplesPerTrace,
        );
        const yAxisValues = createSeismicSliceImageYAxisValuesArrayForFence(
            event.data.numSamplesPerTrace,
            event.data.minFenceDepth,
            event.data.maxFenceDepth,
        );
        this._seismicInfo = getSeismicInfo({ datapoints, yAxisValues }, event.data.trajectoryFenceProjection);
        this._canvasDataOptions = getSeismicOptions(this._seismicInfo);

        const colorScale = event.data.colorScale.clone();
        const useCustomColorScaleBoundaries = event.data.useCustomColorScaleBoundaries;

        // Create image
        const seismicSliceImageOptions: SeismicSliceImageOptions = {
            datapoints,
            yAxisValues,
            trajectory: event.data.trajectoryFenceProjection,
            colorScale,
        };

        // Generate image and render when done
        this.generateImage(seismicSliceImageOptions, useCustomColorScaleBoundaries).then((image) => {
            this._image = image;
            this.render();
        });
    }

    override onRescale(event: OnRescaleEvent): void {
        super.onRescale(event);
        this.setTransform(event);
        this.render();
    }

    render(): void {
        if (!this.ctx || !this._image || !this._canvasDataOptions) {
            return;
        }
        const { ctx } = this;
        this.clearCanvas();

        ctx.drawImage(
            this._image,
            this._canvasDataOptions.x,
            this._canvasDataOptions.y,
            this._canvasDataOptions.width,
            this._canvasDataOptions.height,
        );
    }
    private async generateImage(
        seismicSliceImageOptions: SeismicSliceImageOptions,
        useCustomColorScaleBoundaries: boolean,
    ): Promise<ImageBitmap | null> {
        const image = await this.generateSeismicSliceImage(
            { ...seismicSliceImageOptions },
            seismicSliceImageOptions.trajectory,
            seismicSliceImageOptions.colorScale.clone(),
            useCustomColorScaleBoundaries,
            {
                isLeftToRight: true,
            },
        )
            .then((result) => {
                return result;
            })
            .catch(() => {
                return null;
            });

        return image;
    }

    private async generateSeismicSliceImage(
        data: { datapoints: number[][]; yAxisValues: number[] },
        trajectory: number[][],
        colorScale: ColorScale,
        useCustomColorScaleBoundaries: boolean,
        options: {
            isLeftToRight: boolean;
            seismicRange?: number;
            seismicMin?: number;
            seismicMax?: number;
        } = { isLeftToRight: true },
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
}

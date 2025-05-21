import type {
    LayerOptions,
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
    opacityPercent: number;
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
    opacityPercent?: number;
};

export class SeismicLayer extends CanvasLayer<SeismicLayerData> {
    // The image is generated in preRender and updated in onUpdate/onRescale
    private _image: ImageBitmap | null = null;

    // The data options and info for generating the seismic slice image
    private _isPreRendered = false;
    private _canvasDataOptions: SeismicCanvasDataOptions | null = null;
    private _seismicSliceImageOptions: SeismicSliceImageOptions | null = null;
    private _seismicInfo: SeismicInfo | null = null;

    constructor(id: string, options: LayerOptions<SeismicLayerData>) {
        super(id, options);
    }

    getSeismicInfo(): SeismicInfo | null {
        return this._seismicInfo;
    }

    preRender(): void {
        if (!this.data) {
            return;
        }

        // Create seismic info and canvas data options
        const datapoints = createSeismicSliceImageDatapointsArrayFromFenceTracesArray(
            this.data.fenceTracesArray,
            this.data.numTraces,
            this.data.numSamplesPerTrace,
        );
        const yAxisValues = createSeismicSliceImageYAxisValuesArrayForFence(
            this.data.numSamplesPerTrace,
            this.data.minFenceDepth,
            this.data.maxFenceDepth,
        );
        this._seismicInfo = getSeismicInfo({ datapoints, yAxisValues }, this.data.trajectoryFenceProjection);
        this._canvasDataOptions = getSeismicOptions(this._seismicInfo);

        const colorScale = this.data.colorScale.clone();
        const opacityPercent = this.data.opacityPercent ?? 100;

        this._seismicSliceImageOptions = {
            datapoints,
            yAxisValues,
            trajectory: this.data.trajectoryFenceProjection,
            colorScale,
            opacityPercent,
        };

        this._isPreRendered = true;
    }

    clearImageAndInternalData(): void {
        this._image = null;
        this._canvasDataOptions = null;
        this._seismicSliceImageOptions = null;
        this._seismicInfo = null;
        this._isPreRendered = false;
    }

    override onMount(event: OnMountEvent): void {
        super.onMount(event);
    }

    override onUpdate(event: OnUpdateEvent<SeismicLayerData>): void {
        super.onUpdate(event);

        // Clear the internal image and canvas data options
        this.clearImageAndInternalData();

        // Create seismic info and canvas data options
        this.preRender();

        if (!this._seismicSliceImageOptions) {
            throw new Error("Seismic slice image options are not set, ensure preRender() is called");
        }

        // Generate image and render when done
        this.generateImage(this._seismicSliceImageOptions).then((image) => {
            this._image = image;
            this.render();
        });
    }

    override onRescale(event: OnRescaleEvent): void {
        super.onRescale(event);
        this.setTransform(event);

        if (this._isPreRendered) {
            this.render();
            return;
        }

        this.clearImageAndInternalData();
        this.preRender();

        if (!this._seismicSliceImageOptions) {
            throw new Error("Seismic slice image options are not set, ensure preRender() is called");
        }

        this.generateImage(this._seismicSliceImageOptions).then((image) => {
            this._image = image;
            this.render();
        });
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
    private async generateImage(seismicSliceImageOptions: SeismicSliceImageOptions): Promise<ImageBitmap | null> {
        const image = await this.generateSeismicSliceImage(
            { ...seismicSliceImageOptions },
            seismicSliceImageOptions.trajectory,
            seismicSliceImageOptions.colorScale.clone(),
            seismicSliceImageOptions.opacityPercent,
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
        opacityPercent: number,
        options: {
            isLeftToRight: boolean;
        } = { isLeftToRight: true },
    ): Promise<ImageBitmap | null> {
        if (!(data.datapoints.length > 0 && trajectory.length > 1)) {
            return null;
        }
        const { datapoints: dp } = data;

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
                        opacity = (opacityPercent / 100.0) * 255.0;
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

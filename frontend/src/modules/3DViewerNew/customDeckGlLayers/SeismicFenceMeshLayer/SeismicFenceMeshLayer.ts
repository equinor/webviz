import {
    CompositeLayer,
    type CompositeLayerProps,
    type GetPickingInfoParams,
    type Layer,
    type PickingInfo,
    type UpdateParameters,
} from "@deck.gl/core";
import { Geometry } from "@luma.gl/engine";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import type { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";
import { transfer, wrap } from "comlink";
import { isEqual } from "lodash";

import type { Geometry as LoadingGeometry } from "@lib/utils/geometry";

import { PreviewLayer } from "../PreviewLayer/PreviewLayer";

import { ExtendedSimpleMeshLayer } from "./_private/ExtendedSimpleMeshLayer";
// eslint-disable-next-line import/default
import MeshWorker from "./_private/webworker/makeMesh.worker?worker";
import { type WebWorkerParameters, type WebworkerResult } from "./_private/webworker/types";

export type SeismicFenceMeshLayerPickingInfo = {
    properties?: { name: string; value: number }[];
} & PickingInfo;

export type SeismicFence = {
    numSamples: number;
    properties: Float32Array;
    traceXYPointsArray: Float32Array;
    minDepth: number;
    maxDepth: number;
};

export interface SeismicFenceMeshLayerProps extends ExtendedLayerProps {
    id: string;
    data: SeismicFence;
    colorMapFunction: (value: number) => [number, number, number, number];
    hoverable?: boolean;
    opacity?: number;
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;
    loadingGeometry?: LoadingGeometry;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
}

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
}

function encodePropertyToColor(property: number, min: number, max: number): [number, number, number] {
    const normalized = (property - min) / (max - min);
    const safeNormalized = Math.max(1 / 16777215, normalized); // avoid zero
    const colorIndex = Math.floor(safeNormalized * 16777215);
    const r = (colorIndex >> 16) & 255;
    const g = (colorIndex >> 8) & 255;
    const b = colorIndex & 255;
    return [r, g, b];
}

function decodeColorToProperty(r: number, g: number, b: number, min: number, max: number): number {
    const colorIndex = r * 256 * 256 + g * 256 + b;
    const normalized = colorIndex / 16777215;
    return normalized * (max - min) + min;
}

export class SeismicFenceMeshLayer extends CompositeLayer<SeismicFenceMeshLayerProps> {
    static layerName: string = "SeismicFenceSectionMeshLayer";

    private _verticesArray: Float32Array | null = null;
    private _indicesArray: Uint32Array | null = null;
    private _colorsArray: Float32Array | null = null;
    private _pickingColorsArray: Uint8ClampedArray | null = null;

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        geometry: Geometry;
        meshCreated: boolean;
        colorsArrayCreated: boolean;
        minProperty: number;
        maxProperty: number;
    };

    initializeState(): void {
        this.setState({
            meshCreated: false,
            colorsArrayCreated: false,
            geometry: new Geometry({
                attributes: {
                    positions: new Float32Array(),
                },
                topology: "triangle-list",
            }),
        });
    }

    shouldUpdateState(
        params: UpdateParameters<Layer<SeismicFenceMeshLayerProps & Required<CompositeLayerProps>>>,
    ): boolean {
        const { changeFlags } = params;

        if (changeFlags.dataChanged) {
            return true;
        }

        if (this.props.isLoading) {
            return true;
        }

        return false;
    }

    updateState({
        props,
        oldProps,
        changeFlags,
    }: UpdateParameters<Layer<SeismicFenceMeshLayerProps & Required<CompositeLayerProps>>>) {
        const meshRecomputationRequired =
            !isEqual(oldProps.data, props.data) || !isEqual(oldProps.zIncreaseDownwards, props.zIncreaseDownwards);

        const colorMapFunctionChanged = !isEqual(oldProps.colorMapFunction, props.colorMapFunction);

        if (props.reportBoundingBox && changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }

        if (
            !meshRecomputationRequired &&
            !colorMapFunctionChanged &&
            this.state.meshCreated &&
            this.state.colorsArrayCreated
        ) {
            return;
        }

        if (props.isLoading) {
            return;
        }

        if (meshRecomputationRequired || !this.state.meshCreated) {
            this.rebuildMesh();
            return;
        }

        if (colorMapFunctionChanged || !this.state.colorsArrayCreated) {
            this.recolorMesh();
        }
    }

    private calcBoundingBox(): BoundingBox3D {
        const { traceXYPointsArray, minDepth, maxDepth } = this.props.data;
        const zFactor = this.props.zIncreaseDownwards ? -1 : 1;

        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < traceXYPointsArray.length; i += 2) {
            const x = traceXYPointsArray[i];
            const y = traceXYPointsArray[i + 1];
            xmin = Math.min(xmin, x);
            ymin = Math.min(ymin, y);
            xmax = Math.max(xmax, x);
            ymax = Math.max(ymax, y);
        }

        const zmin = zFactor * minDepth;
        const zmax = zFactor * maxDepth;

        return [xmin, ymin, Math.min(zmin, zmax), xmax, ymax, Math.max(zmin, zmax)];
    }

    private initArrayBuffers() {
        const { data } = this.props;

        const numSamplesU = data.traceXYPointsArray.length / 2;
        const totalNumVertices = numSamplesU * data.numSamples;
        const totalNumIndices = (numSamplesU - 1) * (data.numSamples - 1) * 6;
        this._verticesArray = new Float32Array(totalNumVertices * 3);
        this._indicesArray = new Uint32Array(totalNumIndices);
    }

    private initColorsArray() {
        const { data } = this.props;

        this._colorsArray = new Float32Array(data.properties.length * 4);
        this._pickingColorsArray = new Uint8ClampedArray(data.properties.length * 3);
    }

    private maybeUpdateGeometry() {
        const { geometry } = this.state;
        const verticesArr = this._verticesArray;
        const indicesArr = this._indicesArray;
        if (verticesArr === null || indicesArr === null) {
            return;
        }

        this.setState({
            ...this.state,
            geometry: new Geometry({
                attributes: {
                    ...geometry.attributes,
                    positions: verticesArr,
                },
                topology: "triangle-list",
                indices: indicesArr,
            }),
            meshCreated: true,
        });
    }

    private calcOrigin(): [number, number, number] {
        const { data, zIncreaseDownwards } = this.props;
        const zSign = zIncreaseDownwards ? -1 : 1;

        if (data.traceXYPointsArray.length < 2) {
            throw new Error("traceXYPointsArray must contain at least two points.");
        }

        const x = data.traceXYPointsArray[0];
        const y = data.traceXYPointsArray[1];
        const z = zSign * data.minDepth;

        return [x, y, z];
    }

    private async rebuildMesh() {
        const { data, zIncreaseDownwards } = this.props;

        this.setState({ ...this.state, meshCreated: false });

        this.initArrayBuffers();

        assert(this._verticesArray !== null, "Vertices array is null");
        assert(this._indicesArray !== null, "Indices array is null");

        const params: WebWorkerParameters = {
            numSamples: data.numSamples,
            minDepth: data.minDepth,
            maxDepth: data.maxDepth,
            traceXYPointsArray: data.traceXYPointsArray,
            verticesArray: this._verticesArray,
            indicesArray: this._indicesArray,
            zIncreasingDownwards: zIncreaseDownwards ?? false,
        };

        const workerInstance = new MeshWorker();

        try {
            const meshWorker = wrap<{
                makeMesh(params: WebWorkerParameters): Promise<WebworkerResult>;
            }>(workerInstance);

            const result = await transfer(meshWorker.makeMesh(params), [
                this._verticesArray.buffer,
                this._indicesArray.buffer,
            ]);
            this._verticesArray = result.verticesArray;
            this._indicesArray = result.indicesArray;

            this.maybeUpdateGeometry();
            this.recolorMesh();
        } catch (error) {
            console.error("Error in worker:", error);
        }

        workerInstance.terminate();
    }

    private recolorMesh() {
        const { geometry } = this.state;

        this.setState({ ...this.state, colorsArrayCreated: false });
        this.initColorsArray();
        assert(this._colorsArray !== null, "Colors array is null");
        assert(this._pickingColorsArray !== null, "Picking colors array is null");

        this.makeColorsArray().then(() => {
            this.setState({
                ...this.state,
                geometry: new Geometry({
                    attributes: {
                        ...geometry.attributes,
                        colors: {
                            value: this._colorsArray!,
                            size: 4,
                        },
                        pickingColors: {
                            value: this._pickingColorsArray!,
                            type: "uint8",
                            size: 3,
                            normalized: true,
                        },
                    },
                    topology: "triangle-list",
                    indices: geometry.indices,
                }),
                colorsArrayCreated: true,
            });
        });
    }

    private async makeColorsArray() {
        const { data, colorMapFunction } = this.props;

        assert(this._colorsArray !== null, "Colors array is null");
        assert(this._pickingColorsArray !== null, "Picking colors array is null");

        let minProperty = Number.MAX_VALUE;
        let maxProperty = -Number.MAX_VALUE;
        for (let i = 0; i < data.properties.length; i++) {
            minProperty = Math.min(minProperty, data.properties[i]);
            maxProperty = Math.max(maxProperty, data.properties[i]);
        }

        this.setState({
            ...this.state,
            minProperty,
            maxProperty,
        });

        let colorIndex = 0;
        for (let i = 0; i < data.properties.length; i++) {
            const property = data.properties[i];
            const [r, g, b, a] = colorMapFunction(property);
            this._colorsArray[colorIndex * 4 + 0] = r / 255;
            this._colorsArray[colorIndex * 4 + 1] = g / 255;
            this._colorsArray[colorIndex * 4 + 2] = b / 255;
            this._colorsArray[colorIndex * 4 + 3] = a / 255;

            const [r2, g2, b2] = encodePropertyToColor(property, minProperty, maxProperty);
            this._pickingColorsArray[i * 3 + 0] = r2;
            this._pickingColorsArray[i * 3 + 1] = g2;
            this._pickingColorsArray[i * 3 + 2] = b2;
            colorIndex++;
        }
    }

    getPickingInfo({ info }: GetPickingInfoParams): SeismicFenceMeshLayerPickingInfo {
        if (!info.color) return info;

        const [r, g, b] = info.color; // Convert from [0, 1] to [0, 255]
        const { minProperty, maxProperty } = this.state;

        const property = decodeColorToProperty(r, g, b, minProperty, maxProperty);

        const properties: { name: string; value: number }[] = [{ name: "Property", value: property }];

        if (info.coordinate?.length === 3) {
            const depth = (this.props.zIncreaseDownwards ? -1 : 1) * info.coordinate[2];
            properties.push({ name: "Depth", value: depth });
        }

        return {
            ...info,
            properties,
        };
    }

    onHover(pickingInfo: PickingInfo): boolean {
        this.setState({ ...this.state, isHovered: pickingInfo.index !== -1 });
        return false;
    }

    renderLayers() {
        const { id, isLoading, zIncreaseDownwards, loadingGeometry, opacity } = this.props;
        const { geometry, meshCreated, colorsArrayCreated } = this.state;

        const layers: Layer<any>[] = [];

        if ((isLoading || !meshCreated || !colorsArrayCreated) && loadingGeometry) {
            layers.push(
                new PreviewLayer({
                    id: `${id}-loading`,
                    data: {
                        geometry: loadingGeometry,
                    },
                    zIncreaseDownwards,
                }),
            );
        } else {
            layers.push(
                new ExtendedSimpleMeshLayer({
                    id: `${id}-mesh`,
                    data: [0],
                    mesh: geometry,
                    getPosition: [0, 0, 0],
                    getColor: [255, 255, 255, 255],
                    material: { ambient: 0.9, diffuse: 0.1, shininess: 0, specularColor: [0, 0, 0] },
                    pickable: true,
                    _instanced: false,
                    opacity,
                    parameters: {
                        blend: true,
                    },
                }),
            );
        }

        return layers;
    }
}

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
import { transfer, wrap } from "comlink";
import { isEqual } from "lodash";

import type { Geometry as LoadingGeometry } from "@lib/utils/geometry";

import { PreviewLayer } from "../PreviewLayer/PreviewLayer";

import { ExtendedSimpleMeshLayer } from "./_private/ExtendedSimpleMeshLayer";
import MeshWorker from "./_private/webworker/makeMesh.worker?worker";
import { type WebworkerParameters, type WebworkerResult } from "./_private/webworker/types";

export type SeismicFenceMeshLayerPickingInfo = {
    properties?: { name: string; value: number }[];
} & PickingInfo;

export type SeismicFenceSection = {
    numSamplesU: number;
    numSamplesV: number;
    properties: Float32Array;
    propertiesOffset: number;
    boundingBox: number[][]; // [minX, minY, minZ, maxX, maxY, maxZ]
};

export interface SeismicFenceSectionMeshLayerProps extends ExtendedLayerProps {
    id: string;
    data: SeismicFenceSection;
    colorMapFunction: (value: number) => [number, number, number];
    hoverable?: boolean;
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;
    loadingGeometry?: LoadingGeometry;
}

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
}

function encodePropertyToColor(property: number, min: number, max: number): [number, number, number] {
    const normalized = (property - min) / (max - min);
    const colorIndex = Math.floor(normalized * 16777215); // 256^3 - 1
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

export class SeismicFenceSectionMeshLayer extends CompositeLayer<SeismicFenceSectionMeshLayerProps> {
    static layerName: string = "SeismicFenceSectionMeshLayer";

    private _verticesArray: Float32Array | null = null;
    private _indicesArray: Uint32Array | null = null;
    private _colorsArray: Float32Array | null = null;
    private _pickingColorsArray: Uint8Array | null = null;

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        geometry: Geometry;
        isHovered: boolean;
        meshCreated: boolean;
        colorsArrayCreated: boolean;
        minProperty: number;
        maxProperty: number;
    };

    initializeState(): void {
        this.setState({
            isHovered: false,
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

    updateState({
        props,
        oldProps,
    }: UpdateParameters<Layer<SeismicFenceSectionMeshLayerProps & Required<CompositeLayerProps>>>) {
        const meshRecomputationRequired =
            !isEqual(oldProps.data, props.data) || !isEqual(oldProps.zIncreaseDownwards, props.zIncreaseDownwards);

        const colorMapFunctionChanged = !isEqual(oldProps.colorMapFunction, props.colorMapFunction);

        if (!meshRecomputationRequired && !colorMapFunctionChanged) {
            return;
        }

        if (props.isLoading) {
            return;
        }

        if (meshRecomputationRequired) {
            this.rebuildMesh();
            return;
        }

        if (colorMapFunctionChanged) {
            this.recolorMesh();
        }
    }

    private initArrayBuffers() {
        const { data } = this.props;

        const totalNumVertices = data.numSamplesU * data.numSamplesV;
        const totalNumIndices = (data.numSamplesU - 1) * (data.numSamplesV - 1) * 6;
        this._verticesArray = new Float32Array(totalNumVertices * 3);
        this._indicesArray = new Uint32Array(totalNumIndices);
    }

    private initColorsArray() {
        const { data } = this.props;

        this._colorsArray = new Float32Array(data.properties.length * 4);
        this._pickingColorsArray = new Uint8Array(data.properties.length * 3);
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

        return [data.boundingBox[0][0], data.boundingBox[0][1], (zIncreaseDownwards ? -1 : 1) * data.boundingBox[0][2]];
    }

    private async rebuildMesh() {
        const { data, zIncreaseDownwards } = this.props;

        this.setState({ ...this.state, meshCreated: false });

        this.initArrayBuffers();

        assert(this._verticesArray !== null, "Vertices array is null");
        assert(this._indicesArray !== null, "Indices array is null");

        const params: WebworkerParameters = {
            numSamplesU: data.numSamplesU,
            numSamplesV: data.numSamplesV,
            boundingBox: data.boundingBox,
            verticesArray: this._verticesArray,
            indicesArray: this._indicesArray,
            zIncreasingDownwards: zIncreaseDownwards ?? false,
        };

        const workerInstance = new MeshWorker();

        try {
            const meshWorker = wrap<{
                makeMesh(params: WebworkerParameters): Promise<WebworkerResult>;
            }>(workerInstance);

            const result = await transfer(meshWorker.makeMesh(params), [
                this._verticesArray.buffer,
                this._indicesArray.buffer,
            ]);
            this._verticesArray = result.verticesArray;
            this._indicesArray = result.indicesArray;
            console.debug("Indices array:", this._indicesArray);

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
                            size: 3,
                            type: 5121,
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

        const minProperty = Math.min(...data.properties);
        const maxProperty = Math.max(...data.properties);

        this.setState({
            ...this.state,
            minProperty,
            maxProperty,
        });

        let colorIndex = 0;
        for (let i = 0; i < data.properties.length; i++) {
            const property = data.properties[i];
            const [r, g, b] = colorMapFunction(property);
            this._colorsArray[colorIndex * 4 + 0] = r / 255;
            this._colorsArray[colorIndex * 4 + 1] = g / 255;
            this._colorsArray[colorIndex * 4 + 2] = b / 255;
            this._colorsArray[colorIndex * 4 + 3] = 1;

            const [r2, g2, b2] = encodePropertyToColor(property, minProperty, maxProperty);
            this._pickingColorsArray[i * 3 + 0] = r2;
            this._pickingColorsArray[i * 3 + 1] = g2;
            this._pickingColorsArray[i * 3 + 2] = b2;
            colorIndex++;
        }
    }

    private getProperty(vertexIndex: number): number {
        const { numSamplesU, numSamplesV, properties, propertiesOffset } = this.props.data;

        const v = Math.floor(vertexIndex / numSamplesU);
        const u = vertexIndex % numSamplesU;

        const columnMajorIndex = u * numSamplesV + v;

        const globalIndex = columnMajorIndex - propertiesOffset;

        if (globalIndex >= 0 && globalIndex < properties.length) {
            return properties[globalIndex];
        }

        return 0;
    }

    getPickingInfo({ info }: GetPickingInfoParams): SeismicFenceMeshLayerPickingInfo {
        if (!info.color) return info;

        const [r, g, b] = info.color.map((c) => Math.round(c * 255));
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
        const { id, isLoading, zIncreaseDownwards, loadingGeometry } = this.props;
        const { geometry, meshCreated, colorsArrayCreated } = this.state;

        const origin = this.calcOrigin();

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
                    getPosition: origin,
                    getColor: [255, 255, 255, 255],
                    material: { ambient: 0.95, diffuse: 1, shininess: 0, specularColor: [0, 0, 0] },
                    pickable: true,
                }),
            );
        }

        return layers;
    }
}

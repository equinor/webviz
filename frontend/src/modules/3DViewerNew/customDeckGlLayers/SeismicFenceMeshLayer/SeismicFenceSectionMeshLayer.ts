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

// eslint-disable-next-line import/default
import MeshWorker from "./_private/webworker/makeMesh.worker?worker";
import { type WebworkerParameters, type WebworkerResult } from "./_private/webworker/types";
import { ExtendedSimpleMeshLayer } from "./_private/ExtendedSimpleMeshLayer";

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

export class SeismicFenceSectionMeshLayer extends CompositeLayer<SeismicFenceSectionMeshLayerProps> {
    static layerName: string = "SeismicFenceSectionMeshLayer";

    private _verticesArray: Float32Array | null = null;
    private _indicesArray: Uint32Array | null = null;
    private _colorsArray: Float32Array | null = null;

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        geometry: Geometry;
        isHovered: boolean;
        meshCreated: boolean;
        colorsArrayCreated: boolean;
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

        let colorIndex = 0;
        for (let i = 0; i < data.properties.length; i++) {
            const [r, g, b] = colorMapFunction(data.properties[i]);
            this._colorsArray[colorIndex * 4 + 0] = r / 255;
            this._colorsArray[colorIndex * 4 + 1] = g / 255;
            this._colorsArray[colorIndex * 4 + 2] = b / 255;
            this._colorsArray[colorIndex * 4 + 3] = 1;
            colorIndex++;
        }
    }

    private getProperty(vertexIndex: number): number {
        const { data } = this.props;

        let offset = data.propertiesOffset;
        if (vertexIndex < offset + data.properties.length) {
            return data.properties[vertexIndex - offset];
        }

        return 0;
    }

    getPickingInfo({ info }: GetPickingInfoParams): SeismicFenceMeshLayerPickingInfo {
        const { zIncreaseDownwards } = this.props;
        if (!info.color) {
            return info;
        }

        const r = info.color[0];
        const g = info.color[1];
        const b = info.color[2];

        const vertexIndex = r * 256 * 256 + g * 256 + b;

        const property = this.getProperty(vertexIndex);

        if (property === undefined) {
            return info;
        }

        const properties: { name: string; value: number }[] = [];
        properties.push({ name: "Property", value: property });
        if (info.coordinate?.length === 3) {
            properties.push({ name: "Depth", value: (zIncreaseDownwards ? -1 : 1) * info.coordinate[2] });
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

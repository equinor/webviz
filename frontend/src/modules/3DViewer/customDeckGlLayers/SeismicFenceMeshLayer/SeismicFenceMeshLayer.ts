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
import type { ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/layers/utils/layerTools";
import type { BoundingBox3D } from "@webviz/subsurface-viewer/dist/utils";
import { transfer, wrap } from "comlink";
import { isEqual, isNaN } from "lodash-es";

import { assertNonNull } from "@lib/utils/assertNonNull";
import type { Geometry as LoadingGeometry } from "@lib/utils/geometry";
import { sampleSeismicGrid } from "@modules/_shared/Intersection/seismicGridSampling";

import { PreviewLayer } from "../PreviewLayer/PreviewLayer";

import { ExtendedSimpleMeshLayer } from "./_private/ExtendedSimpleMeshLayer";
import { encodeNodeIndexToRgb, fenceNumTraces, getFenceGridCoordFromPoint } from "./_private/fenceSampling";
// eslint-disable-next-line import/default
import MeshWorker from "./_private/webworker/makeMesh.worker?worker";
import { type WebWorkerParameters, type WebworkerResult } from "./_private/webworker/types";

export type SeismicFenceMeshLayerPickingInfo = {
    properties?: { name: string; value: number }[];
} & PickingInfo;

export type SeismicFence = {
    numSamples: number;
    properties: Float32Array;
    traceXYZPointsArray: Float32Array;
    vVector: [number, number, number];
    propertyName?: string;
    propertyUnit?: string;
};

export interface SeismicFenceMeshLayerProps extends ExtendedLayerProps {
    data: SeismicFence;
    colorMapFunction: (value: number) => [number, number, number, number];
    hoverable?: boolean;
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;
    loadingGeometry?: LoadingGeometry;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
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

        if (changeFlags.propsOrDataChanged) {
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
        const { traceXYZPointsArray, vVector } = this.props.data;
        const zFactor = this.props.zIncreaseDownwards ? -1 : 1;

        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let zmin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let zmax = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < traceXYZPointsArray.length; i += 3) {
            const x = traceXYZPointsArray[i] + vVector[0];
            const y = traceXYZPointsArray[i + 1] + vVector[1];
            const z = (traceXYZPointsArray[i + 2] + vVector[2]) * zFactor;
            xmin = Math.min(xmin, x);
            ymin = Math.min(ymin, y);
            zmin = Math.min(zmin, z);
            xmax = Math.max(xmax, x);
            ymax = Math.max(ymax, y);
            zmax = Math.max(zmax, z);
        }

        return [xmin, ymin, Math.min(zmin, zmax), xmax, ymax, Math.max(zmin, zmax)];
    }

    private initArrayBuffers() {
        const { data } = this.props;

        const numTraces = data.traceXYZPointsArray.length / 3;
        const totalNumVertices = numTraces * data.numSamples;
        const totalNumIndices = (numTraces - 1) * (data.numSamples - 1) * 6;
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

    private async rebuildMesh() {
        const { data, zIncreaseDownwards } = this.props;

        this.setState({ ...this.state, meshCreated: false });

        this.initArrayBuffers();

        const verticesArray = assertNonNull(this._verticesArray, "Vertices array is null");
        const indicesArray = assertNonNull(this._indicesArray, "Indices array is null");

        const params: WebWorkerParameters = {
            numSamples: data.numSamples,
            traceXYZPointsArray: data.traceXYZPointsArray,
            vVector: data.vVector,
            verticesArray,
            indicesArray,
            zIncreasingDownwards: zIncreaseDownwards ?? false,
        };

        const workerInstance = new MeshWorker();

        try {
            const meshWorker = wrap<{
                makeMesh(params: WebWorkerParameters): Promise<WebworkerResult>;
            }>(workerInstance);

            const result = await transfer(meshWorker.makeMesh(params), [verticesArray.buffer, indicesArray.buffer]);
            this._verticesArray = result.verticesArray;
            this._indicesArray = result.indicesArray;

            this.maybeUpdateGeometry();
            this.recolorMesh();

            this.props.reportBoundingBox?.({
                layerBoundingBox: this.calcBoundingBox(),
            });
        } catch (error) {
            console.error("Error in worker:", error);
        }

        workerInstance.terminate();
    }

    private recolorMesh() {
        const { geometry } = this.state;

        this.setState({ ...this.state, colorsArrayCreated: false });
        this.initColorsArray();
        const colorsArray = assertNonNull(this._colorsArray, "Colors array is null");
        const pickingColorsArray = assertNonNull(this._pickingColorsArray, "Picking colors array is null");

        this.makeColorsArray().then(() => {
            this.setState({
                ...this.state,
                geometry: new Geometry({
                    attributes: {
                        ...geometry.attributes,
                        colors: {
                            value: colorsArray,
                            size: 4,
                        },
                        pickingColors: {
                            value: pickingColorsArray,
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

        const colorsArray = assertNonNull(this._colorsArray, "Colors array is null");
        const pickingColorsArray = assertNonNull(this._pickingColorsArray, "Picking colors array is null");

        for (let i = 0; i < data.properties.length; i++) {
            const trueProperty = data.properties[i];
            const property = isNaN(trueProperty) ? 0 : trueProperty;

            const [r, g, b, a] = colorMapFunction(property);

            colorsArray[i * 4 + 0] = r / 255;
            colorsArray[i * 4 + 1] = g / 255;
            colorsArray[i * 4 + 2] = b / 255;
            colorsArray[i * 4 + 3] = a / 255;

            // Picking colour = this vertex's grid-node index (trace * numSamples + sample). Read back
            // via a `flat` varying in the mesh shaders, so it survives as an exact integer.
            const [r2, g2, b2] = encodeNodeIndexToRgb(i);
            pickingColorsArray[i * 3 + 0] = r2;
            pickingColorsArray[i * 3 + 1] = g2;
            pickingColorsArray[i * 3 + 2] = b2;
        }
    }

    getPickingInfo({ info }: GetPickingInfoParams): SeismicFenceMeshLayerPickingInfo {
        if (!info.color) return info;

        const { data, zIncreaseDownwards } = this.props;
        const label = data.propertyName ?? "Value";
        const unitSuffix = data.propertyUnit ? ` [${data.propertyUnit}]` : "";

        const properties: { name: string; value: number }[] = [];
        const numTraces = fenceNumTraces(data);
        const getSample = (traceIndex: number, sampleIndex: number) =>
            data.properties[traceIndex * data.numSamples + sampleIndex];

        // `info.coordinate` is in common space, i.e. before this layer's modelMatrix. SubsurfaceViewer
        // injects a modelMatrix that scales Z by the vertical exaggeration factor (m[10]), so undo
        // that to get back to the mesh's own coordinates before comparing against the fence geometry.
        const zScale = (this.props.modelMatrix as ArrayLike<number> | undefined)?.[10] || 1;
        const meshSpacePoint: number[] | null =
            info.coordinate?.length === 3
                ? [info.coordinate[0], info.coordinate[1], info.coordinate[2] / zScale]
                : null;

        // Resolve the pick back to continuous grid coordinates from the world position. `pickable:
        // "3d"` on the mesh means every pick (hover included) carries a real 3D coordinate.
        const gridCoord = meshSpacePoint
            ? getFenceGridCoordFromPoint(data, zIncreaseDownwards ?? false, meshSpacePoint)
            : null;

        if (gridCoord) {
            const sample = sampleSeismicGrid(
                getSample,
                numTraces,
                data.numSamples,
                gridCoord.traceCoord,
                gridCoord.sampleCoord,
            );

            properties.push({ name: `${label} (interpolated)${unitSuffix}`, value: sample.interpolatedValue });
            properties.push({ name: `${label} (nearest)${unitSuffix}`, value: sample.nearestValue });
        }

        if (meshSpacePoint) {
            const depth = (zIncreaseDownwards ? -1 : 1) * meshSpacePoint[2];
            properties.push({ name: "Depth", value: depth });
        }

        return {
            ...info,
            properties,
        };
    }

    renderLayers() {
        const { isLoading, zIncreaseDownwards, loadingGeometry, opacity } = this.props;
        const { geometry, meshCreated, colorsArrayCreated } = this.state;

        const layers: Layer<any>[] = [];

        if ((isLoading || !meshCreated || !colorsArrayCreated) && loadingGeometry) {
            layers.push(
                new PreviewLayer(
                    super.getSubLayerProps({
                        id: "loading",
                        data: {
                            geometry: loadingGeometry,
                        },
                        zIncreaseDownwards,
                    }),
                ),
            );
        } else {
            layers.push(
                new ExtendedSimpleMeshLayer(
                    super.getSubLayerProps({
                        id: "mesh",
                        data: [0],
                        mesh: geometry,
                        getPosition: [0, 0, 0],
                        getColor: [255, 255, 255, 255],
                        material: { ambient: 0.6, diffuse: 0.4, shininess: 8, specularColor: [0, 0, 0] },
                        // "3d" makes deck's hover pick unproject against the mesh depth, so the
                        // nearest-sample highlight gets a real 3D point every mouse move.
                        pickable: "3d",
                        _instanced: false,
                        opacity,
                        parameters: {
                            blend: true,
                        },
                    }),
                ),
            );
        }

        return layers;
    }
}

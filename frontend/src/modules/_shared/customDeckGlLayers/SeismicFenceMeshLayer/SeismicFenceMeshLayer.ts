import {
    CompositeLayer,
    CompositeLayerProps,
    GetPickingInfoParams,
    Layer,
    PickingInfo,
    UpdateParameters,
} from "@deck.gl/core";
import { PathLayer } from "@deck.gl/layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";

import workerpool from "workerpool";

import { ExtendedSimpleMeshLayer } from "./_private/ExtendedSimpleMeshLayer";
import { Space, WebworkerParameters, makeMesh } from "./_private/worker";

export type SeismicFenceMeshLayerPickingInfo = {
    properties?: { name: string; value: number }[];
} & PickingInfo;

export type SeismicFenceSection = {
    numSamplesU: number;
    numSamplesV: number;
    properties: Float32Array;
    boundingBox: number[][]; // [minX, minY, minZ, maxX, maxY, maxZ]
};

export type SeismicFenceMeshLayerProps = {
    name?: string;
    startPosition: [number, number, number];
    data: {
        sections: SeismicFenceSection[];
    };
    colorMapFunction: (value: number) => [number, number, number];
    hoverable?: boolean;
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;
};

export class SeismicFenceMeshLayer extends CompositeLayer<SeismicFenceMeshLayerProps> {
    static layerName: string = "SeismicFenceMeshLayer";

    private _pool = workerpool.pool({
        workerType: "web",
        maxWorkers: 10,
        workerOpts: {
            // By default, Vite uses a module worker in dev mode, which can cause your application to fail. Therefore, we need to use a module worker in dev mode and a classic worker in prod mode.
            type: import.meta.env.PROD ? undefined : "module",
        },
    });
    private _numTasks = 0;
    private _numTasksCompleted = 0;
    private _numTasksFailed = 0;
    private _transVertices: Float32Array | null = null;
    private _transIndices: Uint32Array | null = null;

    // @ts-expect-error - private
    state!: {
        geometry: Geometry;
        isHovered: boolean;
    };

    private calcNumVerticesForSection(section: SeismicFenceSection): number {
        return section.numSamplesU * section.numSamplesV * 3;
    }

    private calcNumIndicesForSection(section: SeismicFenceSection): number {
        return (section.numSamplesU - 1) * (section.numSamplesV - 1) * 6;
    }

    private initTransferableObjects() {
        const { data } = this.props;

        for (const section of data.sections) {
            const numVertices = this.calcNumVerticesForSection(section);
            const numIndices = this.calcNumIndicesForSection(section);

            this._transVertices = new Float32Array(numVertices);
            this._transIndices = new Uint32Array(numIndices);
        }
    }

    private checkIfAllTasksCompleted() {
        if (this._numTasks === this._numTasksCompleted) {
            this.setState({
                geometry: new Geometry({
                    attributes: {
                        positions: this._transVertices,
                        colors: {
                            value: this.makeColorsArray(),
                            size: 4,
                        },
                    },
                    topology: "triangle-list",
                    indices: this._transIndices,
                }),
            });
        }
    }

    private rebuildMesh() {
        const params: WebworkerParameters[] = [];

        this.initTransferableObjects();

        let verticesIndex = 0;
        let indicesIndex = 0;
        for (const section of this.props.data.sections) {
            this._numTasks++;

            const params: WebworkerParameters = {
                numSamplesU: section.numSamplesU,
                numSamplesV: section.numSamplesV,
                boundingBox: section.boundingBox,
                startVerticesIndex: verticesIndex,
                startIndicesIndex: indicesIndex,
                transVertices: this._transVertices,
                transIndices: this._transIndices,
                space: Space.FENCE,
            };

            verticesIndex += this.calcNumVerticesForSection(section);
            indicesIndex += this.calcNumIndicesForSection(section);

            this._pool
                .exec(makeMesh, [{ ...params }])
                .then(() => {
                    this;
                    this._numTasksCompleted++;
                    this.checkIfAllTasksCompleted();
                })
                .catch(() => {
                    this._numTasksFailed++;
                });
        }
    }

    private makeColorsArray(): Float32Array {
        const { data, colorMapFunction } = this.props;

        const colors = new Float32Array(data.properties.length * 4);

        for (let i = 0; i < data.properties.length; i++) {
            const [r, g, b] = colorMapFunction(data.properties[i]);
            colors[i * 4 + 0] = r / 255;
            colors[i * 4 + 1] = g / 255;
            colors[i * 4 + 2] = b / 255;
            colors[i * 4 + 3] = 1;
        }

        return colors;
    }

    private makeMesh() {
        const { data } = this.props;

        this.setState({
            geometry: new Geometry({
                attributes: {
                    positions: data.vertices,
                    colors: {
                        value: this.makeColorsArray(),
                        size: 4,
                    },
                },
                topology: "triangle-list",
                indices: data.indices,
            }),
        });
    }

    getPickingInfo({ info }: GetPickingInfoParams): SeismicFenceMeshLayerPickingInfo {
        const { data, zIncreaseDownwards } = this.props;
        if (!info.color) {
            return info;
        }

        const r = info.color[0];
        const g = info.color[1];
        const b = info.color[2];

        const vertexIndex = r * 256 * 256 + g * 256 + b;
        const property = data.properties[vertexIndex];

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
        this.setState({ isHovered: pickingInfo.index !== -1 });
        return false;
    }

    updateState(params: UpdateParameters<Layer<SeismicFenceMeshLayerProps & Required<CompositeLayerProps>>>) {
        super.updateState(params);
        if (params.changeFlags.dataChanged) {
            this.makeMesh();
        }
    }

    renderLayers() {
        const { startPosition, boundingBox, hoverable, isLoading } = this.props;
        const { geometry, isHovered } = this.state;

        const layers: Layer<any>[] = [];

        if (isLoading) {
            layers.push(
                new SimpleMeshLayer({
                    id: "seismic-fence-mesh-layer-loading",
                    data: [0],
                    mesh: geometry,
                    getColor: [0, 0, 0, 50],
                    pickable: false,
                    getPosition: startPosition,
                    material: { ambient: 0.95, diffuse: 1, shininess: 0, specularColor: [0, 0, 0] },
                })
            );
        } else {
            layers.push(
                new ExtendedSimpleMeshLayer({
                    id: "seismic-fence-mesh-layer",
                    data: [0],
                    mesh: geometry,
                    getPosition: startPosition,
                    getColor: [255, 255, 255, 255],
                    material: { ambient: 0.95, diffuse: 1, shininess: 0, specularColor: [0, 0, 0] },
                    pickable: true,
                })
            );
        }

        if (isHovered && hoverable) {
            layers.push(
                new PathLayer({
                    id: "seismic-fence-mesh-layer-hovered",
                    data: [[boundingBox[0], boundingBox[1], boundingBox[2], boundingBox[3], boundingBox[0]]],
                    getPath: (d: number[]) => d,
                    getColor: [0, 0, 255, 255],
                    getWidth: 2,
                    pickable: false,
                    billboard: true,
                    widthUnits: "pixels",
                    parameters: {
                        depthTest: false,
                    },
                })
            );
        }

        return layers;
    }
}

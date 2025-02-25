import {
    CompositeLayer,
    CompositeLayerProps,
    GetPickingInfoParams,
    Layer,
    PickingInfo,
    UpdateParameters,
} from "@deck.gl/core";
import { Geometry as LoadingGeometry } from "@lib/utils/geometry";
import { Geometry } from "@luma.gl/engine";
import { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import { isEqual } from "lodash";
import workerpool from "workerpool";

import { ExtendedSimpleMeshLayer } from "./_private/ExtendedSimpleMeshLayer";
import { WebworkerParameters, makeMesh } from "./_private/worker";

import { PreviewLayer } from "../PreviewLayer/PreviewLayer";

export type SeismicFenceMeshLayerPickingInfo = {
    properties?: { name: string; value: number }[];
} & PickingInfo;

export type SeismicFenceSection = {
    numSamplesU: number;
    numSamplesV: number;
    properties: Float32Array;
    boundingBox: number[][]; // [minX, minY, minZ, maxX, maxY, maxZ]
};

export interface SeismicFenceMeshLayerProps extends ExtendedLayerProps {
    data: {
        sections: SeismicFenceSection[];
    };
    colorMapFunction: (value: number) => [number, number, number];
    hoverable?: boolean;
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
    private _sharedVerticesBuffer: SharedArrayBuffer | null = null;
    private _sharedIndicesBuffer: SharedArrayBuffer | null = null;
    private _colorsArray: Float32Array = new Float32Array();

    // @ts-expect-error - private
    state!: {
        geometry: Geometry;
        isHovered: boolean;
        isLoaded: boolean;
    };

    initializeState(): void {
        this.setState({
            ...this.state,
            isHovered: false,
            isLoaded: false,
        });

        this.rebuildMesh();
    }

    updateState({
        props,
        oldProps,
    }: UpdateParameters<Layer<SeismicFenceMeshLayerProps & Required<CompositeLayerProps>>>) {
        const updateRequired =
            !isEqual(oldProps.data?.sections.length, props.data?.sections.length) ||
            !isEqual(oldProps.data?.sections, props.data?.sections);

        if (updateRequired) {
            this.setState({
                ...this.state,
                isLoaded: false,
            });

            if (props.isLoading) {
                return;
            }

            this.rebuildMesh();
        }
    }

    private calcNumVerticesForSection(section: SeismicFenceSection): number {
        return section.numSamplesU * section.numSamplesV * 3;
    }

    private calcNumIndicesForSection(section: SeismicFenceSection): number {
        return (section.numSamplesU - 1) * (section.numSamplesV - 1) * 6;
    }

    private initSharedBuffers() {
        const { data } = this.props;

        let totalNumVertices = 0;
        let totalNumIndices = 0;

        for (const section of data.sections) {
            totalNumVertices += this.calcNumVerticesForSection(section);
            totalNumIndices += this.calcNumIndicesForSection(section);
        }
        this._sharedVerticesBuffer = new SharedArrayBuffer(totalNumVertices * Float32Array.BYTES_PER_ELEMENT);
        this._sharedIndicesBuffer = new SharedArrayBuffer(totalNumIndices * Uint32Array.BYTES_PER_ELEMENT);
    }

    private calcBoundingBox(): BoundingBox3D {
        let xmin = Number.MAX_VALUE;
        let ymin = Number.MAX_VALUE;
        let zmin = Number.MAX_VALUE;
        let xmax = Number.MIN_VALUE;
        let ymax = Number.MIN_VALUE;
        let zmax = Number.MIN_VALUE;

        const zFactor = this.props.zIncreaseDownwards ? -1 : 1;

        for (const section of this.props.data.sections) {
            for (const point of section.boundingBox) {
                xmin = Math.min(xmin, point[0]);
                ymin = Math.min(ymin, point[1]);
                zmin = Math.min(zmin, zFactor * point[2]);
                xmax = Math.max(xmax, point[0]);
                ymax = Math.max(ymax, point[1]);
                zmax = Math.max(zmax, zFactor * point[2]);
            }
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
    }

    private maybeUpdateGeometry() {
        if (this._numTasks === this._numTasksCompleted) {
            this.colorMesh().then(() => {
                const verticesArr = new Float32Array(this._sharedVerticesBuffer!);
                const indicesArr = new Uint32Array(this._sharedIndicesBuffer!);
                this.setState({
                    geometry: new Geometry({
                        attributes: {
                            positions: verticesArr,
                            colors: {
                                value: this._colorsArray,
                                size: 4,
                            },
                        },
                        topology: "triangle-list",
                        indices: indicesArr,
                    }),
                    isLoaded: true,
                });

                this.props.reportBoundingBox?.({
                    layerBoundingBox: this.calcBoundingBox(),
                });
            });
        }
    }

    private calcOrigin(): [number, number, number] {
        const { data, zIncreaseDownwards } = this.props;

        if (data.sections.length === 0) {
            return [0, 0, 0];
        }

        const firstSection = data.sections[0];

        return [
            firstSection.boundingBox[0][0],
            firstSection.boundingBox[0][1],
            (zIncreaseDownwards ? -1 : 1) * firstSection.boundingBox[0][2],
        ];
    }

    private rebuildMesh() {
        const { zIncreaseDownwards } = this.props;

        this.initSharedBuffers();

        assert(this._sharedVerticesBuffer !== null, "Shared vertices buffer is null");
        assert(this._sharedIndicesBuffer !== null, "Shared indices buffer is null");

        const origin = this.calcOrigin();

        let verticesIndex = 0;
        let indicesIndex = 0;
        for (const section of this.props.data.sections) {
            this._numTasks++;

            const offset: [number, number, number] = [
                section.boundingBox[0][0] - origin[0],
                section.boundingBox[0][1] - origin[1],
                (zIncreaseDownwards ? -1 : 1) * section.boundingBox[0][2] - origin[2],
            ];

            const params: WebworkerParameters = {
                offset,
                numSamplesU: section.numSamplesU,
                numSamplesV: section.numSamplesV,
                boundingBox: section.boundingBox,
                startVerticesIndex: verticesIndex,
                startIndicesIndex: indicesIndex,
                sharedVerticesBuffer: this._sharedVerticesBuffer,
                sharedIndicesBuffer: this._sharedIndicesBuffer,
                zIncreasingDownwards: this.props.zIncreaseDownwards ?? false,
            };

            verticesIndex += this.calcNumVerticesForSection(section);
            indicesIndex += this.calcNumIndicesForSection(section);

            this._pool
                .exec(makeMesh, [{ ...params }])
                .then(() => {
                    this._numTasksCompleted++;
                    this.maybeUpdateGeometry();
                })
                .catch(() => {
                    this._numTasksFailed++;
                });
        }
    }

    private async colorMesh() {
        const { data, colorMapFunction } = this.props;

        this._colorsArray = new Float32Array(
            data.sections.reduce((acc, section) => acc + section.properties.length * 4, 0)
        );

        let colorIndex = 0;
        for (const section of data.sections) {
            for (let i = 0; i < section.properties.length; i++) {
                const [r, g, b] = colorMapFunction(section.properties[i]);
                this._colorsArray[colorIndex * 4 + 0] = r / 255;
                this._colorsArray[colorIndex * 4 + 1] = g / 255;
                this._colorsArray[colorIndex * 4 + 2] = b / 255;
                this._colorsArray[colorIndex * 4 + 3] = 1;
                colorIndex++;
            }
        }
    }

    private getProperty(vertexIndex: number): number {
        const { data } = this.props;

        let offset = 0;
        for (const section of data.sections) {
            if (vertexIndex < offset + section.properties.length) {
                return section.properties[vertexIndex - offset];
            }
            offset += section.properties.length;
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
        this.setState({ isHovered: pickingInfo.index !== -1 });
        return false;
    }

    renderLayers() {
        const { hoverable, isLoading, data, zIncreaseDownwards, loadingGeometry } = this.props;
        const { geometry, isHovered, isLoaded } = this.state;

        const origin = this.calcOrigin();

        const layers: Layer<any>[] = [];

        if ((isLoading || !isLoaded) && loadingGeometry) {
            layers.push(
                new PreviewLayer({
                    id: "seismic-fence-mesh-layer-loading",
                    data: {
                        geometry: loadingGeometry,
                    },
                    zIncreaseDownwards,
                })
            );
        } else {
            layers.push(
                new ExtendedSimpleMeshLayer({
                    id: "seismic-fence-mesh-layer",
                    data: [0],
                    mesh: geometry,
                    getPosition: origin,
                    getColor: [255, 255, 255, 255],
                    material: { ambient: 0.95, diffuse: 1, shininess: 0, specularColor: [0, 0, 0] },
                    pickable: true,
                })
            );
        }

        return layers;
    }
}

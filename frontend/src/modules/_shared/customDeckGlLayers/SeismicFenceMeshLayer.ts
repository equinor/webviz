import { CompositeLayer, CompositeLayerProps, Layer, PickingInfo, UpdateParameters } from "@deck.gl/core";
import { PathLayer } from "@deck.gl/layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";

export type SeismicFenceMeshLayerProps = {
    startPosition: [number, number, number];
    data: {
        vertices: Float32Array;
        indices: Uint32Array;
        properties: Float32Array;
    };
    boundingBox: number[][]; // [minX, minY, minZ, maxX, maxY, maxZ]
    colorMapFunction: (value: number) => [number, number, number];
};

export class SeismicFenceMeshLayer extends CompositeLayer<SeismicFenceMeshLayerProps> {
    static layerName: string = "SeismicFenceMeshLayer";

    // @ts-expect-error - private
    state!: {
        geometry: Geometry;
        isHovered: boolean;
    };

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

        // Implementation of mesh creation
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
        const { startPosition, boundingBox } = this.props;
        const { geometry, isHovered } = this.state;

        const layers: Layer<any>[] = [
            new SimpleMeshLayer({
                id: "seismic-fence-mesh-layer",
                data: [0],
                mesh: geometry,
                getPosition: startPosition,
                getColor: [255, 255, 255, 255],
                material: { ambient: 0.95, diffuse: 1, shininess: 0, specularColor: [0, 0, 0] },
                pickable: true,
            }),
        ];

        if (isHovered) {
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

import { CompositeLayer, CompositeLayerProps, Layer, UpdateParameters } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";

export type SeismicFenceMeshLayerProps = {
    data: {
        vertices: Float32Array;
        indices: Uint16Array;
        properties: Float32Array;
    };
    propertyRange: [number, number];
    colorMapFunction: (value: number) => [number, number, number];
};

export class SeismicFenceMeshLayer extends CompositeLayer<SeismicFenceMeshLayerProps> {
    static layerName: string = "SeismicFenceMeshLayer";

    // @ts-expect-error - private
    state!: {
        geometry: Geometry;
    };

    private makeColorsArray(): Float32Array {
        const { data, propertyRange, colorMapFunction } = this.props;
        const [minValue, maxValue] = propertyRange;

        const colors = new Float32Array(data.properties.length * 4);

        for (let i = 0; i < data.properties.length; i++) {
            const [r, g, b] = colorMapFunction((data.properties[i] - minValue) / (maxValue - minValue));
            colors[i * 4 + 0] = r;
            colors[i * 4 + 1] = g;
            colors[i * 4 + 2] = b;
            colors[i * 4 + 3] = 255;
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

    updateState(params: UpdateParameters<Layer<SeismicFenceMeshLayerProps & Required<CompositeLayerProps>>>) {
        super.updateState(params);
        this.makeMesh();
    }

    renderLayers() {
        const { geometry } = this.state;

        return new SimpleMeshLayer({
            id: "seismic-fence-mesh-layer",
            data: [0],
            mesh: geometry,
            getPosition: [0, 0, 0],
            getColor: [255, 255, 255],
        });
    }
}

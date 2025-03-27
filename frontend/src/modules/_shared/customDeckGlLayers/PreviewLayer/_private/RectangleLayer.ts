import { CompositeLayer, CompositeLayerProps, Layer, UpdateParameters } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";

export type RectangleLayerData = {
    centerPoint: [number, number, number];
    dimensions: [number, number];
    normalizedEdgeVectors: [[number, number, number], [number, number, number]];
};

export type RectangleLayerProps = {
    id: string;
    data: RectangleLayerData;
};

export class RectangleLayer extends CompositeLayer<RectangleLayerProps> {
    static layerName = "RectangleLayer";

    // @ts-expect-error - private
    state!: {
        geometry: Geometry;
    };

    private makeGeometry(): Geometry {
        const { data } = this.props;

        const vertices: Float32Array = new Float32Array(4 * 3);
        const indices: Uint16Array = new Uint16Array(6);

        const [centerX, centerY, centerZ] = data.centerPoint;
        const [width, height] = data.dimensions;
        const [[uX, uY, uZ], [vX, vY, vZ]] = data.normalizedEdgeVectors;

        const halfWidth = width / 2;
        const halfHeight = height / 2;

        // bottom left
        vertices[0] = centerX - uX * halfWidth - vX * halfHeight;
        vertices[1] = centerY - uY * halfWidth - vY * halfHeight;
        vertices[2] = centerZ - uZ * halfWidth - vZ * halfHeight;

        // bottom right
        vertices[3] = centerX + uX * halfWidth - vX * halfHeight;
        vertices[4] = centerY + uY * halfWidth - vY * halfHeight;
        vertices[5] = centerZ + uZ * halfWidth - vZ * halfHeight;

        // top right
        vertices[6] = centerX + uX * halfWidth + vX * halfHeight;
        vertices[7] = centerY + uY * halfWidth + vY * halfHeight;
        vertices[8] = centerZ + uZ * halfWidth + vZ * halfHeight;

        // top left
        vertices[9] = centerX - uX * halfWidth + vX * halfHeight;
        vertices[10] = centerY - uY * halfWidth + vY * halfHeight;
        vertices[11] = centerZ - uZ * halfWidth + vZ * halfHeight;

        // bottom left
        indices[0] = 0;
        indices[1] = 1;
        indices[2] = 2;

        // top right
        indices[3] = 2;
        indices[4] = 3;
        indices[5] = 0;

        return new Geometry({
            topology: "triangle-list",
            attributes: {
                positions: vertices,
            },
            indices,
        });
    }

    initializeState(): void {
        this.setState({
            ...this.state,
            isHovered: false,
            isLoaded: false,
        });
    }

    updateState({ changeFlags }: UpdateParameters<Layer<RectangleLayerProps & Required<CompositeLayerProps>>>) {
        if (changeFlags.dataChanged) {
            this.setState({
                geometry: this.makeGeometry(),
            });
        }
    }

    renderLayers() {
        return [
            new SimpleMeshLayer({
                id: "mesh",
                data: [0],
                mesh: this.state.geometry,
                getPosition: (d) => [0, 0, 0],
                getColor: [100, 100, 100, 100],
                material: { ambient: 0.95, diffuse: 1, shininess: 0, specularColor: [0, 0, 0] },
                pickable: false,
            }),
        ];
    }
}

import { CompositeLayer, CompositeLayerProps, Layer, UpdateParameters } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import * as vec3 from "@lib/utils/vec3";
import { Geometry } from "@luma.gl/engine";

export type RectangleLayerData = {
    centerPoint: [number, number, number];
    dimensions: [number, number, number];
    normalizedEdgeVectors: [[number, number, number], [number, number, number]];
};

export type RectangleLayerProps = {
    id: string;
    data: RectangleLayerData;
};

export class BoxLayer extends CompositeLayer<RectangleLayerProps> {
    static layerName = "BoxLayer";

    // @ts-expect-error - private
    state!: {
        geometry: Geometry;
    };

    private makeGeometry(): Geometry {
        const { data } = this.props;

        const vertices: Float32Array = new Float32Array(8 * 3);
        const indices: Uint16Array = new Uint16Array(3 * 2 * 6);

        const [centerX, centerY, centerZ] = data.centerPoint;
        const [width, height, depth] = data.dimensions;
        const [[uX, uY, uZ], [vX, vY, vZ]] = data.normalizedEdgeVectors;

        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfDepth = depth / 2;

        const center = vec3.fromArray([centerX, centerY, centerZ]);
        const vecU = vec3.fromArray([uX, uY, uZ]);
        const vecV = vec3.fromArray([vX, vY, vZ]);

        // Make normal vector from u and v
        const vecW = vec3.cross(vecU, vecV);

        // Make vertices wrt to vectors
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, halfWidth),
                    vec3.scale(vecV, halfHeight),
                    vec3.scale(vecW, halfDepth),
                ),
            ),
            0,
        );
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, halfWidth),
                    vec3.scale(vecV, -halfHeight),
                    vec3.scale(vecW, halfDepth),
                ),
            ),
            3,
        );
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, -halfWidth),
                    vec3.scale(vecV, -halfHeight),
                    vec3.scale(vecW, halfDepth),
                ),
            ),
            6,
        );
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, -halfWidth),
                    vec3.scale(vecV, halfHeight),
                    vec3.scale(vecW, halfDepth),
                ),
            ),
            9,
        );
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, halfWidth),
                    vec3.scale(vecV, halfHeight),
                    vec3.scale(vecW, -halfDepth),
                ),
            ),
            12,
        );
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, halfWidth),
                    vec3.scale(vecV, -halfHeight),
                    vec3.scale(vecW, -halfDepth),
                ),
            ),
            15,
        );
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, -halfWidth),
                    vec3.scale(vecV, -halfHeight),
                    vec3.scale(vecW, -halfDepth),
                ),
            ),
            18,
        );
        vertices.set(
            vec3.toArray(
                vec3.concat(
                    center,
                    vec3.scale(vecU, -halfWidth),
                    vec3.scale(vecV, halfHeight),
                    vec3.scale(vecW, -halfDepth),
                ),
            ),
            21,
        );

        // Front
        indices.set([0, 1, 2], 0);
        indices.set([0, 2, 3], 3);

        // Back
        indices.set([4, 6, 5], 6);
        indices.set([4, 7, 6], 9);

        // Left
        indices.set([0, 7, 4], 12);
        indices.set([0, 3, 7], 15);

        // Right
        indices.set([1, 5, 6], 18);
        indices.set([1, 6, 2], 21);

        // Top
        indices.set([3, 2, 6], 24);
        indices.set([3, 6, 7], 27);

        // Bottom
        indices.set([0, 4, 5], 30);
        indices.set([0, 5, 1], 33);

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

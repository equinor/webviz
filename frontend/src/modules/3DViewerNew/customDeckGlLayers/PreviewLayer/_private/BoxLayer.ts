import { CompositeLayer, type CompositeLayerProps, type Layer, type UpdateParameters } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";

import * as vec3 from "@lib/utils/vec3";

export type RectangleLayerData = {
    centerPoint: [number, number, number];
    dimensions: [number, number, number];
    normalizedEdgeVectors: [[number, number, number], [number, number, number]];
};

export type BoxLayerProps = ExtendedLayerProps & {
    data: RectangleLayerData;
};

export class BoxLayer extends CompositeLayer<BoxLayerProps> {
    static layerName = "BoxLayer";

    // @ts-expect-error - private
    state!: {
        geometry: Geometry;
    };

    private makeGeometry(): Geometry {
        const { data } = this.props;

        const [centerX, centerY, centerZ] = data.centerPoint;
        const [[uX, uY, uZ], [vX, vY, vZ]] = data.normalizedEdgeVectors;
        const [clampedWidth, clampedHeight, clampedDepth] = data.dimensions.map((dim) => Math.max(dim, 0.001));

        const halfWidth = clampedWidth / 2;
        const halfHeight = clampedHeight / 2;
        const halfDepth = clampedDepth / 2;

        const [wX, wY, wZ] = vec3.toArray(vec3.normalize(vec3.cross(vec3.create(uX, uY, uZ), vec3.create(vX, vY, vZ))));

        const corners = [
            // Front face (+W)
            vec3.create(
                centerX + halfWidth * uX + halfHeight * vX + halfDepth * wX,
                centerY + halfWidth * uY + halfHeight * vY + halfDepth * wY,
                centerZ + halfWidth * uZ + halfHeight * vZ + halfDepth * wZ,
            ),
            vec3.create(
                centerX - halfWidth * uX + halfHeight * vX + halfDepth * wX,
                centerY - halfWidth * uY + halfHeight * vY + halfDepth * wY,
                centerZ - halfWidth * uZ + halfHeight * vZ + halfDepth * wZ,
            ),
            vec3.create(
                centerX - halfWidth * uX - halfHeight * vX + halfDepth * wX,
                centerY - halfWidth * uY - halfHeight * vY + halfDepth * wY,
                centerZ - halfWidth * uZ - halfHeight * vZ + halfDepth * wZ,
            ),
            vec3.create(
                centerX + halfWidth * uX - halfHeight * vX + halfDepth * wX,
                centerY + halfWidth * uY - halfHeight * vY + halfDepth * wY,
                centerZ + halfWidth * uZ - halfHeight * vZ + halfDepth * wZ,
            ),
            // Back face (-W)
            vec3.create(
                centerX + halfWidth * uX + halfHeight * vX - halfDepth * wX,
                centerY + halfWidth * uY + halfHeight * vY - halfDepth * wY,
                centerZ + halfWidth * uZ + halfHeight * vZ - halfDepth * wZ,
            ),
            vec3.create(
                centerX - halfWidth * uX + halfHeight * vX - halfDepth * wX,
                centerY - halfWidth * uY + halfHeight * vY - halfDepth * wY,
                centerZ - halfWidth * uZ + halfHeight * vZ - halfDepth * wZ,
            ),
            vec3.create(
                centerX - halfWidth * uX - halfHeight * vX - halfDepth * wX,
                centerY - halfWidth * uY - halfHeight * vY - halfDepth * wY,
                centerZ - halfWidth * uZ - halfHeight * vZ - halfDepth * wZ,
            ),
            vec3.create(
                centerX + halfWidth * uX - halfHeight * vX - halfDepth * wX,
                centerY + halfWidth * uY - halfHeight * vY - halfDepth * wY,
                centerZ + halfWidth * uZ - halfHeight * vZ - halfDepth * wZ,
            ),
        ];

        const faces = [
            { indices: [0, 1, 2, 3], normal: vec3.create(wX, wY, wZ) }, // +W (front)
            { indices: [4, 5, 6, 7], normal: vec3.create(-wX, -wY, -wZ) }, // -W (back)
            { indices: [1, 5, 6, 2], normal: vec3.create(-uX, -uY, -uZ) }, // -U (left)
            { indices: [4, 0, 3, 7], normal: vec3.create(uX, uY, uZ) }, // +U (right)
            { indices: [4, 5, 1, 0], normal: vec3.create(vX, vY, vZ) }, // +V (top)
            { indices: [3, 2, 6, 7], normal: vec3.create(-vX, -vY, -vZ) }, // -V (bottom)
        ];

        const positions = new Float32Array(faces.length * 4 * 3);
        const normals = new Float32Array(positions.length);
        const indices = new Uint32Array(faces.length * 2 * 3);

        let p = 0;
        let i = 0;
        for (let f = 0; f < faces.length; f++) {
            const { indices: face, normal } = faces[f];

            for (let v = 0; v < 4; v++) {
                const corner = corners[face[v]];
                positions.set([corner.x, corner.y, corner.z], p);
                normals.set([normal.x, normal.y, normal.z], p);
                p += 3;
            }

            const base = f * 4;
            indices.set([base, base + 1, base + 2, base, base + 2, base + 3], i);
            i += 6;
        }

        return new Geometry({
            topology: "triangle-list",
            attributes: {
                positions,
                // normals: { value: normals, size: 3 },
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

    updateState({ changeFlags }: UpdateParameters<Layer<BoxLayerProps & Required<CompositeLayerProps>>>) {
        if (changeFlags.dataChanged) {
            this.setState({
                geometry: this.makeGeometry(),
            });
        }
    }

    renderLayers() {
        return [
            new SimpleMeshLayer(
                super.getSubLayerProps({
                    id: `${this.props.id}-mesh`,
                    data: [0],
                    mesh: this.state.geometry,
                    getPosition: () => [0, 0, 0],
                    getColor: [200, 200, 200, 255],
                    material: { ambient: 0.9, diffuse: 0.3, shininess: 0, specularColor: [0, 0, 0] },
                    pickable: false,
                    parameters: { cull: false },
                }),
            ),
        ];
    }
}

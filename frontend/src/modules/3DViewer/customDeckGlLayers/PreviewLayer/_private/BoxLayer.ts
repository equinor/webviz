import { CompositeLayer, type CompositeLayerProps, type Layer, type UpdateParameters } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";

import { fuzzyCompare } from "@lib/utils/fuzzyCompare";
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

        const [centerX, centerY, centerZ] = [0, 0, 0]; // Default center point
        const [[uX, uY, uZ], [vX, vY, vZ]] = data.normalizedEdgeVectors;
        const [clampedWidth, clampedHeight, clampedDepth] = data.dimensions.map((dim) => Math.max(dim, 0.5));

        const halfWidth = clampedWidth / 2;
        const halfHeight = clampedHeight / 2;
        const halfDepth = clampedDepth / 2;

        const u = vec3.create(uX, uY, uZ);
        const v = vec3.create(vX, vY, vZ);
        const w = vec3.normalize(vec3.cross(u, v)); // orthogonal vector

        // Precompute 8 box corners
        const offsets: [number, number, number][] = [
            [+1, +1, +1],
            [-1, +1, +1],
            [-1, -1, +1],
            [+1, -1, +1], // front (+w)
            [+1, +1, -1],
            [-1, +1, -1],
            [-1, -1, -1],
            [+1, -1, -1], // back (-w)
        ];

        const corners = offsets.map(([su, sv, sw]) =>
            vec3.add(
                { x: centerX, y: centerY, z: centerZ },
                vec3.scale(u, halfWidth * su),
                vec3.scale(v, halfHeight * sv),
                vec3.scale(w, halfDepth * sw),
            ),
        );

        // Define each face as two triangles (6 faces × 2 triangles = 12 total)
        const faces: { indices: [number, number, number]; normal: vec3.Vec3 }[] = [];

        function addFace(i0: number, i1: number, i2: number, i3: number, normal: vec3.Vec3) {
            // Triangle 1: i0, i1, i2
            faces.push({ indices: [i0, i1, i2], normal });
            // Triangle 2: i0, i2, i3
            faces.push({ indices: [i0, i2, i3], normal });
        }

        // Front (+w)
        addFace(0, 1, 2, 3, w);
        // Back (-w)
        addFace(5, 4, 7, 6, vec3.negate(w));
        // Left (-u)
        addFace(1, 5, 6, 2, vec3.negate(u));
        // Right (+u)
        addFace(4, 0, 3, 7, u);
        // Top (+v)
        addFace(4, 5, 1, 0, v);
        // Bottom (-v)
        addFace(3, 2, 6, 7, vec3.negate(v));

        const positions = new Float32Array(faces.length * 3 * 3);
        const normals = new Float32Array(faces.length * 3 * 3);
        const indices = new Uint32Array(faces.length * 3);

        let p = 0;
        let i = 0;
        for (let f = 0; f < faces.length; f++) {
            const { indices: tri, normal } = faces[f];
            for (const idx of tri) {
                const corner = corners[idx];
                positions.set([corner.x, corner.y, corner.z], p);
                normals.set([normal.x, normal.y, normal.z], p);
                p += 3;
            }
            indices.set([i, i + 1, i + 2], i);
            i += 3;
        }

        return new Geometry({
            topology: "triangle-list",
            attributes: {
                positions,
                normals: { value: normals, size: 3 },
            },
            indices,
        });
    }

    initializeState(): void {
        console.debug("BoxLayer: initializeState");
        this.setState({
            ...this.state,
            isHovered: false,
            isLoaded: false,
        });
    }

    updateState({
        changeFlags,
        props,
        oldProps,
    }: UpdateParameters<Layer<BoxLayerProps & Required<CompositeLayerProps>>>) {
        if (changeFlags.dataChanged && props.data) {
            let changeDetected = false;
            if (!fuzzyCompareArrays(props.data?.dimensions, oldProps.data?.dimensions, 0.0001)) {
                changeDetected = true;
            }
            if (
                !fuzzyCompareArrays(
                    props.data?.normalizedEdgeVectors[0],
                    oldProps.data?.normalizedEdgeVectors[0],
                    0.0001,
                )
            ) {
                changeDetected = true;
            }
            if (
                !fuzzyCompareArrays(
                    props.data?.normalizedEdgeVectors[1],
                    oldProps.data?.normalizedEdgeVectors[1],
                    0.0001,
                )
            ) {
                changeDetected = true;
            }

            if (!changeDetected) {
                return;
            }

            this.setState({
                geometry: this.makeGeometry(),
            });
        }
    }

    renderLayers() {
        const { centerPoint } = this.props.data;
        return [
            new SimpleMeshLayer(
                super.getSubLayerProps({
                    id: `${this.props.id}-mesh`,
                    data: [0],
                    mesh: this.state.geometry,
                    getPosition: () => centerPoint,
                    getColor: [255, 255, 255, 255],
                    material: true,
                    pickable: false,
                }),
            ),
        ];
    }
}

function fuzzyCompareArrays(arr1?: number[], arr2?: number[], tolerance = 0.01): boolean {
    if (!arr1 || !arr2 || arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (!fuzzyCompare(arr1[i], arr2[i], tolerance)) {
            return false;
        }
    }
    return true;
}

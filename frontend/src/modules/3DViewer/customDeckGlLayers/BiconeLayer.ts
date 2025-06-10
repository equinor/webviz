import { CompositeLayer, type CompositeLayerProps, type Layer, type UpdateParameters } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Geometry } from "@luma.gl/engine";

export type DiscLayerProps = {
    id: string;
    centerPoint: [number, number, number];
    radius: number;
    height: number;
    normalVector: [number, number, number];
    numberOfSegments?: number;
    color?: [number, number, number];
    opacity?: number;
    sizeUnits?: "meters" | "pixels";
    maxSizeInMeters?: number;
    minSizeInMeters?: number;
    depthTest?: boolean;
};

export class BiconeLayer extends CompositeLayer<DiscLayerProps> {
    static layerName = "BiconeLayer";

    // @ts-expect-error - this is how deck.gl expects state to be defined
    state!: {
        geometry: Geometry;
    };

    private makeGeometry(): Geometry {
        const segments = this.props.numberOfSegments ?? 32;
        const radius = 1;
        const height = this.props.height / this.props.radius; // Normalize height to radius

        const halfHeight = height / 2;

        const ringVertexCount = segments;
        const vertexCount = ringVertexCount * 2 + 2;
        const triangleCount = segments * 2;
        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);
        const indices = new Uint16Array(triangleCount * 3);

        const slope = halfHeight;

        // Top cone ring
        for (let i = 0; i < segments; i++) {
            const theta = (i / segments) * 2 * Math.PI;
            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);
            const z = 0;

            const len = Math.sqrt(x * x + y * y + slope * slope);
            const nx = x / len;
            const ny = y / len;
            const nz = slope / len;

            const vi = i;
            positions[vi * 3 + 0] = x;
            positions[vi * 3 + 1] = y;
            positions[vi * 3 + 2] = z;

            normals[vi * 3 + 0] = nx;
            normals[vi * 3 + 1] = ny;
            normals[vi * 3 + 2] = nz;
        }

        // Bottom cone ring
        for (let i = 0; i < segments; i++) {
            const theta = (i / segments) * 2 * Math.PI;
            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);
            const z = 0;

            const len = Math.sqrt(x * x + y * y + slope * slope);
            const nx = x / len;
            const ny = y / len;
            const nz = -slope / len;

            const vi = segments + i;
            positions[vi * 3 + 0] = x;
            positions[vi * 3 + 1] = y;
            positions[vi * 3 + 2] = z;

            normals[vi * 3 + 0] = nx;
            normals[vi * 3 + 1] = ny;
            normals[vi * 3 + 2] = nz;
        }

        // Top tip
        const topIndex = segments * 2;
        positions[topIndex * 3 + 0] = 0;
        positions[topIndex * 3 + 1] = 0;
        positions[topIndex * 3 + 2] = halfHeight;
        normals[topIndex * 3 + 0] = 0;
        normals[topIndex * 3 + 1] = 0;
        normals[topIndex * 3 + 2] = 1;

        // Bottom tip
        const bottomIndex = segments * 2 + 1;
        positions[bottomIndex * 3 + 0] = 0;
        positions[bottomIndex * 3 + 1] = 0;
        positions[bottomIndex * 3 + 2] = -halfHeight;
        normals[bottomIndex * 3 + 0] = 0;
        normals[bottomIndex * 3 + 1] = 0;
        normals[bottomIndex * 3 + 2] = -1;

        // Top cone triangles
        for (let i = 0; i < segments; i++) {
            const i0 = i;
            const i1 = (i + 1) % segments;
            const ti = i * 3;
            indices[ti + 0] = topIndex;
            indices[ti + 1] = i0;
            indices[ti + 2] = i1;
        }

        // Bottom cone triangles (reverse winding)
        for (let i = 0; i < segments; i++) {
            const i0 = segments + i;
            const i1 = segments + ((i + 1) % segments);
            const ti = segments * 3 + i * 3;
            indices[ti + 0] = bottomIndex;
            indices[ti + 1] = i1;
            indices[ti + 2] = i0;
        }

        return new Geometry({
            topology: "triangle-list",
            attributes: {
                positions,
                normals: {
                    value: normals,
                    size: 3,
                },
            },
            indices,
        });
    }

    initializeState(): void {
        this.setState({
            geometry: this.makeGeometry(),
        });
    }

    updateState({ oldProps, props }: UpdateParameters<Layer<DiscLayerProps & Required<CompositeLayerProps>>>) {
        if (
            props.radius !== oldProps.radius ||
            props.height !== oldProps.height ||
            props.numberOfSegments !== oldProps.numberOfSegments
        ) {
            this.setState({ geometry: this.makeGeometry() });
        }
    }

    renderLayers() {
        const { id, color, opacity, centerPoint, normalVector, sizeUnits, radius, depthTest } = this.props;
        const { viewport } = this.context;

        let sizeScale = this.props.radius;
        if (sizeUnits === "pixels") {
            sizeScale = radius * viewport.metersPerPixel;
        }
        sizeScale = Math.max(
            Math.min(sizeScale, this.props.maxSizeInMeters ?? Infinity),
            this.props.minSizeInMeters ?? 0,
        );

        return [
            new SimpleMeshLayer({
                id: `${id}-mesh`,
                data: [0],
                mesh: this.state.geometry,
                getPosition: () => centerPoint,
                getColor: () => color ?? [255, 255, 255],
                getOrientation: () => normalToOrientation(normalVector),
                opacity: opacity ?? 1,
                material: true,
                pickable: false,
                sizeScale,
                parameters: {
                    depthTest,
                },
            }),
        ];
    }
}

function normalToOrientation(normal: [number, number, number]): [number, number, number] {
    const [nx, ny, nz] = normalize(normal);

    // Get rotation matrix that aligns [0, 0, 1] to [nx, ny, nz]
    const z: [number, number, number] = [nx, ny, nz];

    // Construct orthonormal basis (Y and X axes)
    const up: [number, number, number] = Math.abs(nz) < 0.999 ? [0, 0, 1] : [1, 0, 0]; // handle pole case
    const x = normalize(cross(up, z));
    const y = cross(z, x);

    const rot = [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];

    return rotationMatrixToEulerXYZ(rot);
}

function rotationMatrixToEulerXYZ(m: number[]): [number, number, number] {
    // @eslint
    const [m00, m01, , m10, m11, , m20, m21, m22] = m;

    let pitch, yaw, roll;

    if (Math.abs(m20) < 0.9999) {
        pitch = Math.asin(-m20);
        yaw = Math.atan2(m10, m00);
        roll = Math.atan2(m21, m22);
    } else {
        // Gimbal lock
        pitch = Math.asin(-m20);
        yaw = 0;
        roll = Math.atan2(-m01, m11);
    }

    return [(pitch * 180) / Math.PI, (yaw * 180) / Math.PI, (roll * 180) / Math.PI];
}

function normalize([x, y, z]: [number, number, number]): [number, number, number] {
    const len = Math.hypot(x, y, z);
    return len === 0 ? [0, 0, 1] : [x / len, y / len, z / len];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

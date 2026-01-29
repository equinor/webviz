import type { Layer } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { SphereGeometry, TruncatedConeGeometry } from "@luma.gl/engine";

// Identity matrix to prevent inherited modelMatrix transformations
const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export type PickingRayLayerProps = {
    id: string;
    pickInfoCoordinates: [number, number, number][];
    origin: [number, number, number];
    sphereRadius?: number;
    cylinderRadius?: number;
};

export class PickingRayLayer extends CompositeLayer<PickingRayLayerProps> {
    static layerName: string = "PickingRayLayer";

    private _sphereMesh = new SphereGeometry({ radius: 10, nlat: 16, nlong: 16 });
    // TS bug workaround: as any to avoid error about missing properties in CylinderGeometryProps
    private _cylinderMesh = new TruncatedConeGeometry({
        topRadius: 3,
        bottomRadius: 3,
        height: 1,
        nradial: 24,
        nvertical: 1,
        topCap: true,
        bottomCap: true,
    });

    renderLayers(): Layer[] {
        const { origin, pickInfoCoordinates, sphereRadius = 2, cylinderRadius = 0.5 } = this.props;

        if (!pickInfoCoordinates?.length) {
            return [];
        }
        const segments = buildSegments(origin, pickInfoCoordinates as [number, number, number][]);

        const commonParams = {
            depthTest: false, // set true if you want occlusion
            blend: true,
            blendFunc: [1, 1], // additive glow-ish (gl.ONE, gl.ONE)
        };

        // Spheres at origin + points (or only points if you prefer)
        const sphereData = pickInfoCoordinates.map((p) => ({ position: p }));

        const spheresGlow = new SimpleMeshLayer(
            this.getSubLayerProps({
                id: "ray-spheres-glow",
                data: sphereData,
                mesh: this._sphereMesh,
                getPosition: (d: { position: [number, number, number] }) => d.position,
                getScale: () => [sphereRadius * 1.8, sphereRadius * 1.8, sphereRadius * 1.8],
                getColor: [255, 0, 0],
                opacity: 0.1,
                pickable: false,
                parameters: commonParams,
                modelMatrix: IDENTITY_MATRIX,
            }),
        );

        const spheresCore = new SimpleMeshLayer(
            this.getSubLayerProps({
                id: "ray-spheres-core",
                data: sphereData,
                mesh: this._sphereMesh,
                getPosition: (d: { position: [number, number, number] }) => d.position,
                getScale: () => [sphereRadius, sphereRadius, sphereRadius],
                getColor: [255, 0, 0],
                opacity: 0.35,
                pickable: false,
                parameters: { depthTest: false, blend: true },
                modelMatrix: IDENTITY_MATRIX,
            }),
        );

        // Cylinders between consecutive points
        // Use per-instance transformation matrix for precise control
        const cylindersGlow = new SimpleMeshLayer(
            this.getSubLayerProps({
                id: "ray-cylinders-glow",
                data: segments,
                mesh: this._cylinderMesh,
                getPosition: () => [0, 0, 0], // Position baked into matrix
                getTransformMatrix: (d: Segment) => makeCylinderMatrix(d.a, d.b, cylinderRadius * 1.8),
                getColor: [255, 0, 0],
                opacity: 0.08,
                pickable: false,
                parameters: commonParams,
                modelMatrix: IDENTITY_MATRIX,
            }),
        );

        const cylindersCore = new SimpleMeshLayer(
            this.getSubLayerProps({
                id: "ray-cylinders-core",
                data: segments,
                mesh: this._cylinderMesh,
                getPosition: () => [0, 0, 0], // Position baked into matrix
                getTransformMatrix: (d: Segment) => makeCylinderMatrix(d.a, d.b, cylinderRadius),
                getColor: [255, 0, 0],
                opacity: 0.3,
                pickable: false,
                parameters: commonParams,
                modelMatrix: IDENTITY_MATRIX,
            }),
        );

        return [cylindersGlow, cylindersCore, spheresGlow, spheresCore];
    }
}

type Vec3 = [number, number, number];
type Segment = { a: Vec3; b: Vec3 };

// Build a 4x4 transformation matrix (column-major) that:
// 1. Scales the unit cylinder (axis along +Y, height 1) to the desired radius and length
// 2. Rotates +Y to point from A to B
// 3. Translates to position A
function makeCylinderMatrix(a: Vec3, b: Vec3, radius: number): number[] {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const length = Math.hypot(dx, dy, dz);

    if (length < 1e-10) {
        // Degenerate case: return identity-ish matrix at position A
        return [radius, 0, 0, 0, 0, radius, 0, 0, 0, 0, radius, 0, a[0], a[1], a[2], 1];
    }

    // Normalized direction (this will be our new Y axis)
    const dirX = dx / length;
    const dirY = dy / length;
    const dirZ = dz / length;

    // Find a vector not parallel to dir to compute perpendicular axes
    // Use world Z unless dir is nearly parallel to Z, then use world X
    let upX = 0,
        upY = 0,
        upZ = 1;
    if (Math.abs(dirZ) > 0.99) {
        upX = 1;
        upY = 0;
        upZ = 0;
    }

    // X axis = up × dir (cross product), then normalize
    let xAxisX = upY * dirZ - upZ * dirY;
    let xAxisY = upZ * dirX - upX * dirZ;
    let xAxisZ = upX * dirY - upY * dirX;
    const xLen = Math.hypot(xAxisX, xAxisY, xAxisZ);
    xAxisX /= xLen;
    xAxisY /= xLen;
    xAxisZ /= xLen;

    // Z axis = dir × X axis (cross product)
    const zAxisX = dirY * xAxisZ - dirZ * xAxisY;
    const zAxisY = dirZ * xAxisX - dirX * xAxisZ;
    const zAxisZ = dirX * xAxisY - dirY * xAxisX;

    // The cylinder geometry is centered (y from -0.5 to +0.5), so we need to offset
    // by half the length along the direction to make it go from A to B
    const offsetX = a[0] + dirX * length * 0.5;
    const offsetY = a[1] + dirY * length * 0.5;
    const offsetZ = a[2] + dirZ * length * 0.5;

    // Build column-major 4x4 matrix: scale (radius for X/Z, length for Y) + rotate + translate
    // Column 0: X axis * radius
    // Column 1: Y axis (dir) * length
    // Column 2: Z axis * radius
    // Column 3: translation (midpoint between A and B)
    return [
        xAxisX * radius,
        xAxisY * radius,
        xAxisZ * radius,
        0,
        dirX * length,
        dirY * length,
        dirZ * length,
        0,
        zAxisX * radius,
        zAxisY * radius,
        zAxisZ * radius,
        0,
        offsetX,
        offsetY,
        offsetZ,
        1,
    ];
}

function buildSegments(origin: Vec3, points: Vec3[]): Segment[] {
    const all = [origin, ...points];
    const segs: Segment[] = [];
    for (let i = 0; i < all.length - 1; i++) {
        segs.push({ a: all[i], b: all[i + 1] });
    }
    return segs;
}

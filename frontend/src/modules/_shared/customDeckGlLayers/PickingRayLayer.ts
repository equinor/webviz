import type { Layer, UpdateParameters } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { SphereGeometry, TruncatedConeGeometry } from "@luma.gl/engine";

// Identity matrix to prevent mesh distortion from inherited modelMatrix.
// Coordinates passed to this layer are already in scaled space (from picking),
// so we use identity to keep spheres spherical instead of ellipsoidal.
const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export type PickingRayLayerProps = {
    id: string;
    /** Coordinates in unscaled world space */
    pickInfoCoordinates: [number, number, number][];
    origin: [number, number, number];
    showRay?: boolean;
    sphereRadius?: number;
    cylinderRadius?: number;
    sizeUnits?: "meters" | "pixels";
};

export class PickingRayLayer extends CompositeLayer<PickingRayLayerProps> {
    static layerName: string = "PickingRayLayer";
    static defaultProps = {
        pickable: false,
    };

    // Unit sphere (radius=1) so scale directly equals desired size
    private _sphereMesh = new SphereGeometry({ radius: 1, nlat: 16, nlong: 16 });
    // Unit cylinder (radius=1, height=1) so scale directly controls dimensions
    private _cylinderMesh = new TruncatedConeGeometry({
        topRadius: 1,
        bottomRadius: 1,
        height: 1,
        nradial: 24,
        nvertical: 1,
        topCap: true,
        bottomCap: true,
    });

    shouldUpdateState({ changeFlags }: UpdateParameters<this>): boolean {
        // Re-render on viewport changes when using pixel units
        if (this.props.sizeUnits === "pixels" && changeFlags.viewportChanged) {
            return true;
        }
        return changeFlags.propsOrDataChanged ?? false;
    }

    private getPixelScale(position: [number, number, number]): number {
        const viewport = this.context.viewport;
        if (!viewport) return 1;

        try {
            // Project the position to screen space (includes depth as z)
            const screenPos = viewport.project(position);
            if (!screenPos || !Number.isFinite(screenPos[0])) return 1;

            // Unproject a point 1 pixel to the right at the same depth back to world space
            // This gives us the world-space size of 1 pixel at this depth
            const worldPosRight = viewport.unproject([screenPos[0] + 1, screenPos[1], screenPos[2]]);
            if (!worldPosRight || !Number.isFinite(worldPosRight[0])) return 1;

            // Calculate the world distance for 1 pixel
            const dx = worldPosRight[0] - position[0];
            const dy = worldPosRight[1] - position[1];
            const dz = worldPosRight[2] - position[2];

            const scale = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return Number.isFinite(scale) && scale > 0 ? scale : 1;
        } catch {
            return 1;
        }
    }

    renderLayers(): Layer[] {
        const {
            origin,
            pickInfoCoordinates,
            sphereRadius: sphereRadiusProp = 8,
            cylinderRadius: cylinderRadiusProp = 2,
            showRay = true,
            sizeUnits = "pixels",
        } = this.props;

        if (!pickInfoCoordinates?.length) {
            return [];
        }

        // Extract vertical scale from inherited modelMatrix (Z scale is at index 10)
        // We apply this only to positions, not to mesh geometry, to keep spheres spherical
        const modelMatrix = this.props.modelMatrix as number[] | undefined;
        const verticalScale = modelMatrix?.[10] ?? 1;

        // For pixel units, we compute per-instance scale based on distance from camera
        const usePixelUnits = sizeUnits === "pixels";

        // Apply vertical scale to Z coordinates for positioning
        const scaledCoordinates = pickInfoCoordinates.map((p): [number, number, number] => [
            p[0],
            p[1],
            p[2] * verticalScale,
        ]);
        const scaledOrigin: [number, number, number] = [origin[0], origin[1], origin[2] * verticalScale];

        const segments = buildSegments(scaledOrigin, scaledCoordinates);

        const commonParams = {
            depthTest: false, // set true for occlusion
            blend: true,
            blendFunc: [1, 1], // additive glow-ish (gl.ONE, gl.ONE)
        };

        // Spheres at pick coordinates (using scaled positions)
        const sphereData = scaledCoordinates.map((p) => ({ position: p }));

        // Calculate sphere scale - either fixed meters or per-instance pixel-based
        const getSphereScale = usePixelUnits
            ? (d: { position: [number, number, number] }) => {
                  const pixelScale = this.getPixelScale(d.position);
                  const r = sphereRadiusProp * pixelScale;
                  return [r, r, r];
              }
            : () => {
                  const r = sphereRadiusProp;
                  return [r, r, r];
              };

        const getSphereScaleGlow = usePixelUnits
            ? (d: { position: [number, number, number] }) => {
                  const pixelScale = this.getPixelScale(d.position);
                  const r = sphereRadiusProp * 1.8 * pixelScale;
                  return [r, r, r];
              }
            : () => {
                  const r = sphereRadiusProp * 1.8;
                  return [r, r, r];
              };

        const spheresGlow = new SimpleMeshLayer(
            this.getSubLayerProps({
                id: "ray-spheres-glow",
                data: sphereData,
                mesh: this._sphereMesh,
                getPosition: (d: { position: [number, number, number] }) => d.position,
                getScale: getSphereScaleGlow,
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
                getScale: getSphereScale,
                getColor: [255, 0, 0],
                opacity: 0.35,
                pickable: false,
                parameters: { depthTest: false, blend: true },
                modelMatrix: IDENTITY_MATRIX,
            }),
        );

        // Cylinders between consecutive points
        // For cylinders, use the midpoint position for pixel scale calculation
        const getCylinderRadius = usePixelUnits
            ? (segment: Segment) => {
                  const mid: [number, number, number] = [
                      (segment.a[0] + segment.b[0]) / 2,
                      (segment.a[1] + segment.b[1]) / 2,
                      (segment.a[2] + segment.b[2]) / 2,
                  ];
                  return cylinderRadiusProp * this.getPixelScale(mid);
              }
            : () => cylinderRadiusProp;

        const cylindersGlow = new SimpleMeshLayer(
            this.getSubLayerProps({
                id: "ray-cylinders-glow",
                data: segments,
                mesh: this._cylinderMesh,
                getPosition: () => [0, 0, 0], // Position baked into matrix
                getTransformMatrix: (d: Segment) => makeCylinderMatrix(d.a, d.b, getCylinderRadius(d) * 1.8),
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
                getTransformMatrix: (d: Segment) => makeCylinderMatrix(d.a, d.b, getCylinderRadius(d)),
                getColor: [255, 0, 0],
                opacity: 0.3,
                pickable: false,
                parameters: commonParams,
                modelMatrix: IDENTITY_MATRIX,
            }),
        );

        if (!showRay) {
            return [spheresGlow, spheresCore];
        }

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

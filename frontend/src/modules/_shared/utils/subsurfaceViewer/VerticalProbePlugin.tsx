import type { Layer, PickingInfo, View } from "@deck.gl/core";
import { OrthographicView } from "@deck.gl/core";

import { PickingRayLayer } from "@modules/_shared/customDeckGlLayers/PickingRayLayer";

import type { LayerFilter } from "./DeckGlInstanceManager";
import { DeckGlPlugin } from "./DeckGlInstanceManager";

const PROBE_VIEW_ID = "__vertical_probe_view__";

function intersectRayWithZPlane(p0: number[], p1: number[], zPlane = 0) {
    const dz = p1[2] - p0[2];
    if (Math.abs(dz) < 1e-9) return null;
    const t = (zPlane - p0[2]) / dz;
    return [p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1]), zPlane];
}

export class VerticalProbePlugin extends DeckGlPlugin {
    private _probeView: View | null = null;

    // For visualization
    private _hitCoordinates: [number, number, number][] = [];
    private _rayOrigin: [number, number, number] = [0, 0, 0];

    constructor(manager: any) {
        super(manager);
    }

    /**
     * Returns hidden views that should be added to deck.gl
     * Synced with main view position/zoom but top-down orthographic
     */
    getHiddenDeckViews(): View[] {
        if (!this._probeView) {
            this._probeView = new OrthographicView({
                id: PROBE_VIEW_ID,
                x: 0,
                y: 0,
                width: "100%",
                height: "100%",
                controller: false,
            });
        }

        return [this._probeView];
    }

    /**
     * Returns viewState for the hidden probe view, synchronized with main view
     */
    getHiddenViewStatePatch(): Record<string, any> {
        const deck = this.getDeck();
        if (!deck) {
            return { [PROBE_VIEW_ID]: { target: [0, 0], zoom: 0 } };
        }

        // Get main view's current viewState
        const viewState = deck.props.viewState as any;
        const views = deck.props.views;
        const currentViews: any[] = Array.isArray(views) ? views : views ? [views] : [];
        const mainViewId = currentViews[0]?.id;

        const mainVS = mainViewId && viewState?.[mainViewId] ? viewState[mainViewId] : (viewState ?? {});
        const mainTarget = mainVS.target ?? [0, 0, 0];

        return {
            [PROBE_VIEW_ID]: {
                target: [mainTarget[0], mainTarget[1]],
                zoom: mainVS.zoom ?? 0,
            },
        };
    }

    handleGlobalMouseClick(pickingInfo: PickingInfo): boolean {
        const deck = this.getDeck();
        if (!deck) return false;

        const x = pickingInfo.x;
        const y = pickingInfo.y;
        if (typeof x !== "number" || typeof y !== "number") return false;

        const mainVp: any = (pickingInfo as any).viewport ?? null;
        if (!mainVp) return false;

        // Ray -> z=0 plane to get world coordinate
        const p0 = mainVp.unproject([x, y, 0]);
        const p1 = mainVp.unproject([x, y, 1]);
        const world = intersectRayWithZPlane(p0, p1, 0);
        if (!world) return false;

        // Get the probe viewport
        const viewports = deck.getViewports();
        const probeVp = viewports?.find((vp: any) => vp.id === PROBE_VIEW_ID);
        if (!probeVp) {
            console.warn("[VerticalProbe] Probe viewport not found");
            return false;
        }

        // Project world coordinate to probe view screen coordinates
        const [probeX, probeY] = probeVp.project([world[0], world[1], 0]);

        console.debug("[VerticalProbe] world:", world, "-> probe screen:", probeX, probeY);

        const allHits = deck.pickMultipleObjects({
            x: probeX,
            y: probeY,
            depth: 50,
            radius: 0,
            unproject3D: true,
        });

        // Filter to only hits from the probe view (vertical picking)
        const hits = allHits?.filter((h: any) => h.viewport?.id === PROBE_VIEW_ID) ?? [];

        console.debug("[VerticalProbe] all hits:", allHits?.length, "probe hits:", hits.length);
        if (hits.length === 0) return false;

        let areCoordinatesAlike = true;
        const firstCoord = (hits[0] as any).coordinate;
        for (const hit of hits) {
            const coord = (hit as any).coordinate;
            if (
                !Array.isArray(coord) ||
                coord.length !== firstCoord.length ||
                coord.some((v: number, i: number) => (i === 2 ? false : Math.abs(v - firstCoord[i]) > 1e-6))
            ) {
                areCoordinatesAlike = false;
                break;
            }
        }

        if (!areCoordinatesAlike) {
            console.warn("[VerticalProbe] picked coordinates differ among hits:", hits);
            return false;
        }

        // Collect hit coordinates for visualization
        const hitCoords = hits
            .filter((h: any) => Array.isArray(h.coordinate))
            .map((h: any) => h.coordinate as [number, number, number])
            .sort((a, b) => b[2] - a[2]); // Sort by Z descending (top to bottom)

        if (hitCoords.length === 0) return false;

        // Set ray origin above the highest hit
        const maxZ = Math.max(...hitCoords.map((c) => c[2]));
        this._rayOrigin = [world[0], world[1], maxZ + 100] as [number, number, number];
        this._hitCoordinates = hitCoords;

        // Trigger redraw to show the visualization
        this.requireRedraw();

        console.log("[VerticalProbe] hits:", hitCoords);
        console.log("[VerticalProbe] best (topmost):", hitCoords[0]);
        return true;
    }

    getLayers(): Layer[] {
        if (this._hitCoordinates.length === 0) {
            return [];
        }

        return [
            new PickingRayLayer({
                id: this.makeLayerId("vertical-probe-ray"),
                origin: this._rayOrigin,
                pickInfoCoordinates: this._hitCoordinates,
                sphereRadius: 5,
                cylinderRadius: 1,
            }),
        ];
    }
}

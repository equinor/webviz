import type { Layer, PickingInfo, View } from "@deck.gl/core";
import { OrthographicView } from "@deck.gl/core";

import { PickingRayLayer } from "@modules/_shared/customDeckGlLayers/PickingRayLayer";

import type { LayerFilter } from "./DeckGlInstanceManager";
import { DeckGlPlugin } from "./DeckGlInstanceManager";

const PROBE_VIEW_PREFIX = "__vertical_probe__";

function makeProbeViewId(sourceViewId: string): string {
    return `${PROBE_VIEW_PREFIX}${sourceViewId}`;
}

function isProbeViewId(viewId: string): boolean {
    return viewId.startsWith(PROBE_VIEW_PREFIX);
}

function intersectRayWithZPlane(p0: number[], p1: number[], zPlane = 0) {
    const dz = p1[2] - p0[2];
    if (Math.abs(dz) < 1e-9) return null;
    const t = (zPlane - p0[2]) / dz;
    return [p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1]), zPlane];
}

export class VerticalProbePlugin extends DeckGlPlugin {
    // Cache of probe views keyed by source view id
    private _probeViews: Map<string, View> = new Map();

    // For visualization
    private _hitCoordinates: [number, number, number][] = [];
    private _rayOrigin: [number, number, number] = [0, 0, 0];

    constructor(manager: any) {
        super(manager);
    }

    /**
     * Creates an orthographic probe view for a given source view.
     * The probe view covers the same screen area but uses orthographic (top-down) projection.
     */
    private createProbeViewForSource(sourceView: View): View {
        const sourceProps = (sourceView as any).props ?? sourceView;
        const probeId = makeProbeViewId(sourceProps.id);

        return new OrthographicView({
            id: probeId,
            x: sourceProps.x ?? 0,
            y: sourceProps.y ?? 0,
            width: sourceProps.width ?? "100%",
            height: sourceProps.height ?? "100%",
            controller: false,
            flipY: true,
        });
    }

    /**
     * Dynamically generates probe views for all current views.
     * Called during props merging to ensure probe views stay in sync.
     */
    getHiddenDeckViews(): View[] {
        const deck = this.getDeck();
        if (!deck) return [];

        const views = deck.props.views;
        const currentViews: View[] = Array.isArray(views) ? views : views ? [views] : [];

        // Filter out any existing probe views from the source list
        const sourceViews = currentViews.filter((v) => {
            const id = (v as any).id ?? (v as any).props?.id;
            return id && !isProbeViewId(id);
        });

        const probeViews: View[] = [];
        const seenIds = new Set<string>();

        for (const sourceView of sourceViews) {
            const sourceId = (sourceView as any).id ?? (sourceView as any).props?.id;
            if (!sourceId || seenIds.has(sourceId)) continue;
            seenIds.add(sourceId);

            // Reuse or create probe view
            let probeView = this._probeViews.get(sourceId);
            if (!probeView) {
                probeView = this.createProbeViewForSource(sourceView);
                this._probeViews.set(sourceId, probeView);
            }
            probeViews.push(probeView);
        }

        // Clean up stale probe views
        for (const cachedId of this._probeViews.keys()) {
            if (!seenIds.has(cachedId)) {
                this._probeViews.delete(cachedId);
            }
        }

        return probeViews;
    }

    /**
     * Returns viewState for each probe view, synchronized with its source view.
     * Converts 3D viewState to 2D orthographic viewState.
     */
    getHiddenViewStatePatch(): Record<string, any> {
        const deck = this.getDeck();
        if (!deck) return {};

        const viewState = deck.props.viewState as Record<string, any> | undefined;
        if (!viewState || typeof viewState === "function") return {};

        const patch: Record<string, any> = {};

        for (const [sourceId, _probeView] of this._probeViews) {
            const sourceVS = viewState[sourceId] ?? {};
            const target = sourceVS.target ?? [0, 0, 0];

            patch[makeProbeViewId(sourceId)] = {
                target: [target[0], target[1]],
                zoom: sourceVS.zoom ?? 0,
            };
        }

        return patch;
    }

    /**
     * Layer filter that only renders layers in probe views during picking:query passes.
     * This makes probe views "invisible" during normal rendering but active during picking.
     */
    wrapLayerFilter(prev?: LayerFilter): LayerFilter {
        return (args: { layer: Layer; viewport: any; renderPass: string }) => {
            const { viewport, renderPass } = args;
            const viewportId = viewport?.id ?? "";

            if (isProbeViewId(viewportId)) {
                // Probe views only render during explicit pick queries (click), not hover or render
                if (renderPass === "picking:query") {
                    return prev ? prev(args) : true;
                }
                return false;
            }

            // Non-probe views: apply previous filter normally
            return prev ? prev(args) : true;
        };
    }

    handleGlobalMouseClick(pickingInfo: PickingInfo): boolean {
        const deck = this.getDeck();
        if (!deck) return false;

        const x = pickingInfo.x;
        const y = pickingInfo.y;
        if (typeof x !== "number" || typeof y !== "number") return false;

        const sourceVp: any = (pickingInfo as any).viewport ?? null;
        if (!sourceVp) return false;

        // Don't handle clicks on probe views themselves
        const sourceViewId = sourceVp.id;
        if (isProbeViewId(sourceViewId)) return false;

        // Ray -> z=0 plane to get world coordinate
        const p0 = sourceVp.unproject([x, y, 0]);
        const p1 = sourceVp.unproject([x, y, 1]);
        const world = intersectRayWithZPlane(p0, p1, 0);
        if (!world) return false;

        // Get the corresponding probe viewport for this source view
        const probeViewId = makeProbeViewId(sourceViewId);
        const viewports = deck.getViewports();
        const probeVp = viewports?.find((vp: any) => vp.id === probeViewId);
        if (!probeVp) {
            console.warn("[VerticalProbe] Probe viewport not found for source:", sourceViewId);
            return false;
        }

        // Project world coordinate to probe view screen coordinates
        const [probeX, probeY] = probeVp.project([world[0], world[1], 0]);

        console.debug("[VerticalProbe] source:", sourceViewId, "world:", world, "-> probe screen:", probeX, probeY);

        const allHits = deck.pickMultipleObjects({
            x: probeX,
            y: probeY,
            depth: 50,
            radius: 0,
            unproject3D: true,
        });

        // Filter to only hits from the probe view (vertical picking)
        const hits = allHits?.filter((h: any) => h.viewport?.id === probeViewId) ?? [];

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

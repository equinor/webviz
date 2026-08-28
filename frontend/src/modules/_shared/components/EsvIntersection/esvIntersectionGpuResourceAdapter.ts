import type { GpuResourceAdapter } from "@framework/components/GpuResourceBoundary";
import { createCanvasContextAdapter } from "@framework/components/GpuResourceBoundary/adapters/canvasContextAdapter";

import type { EsvIntersectionController } from "./EsvIntersectionController";

/**
 * {@link GpuResourceAdapter} for the Pixi.js-backed ESV intersection renderer.
 *
 * Pixi rebuilds its own GPU resources (textures, buffers, ...) automatically once the context is
 * restored, so this is a thin wrapper around {@link createCanvasContextAdapter} that wires in the
 * controller's canvas, its explicit context restoration, and a redraw nudge - recovery only needs
 * the `"redraw"` strategy, no remount.
 *
 * The controller only exposes its canvas once it has finished initializing, so callers should gate
 * adapter creation on the controller's life-cycle state rather than relying on canvas polling.
 */
export function createEsvIntersectionGpuResourceAdapter(controller: EsvIntersectionController): GpuResourceAdapter {
    return createCanvasContextAdapter({
        getCanvas: () => controller.getCanvas(),
        restoreContext: () => controller.restoreContext(),
        requestRender: () => controller.requestRender(),
        isContextLost: () => controller.isContextLost(),
    });
}

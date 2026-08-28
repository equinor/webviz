import type { DeckGLRef } from "@deck.gl/react";

import type { GpuResourceAdapter } from "@framework/components/GpuResourceBoundary";
import { createCanvasContextAdapter } from "@framework/components/GpuResourceBoundary/adapters/canvasContextAdapter";

/**
 * {@link GpuResourceAdapter} for a deck.gl (`@webviz/subsurface-viewer`) renderer.
 *
 * deck.gl draws into a single `<canvas>` owned by its `Deck` instance, so this is a thin wrapper
 * around {@link createCanvasContextAdapter} with two deck.gl specifics baked in:
 *
 * - `Deck.getCanvas()` returns `null` until deck.gl's own effect has created the `Deck` instance,
 *   which can be a frame or more after the adapter connects - hence `waitForCanvas: true`.
 * - `requestRender` maps to `Deck.redraw()`. deck.gl does not reliably rebuild its GPU resources in
 *   place, so consumers should pair this adapter with the `"remount"` recovery strategy.
 *
 * @param deckGl - The `DeckGLRef` from `<DeckGL>` / `<SubsurfaceViewer>`; must be non-null.
 */
export function createDeckGlGpuResourceAdapter(deckGl: DeckGLRef): GpuResourceAdapter {
    return createCanvasContextAdapter({
        getCanvas: () => deckGl?.deck?.getCanvas() ?? null,
        requestRender: () => deckGl?.deck?.redraw("context loss"),
        waitForCanvas: true,
    });
}

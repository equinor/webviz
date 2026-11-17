/**
 * Merges the layers of all views into the one list that deck.gl draws all viewports from, keeping the order of every
 * view.
 *
 * Layers outside views are shown in every view, and can be above or below a view's own layers. Adding the layers in
 * the order they are first seen could therefore stack a shared layer differently than in a view - e.g. below views
 * `[A, Shared]` and `[B, Shared]`, it would end up above `B`. Instead, a layer that is new is put right after the layer
 * before it in its view.
 *
 * @param layersPerView - The layers of each view, the first one on top
 * @returns All layers, the first one on top
 */
export function mergeLayersOfViews<TLayer extends { id: string }>(layersPerView: TLayer[][]): TLayer[] {
    const mergedLayers: TLayer[] = [];

    for (const viewLayers of layersPerView) {
        let insertIndex = 0;

        for (const layer of viewLayers) {
            const existingIndex = mergedLayers.findIndex((mergedLayer) => mergedLayer.id === layer.id);

            if (existingIndex === -1) {
                mergedLayers.splice(insertIndex, 0, layer);
                insertIndex++;
            } else {
                insertIndex = existingIndex + 1;
            }
        }
    }

    return mergedLayers;
}

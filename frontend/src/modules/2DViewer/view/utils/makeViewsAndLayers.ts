import { Layer as DeckGlLayer } from "@deck.gl/core/typed";
import { ColorScale } from "@modules/2DViewer/layers/ColorScale";
import { View } from "@modules/2DViewer/layers/View";
import {
    BoundingBox,
    Group,
    Layer,
    LayerStatus,
    instanceofGroup,
    instanceofLayer,
} from "@modules/2DViewer/layers/interfaces";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

import { makeLayer } from "./layerFactory";

export type DeckGlLayerWithPosition = {
    layer: DeckGlLayer;
    position: number;
};

export type DeckGlView = {
    id: string;
    color: string | null;
    name: string;
    layers: DeckGlLayerWithPosition[];
};

export type DeckGlViewsAndLayers = {
    views: DeckGlView[];
    layers: DeckGlLayerWithPosition[];
    boundingBox: BoundingBox | null;
    colorScales: ColorScaleWithId[];
};

export function recursivelyMakeViewsAndLayers(group: Group, numCollectedLayers: number = 0): DeckGlViewsAndLayers {
    const collectedViews: DeckGlView[] = [];
    const collectedLayers: DeckGlLayerWithPosition[] = [];
    const collectedColorScales: ColorScaleWithId[] = [];
    let globalBoundingBox: BoundingBox | null = null;

    const children = group.getGroupDelegate().getChildren();

    const maybeApplyBoundingBox = (boundingBox: BoundingBox | null) => {
        if (boundingBox) {
            globalBoundingBox =
                globalBoundingBox === null ? boundingBox : makeNewBoundingBox(boundingBox, globalBoundingBox);
        }
    };

    for (const child of children) {
        if (!child.getItemDelegate().isVisible()) {
            continue;
        }

        if (instanceofGroup(child)) {
            const { views, layers, boundingBox, colorScales } = recursivelyMakeViewsAndLayers(
                child,
                numCollectedLayers + collectedLayers.length
            );

            collectedColorScales.push(...colorScales);
            maybeApplyBoundingBox(boundingBox);

            if (child instanceof View) {
                const view: DeckGlView = {
                    id: child.getItemDelegate().getId(),
                    color: child.getGroupDelegate().getColor(),
                    name: child.getItemDelegate().getName(),
                    layers: layers,
                };

                collectedViews.push(view);
                continue;
            }

            collectedLayers.push(...layers);
            collectedViews.push(...views);
        }

        if (instanceofLayer(child)) {
            if (child.getLayerDelegate().getStatus() !== LayerStatus.SUCCESS) {
                continue;
            }

            const layer = makeLayer(child);

            if (!layer) {
                continue;
            }

            const colorScale = findColorScale(child);

            if (colorScale) {
                collectedColorScales.push(colorScale);
            }

            const boundingBox = child.getLayerDelegate().getBoundingBox();
            maybeApplyBoundingBox(boundingBox);

            collectedLayers.push({ layer, position: numCollectedLayers + collectedLayers.length });
        }
    }

    return {
        views: collectedViews,
        layers: collectedLayers,
        boundingBox: globalBoundingBox,
        colorScales: collectedColorScales,
    };
}

function findColorScale(layer: Layer<any, any>): { id: string; colorScale: ColorScaleWithName } | null {
    const colorScaleItemArr = layer
        .getItemDelegate()
        .getParentGroup()
        ?.getAncestorAndSiblingItems((item) => item instanceof ColorScale);
    if (!colorScaleItemArr || colorScaleItemArr.length === 0) {
        return null;
    }

    const colorScaleItem = colorScaleItemArr[0];
    if (!(colorScaleItem instanceof ColorScale)) {
        return null;
    }

    return {
        id: layer.getItemDelegate().getId(),
        colorScale: ColorScaleWithName.fromColorScale(
            colorScaleItem.getColorScale(),
            layer.getItemDelegate().getName()
        ),
    };
}

function makeNewBoundingBox(newBoundingBox: BoundingBox, oldBoundingBox: BoundingBox): BoundingBox {
    return {
        x: [Math.min(newBoundingBox.x[0], oldBoundingBox.x[0]), Math.max(newBoundingBox.x[1], oldBoundingBox.x[1])],
        y: [Math.min(newBoundingBox.y[0], oldBoundingBox.y[0]), Math.max(newBoundingBox.y[1], oldBoundingBox.y[1])],
        z: [Math.min(newBoundingBox.z[0], oldBoundingBox.z[0]), Math.max(newBoundingBox.z[1], oldBoundingBox.z[1])],
    };
}

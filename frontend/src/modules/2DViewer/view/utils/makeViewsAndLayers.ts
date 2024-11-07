import { Layer as DeckGlLayer } from "@deck.gl/core";
import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorScale } from "@modules/2DViewer/layers/ColorScale";
import { DeltaSurface } from "@modules/2DViewer/layers/DeltaSurface";
import { View } from "@modules/2DViewer/layers/View";
import { LayerStatus } from "@modules/2DViewer/layers/delegates/LayerDelegate";
import { BoundingBox, Group, Layer, instanceofGroup, instanceofLayer } from "@modules/2DViewer/layers/interfaces";
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
    errorMessages: (StatusMessage | string)[];
    boundingBox: BoundingBox | null;
    colorScales: ColorScaleWithId[];
    numLoadingLayers: number;
};

export function recursivelyMakeViewsAndLayers(group: Group, numCollectedLayers: number = 0): DeckGlViewsAndLayers {
    const collectedViews: DeckGlView[] = [];
    const collectedLayers: DeckGlLayerWithPosition[] = [];
    const collectedColorScales: ColorScaleWithId[] = [];
    const collectedErrorMessages: (StatusMessage | string)[] = [];
    let collectedNumLoadingLayers = 0;
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

        if (instanceofGroup(child) && !(child instanceof DeltaSurface)) {
            const { views, layers, boundingBox, colorScales, numLoadingLayers, errorMessages } =
                recursivelyMakeViewsAndLayers(child, numCollectedLayers + collectedLayers.length);

            collectedColorScales.push(...colorScales);
            collectedErrorMessages.push(...errorMessages);
            collectedNumLoadingLayers += numLoadingLayers;
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
            if (child.getLayerDelegate().getStatus() === LayerStatus.LOADING) {
                collectedNumLoadingLayers++;
            }

            if (child.getLayerDelegate().getStatus() !== LayerStatus.SUCCESS) {
                if (child.getLayerDelegate().getStatus() === LayerStatus.ERROR) {
                    const error = child.getLayerDelegate().getError();
                    if (error) {
                        collectedErrorMessages.push(error);
                    }
                }
                continue;
            }

            const colorScale = findColorScale(child);

            const layer = makeLayer(child, colorScale?.colorScale ?? undefined);

            if (!layer) {
                continue;
            }

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
        errorMessages: collectedErrorMessages,
        boundingBox: globalBoundingBox,
        colorScales: collectedColorScales,
        numLoadingLayers: collectedNumLoadingLayers,
    };
}

function findColorScale(layer: Layer<any, any>): { id: string; colorScale: ColorScaleWithName } | null {
    if (layer.getLayerDelegate().getColoringType() !== "COLORSCALE") {
        return null;
    }

    let colorScaleWithName = new ColorScaleWithName({
        colorPalette: defaultContinuousSequentialColorPalettes[0],
        gradientType: ColorScaleGradientType.Sequential,
        name: layer.getItemDelegate().getName(),
        type: ColorScaleType.Continuous,
        steps: 10,
    });

    const range = layer.getLayerDelegate().getValueRange();
    if (range) {
        colorScaleWithName.setRangeAndMidPoint(range[0], range[1], (range[0] + range[1]) / 2);
    }

    const colorScaleItemArr = layer
        .getItemDelegate()
        .getParentGroup()
        ?.getAncestorAndSiblingItems((item) => item instanceof ColorScale);

    if (colorScaleItemArr && colorScaleItemArr.length > 0) {
        const colorScaleItem = colorScaleItemArr[0];
        if (colorScaleItem instanceof ColorScale) {
            colorScaleWithName = ColorScaleWithName.fromColorScale(
                colorScaleItem.getColorScale(),
                layer.getItemDelegate().getName()
            );

            if (!colorScaleItem.getAreBoundariesUserDefined()) {
                const range = layer.getLayerDelegate().getValueRange();
                if (range) {
                    colorScaleWithName.setRangeAndMidPoint(range[0], range[1], (range[0] + range[1]) / 2);
                }
            }
        }
    }

    return {
        id: layer.getItemDelegate().getId(),
        colorScale: colorScaleWithName,
    };
}

function makeNewBoundingBox(newBoundingBox: BoundingBox, oldBoundingBox: BoundingBox): BoundingBox {
    return {
        x: [Math.min(newBoundingBox.x[0], oldBoundingBox.x[0]), Math.max(newBoundingBox.x[1], oldBoundingBox.x[1])],
        y: [Math.min(newBoundingBox.y[0], oldBoundingBox.y[0]), Math.max(newBoundingBox.y[1], oldBoundingBox.y[1])],
        z: [Math.min(newBoundingBox.z[0], oldBoundingBox.z[0]), Math.max(newBoundingBox.z[1], oldBoundingBox.z[1])],
    };
}

import { Layer as DeckGlLayer } from "@deck.gl/core";
import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { GroupDelegate } from "@modules/_shared/LayerFramework/delegates/GroupDelegate";
import { LayerColoringType, LayerStatus } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { ColorScale } from "@modules/_shared/LayerFramework/framework/ColorScale/ColorScale";
import { DeltaSurface } from "@modules/_shared/LayerFramework/framework/DeltaSurface/DeltaSurface";
import { GroupImpl } from "@modules/_shared/LayerFramework/framework/Group/Group";
import {
    BoundingBox,
    CustomDataLayerImplementation,
    instanceofGroup,
    instanceofLayer,
} from "@modules/_shared/LayerFramework/interfaces";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

import { makeDeckGlLayer } from "./layerFactory";

export type DeckGlLayerWithPosition = {
    layer: DeckGlLayer;
    position: number;
};

export type DeckGlView = {
    id: string;
    color: string | null;
    name: string;
    layers: DeckGlLayerWithPosition[];
    colorScales: ColorScaleWithId[];
};

export type DeckGlViewsAndLayers = {
    views: DeckGlView[];
    layers: DeckGlLayerWithPosition[];
    errorMessages: (StatusMessage | string)[];
    boundingBox: BoundingBox | null;
    colorScales: ColorScaleWithId[];
    numLoadingLayers: number;
};

export function recursivelyMakeViewsAndLayers(
    groupDelegate: GroupDelegate,
    numCollectedLayers: number = 0
): DeckGlViewsAndLayers {
    const collectedViews: DeckGlView[] = [];
    const collectedLayers: DeckGlLayerWithPosition[] = [];
    const collectedColorScales: ColorScaleWithId[] = [];
    const collectedErrorMessages: (StatusMessage | string)[] = [];
    let collectedNumLoadingLayers = 0;
    let globalBoundingBox: BoundingBox | null = null;

    const children = groupDelegate.getChildren();

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
                recursivelyMakeViewsAndLayers(child.getGroupDelegate(), numCollectedLayers + collectedLayers.length);

            collectedErrorMessages.push(...errorMessages);
            collectedNumLoadingLayers += numLoadingLayers;
            maybeApplyBoundingBox(boundingBox);

            if (child instanceof GroupImpl) {
                const view: DeckGlView = {
                    id: child.getItemDelegate().getId(),
                    color: child.getGroupDelegate().getColor(),
                    name: child.getItemDelegate().getName(),
                    layers: layers,
                    colorScales,
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

            const layer = makeDeckGlLayer(child, colorScale?.colorScale ?? undefined);

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

function findColorScale(
    layer: CustomDataLayerImplementation<any, any>
): { id: string; colorScale: ColorScaleWithName } | null {
    if (layer.getLayerDelegate().getColoringType() !== LayerColoringType.COLORSCALE) {
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

import { Layer as DeckGlLayer } from "@deck.gl/core";
import { Layer as EsvLayer } from "@equinor/esv-intersection";
import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { defaultColorPalettes, defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

import { GroupDelegate } from "../delegates/GroupDelegate";
import { LayerColoringType, LayerStatus } from "../delegates/LayerDelegate";
import { ColorScale } from "../framework/ColorScale/ColorScale";
import { DeltaSurface } from "../framework/DeltaSurface/DeltaSurface";
import { LayerManager } from "../framework/LayerManager/LayerManager";
import { View } from "../framework/View/View";
import { BoundingBox, Layer, Settings, instanceofGroup, instanceofLayer } from "../interfaces";

export enum VisualizationTarget {
    DECK_GL = "deck_gl",
    ESV = "esv",
    // VIDEX = "videx",
}

export type VisualizationFunctionArgs<TSettings extends Settings, TData> = {
    id: string;
    name: string;
    data: TData;
    colorScale: ColorScaleWithName;
    settings: TSettings;
    isLoading: boolean;
    predictedNextBoundingBox: BoundingBox | null;
};

export type TargetReturnTypes = {
    [VisualizationTarget.DECK_GL]: DeckGlLayer<any>;
    [VisualizationTarget.ESV]: EsvLayer<any>;
};

export type MakeVisualizationFunction<TSettings extends Settings, TData, TTarget extends VisualizationTarget> = (
    args: VisualizationFunctionArgs<TSettings, TData>
) => TargetReturnTypes[TTarget];

export type LayerWithPosition<TTarget extends VisualizationTarget> = {
    layer: TargetReturnTypes[TTarget];
    position: number;
};

export type VisualizationView<TTarget extends VisualizationTarget> = {
    id: string;
    color: string | null;
    name: string;
    layers: LayerWithPosition<TTarget>[];
    colorScales: ColorScaleWithId[];
};

export type FactoryProduct<TTarget extends VisualizationTarget> = {
    views: VisualizationView<TTarget>[];
    layers: LayerWithPosition<TTarget>[];
    errorMessages: (StatusMessage | string)[];
    boundingBox: BoundingBox | null;
    colorScales: ColorScaleWithId[];
    numLoadingLayers: number;
};

export class VisualizationFactory<TTarget extends VisualizationTarget> {
    private _visualizationFunctions: Map<string, MakeVisualizationFunction<any, any, TTarget>> = new Map();

    registerVisualizationFunction<TSettings extends Settings, TData>(
        layerCtor: { new (layerManager: LayerManager): Layer<TSettings, TData, any> },
        func: MakeVisualizationFunction<TSettings, TData, TTarget>
    ): void {
        if (this._visualizationFunctions.has(layerCtor.name)) {
            throw new Error(`Visualization function for layer ${layerCtor.name} already registered`);
        }
        this._visualizationFunctions.set(layerCtor.name, func);
    }

    make(layerManager: LayerManager): FactoryProduct<TTarget> {
        return this.makeRecursively(layerManager.getGroupDelegate());
    }

    private makeRecursively(groupDelegate: GroupDelegate, numCollectedLayers: number = 0): FactoryProduct<TTarget> {
        const collectedViews: VisualizationView<TTarget>[] = [];
        const collectedLayers: LayerWithPosition<TTarget>[] = [];
        const collectedColorScales: ColorScaleWithId[] = [];
        const collectedErrorMessages: (StatusMessage | string)[] = [];
        let collectedNumLoadingLayers = 0;
        let globalBoundingBox: BoundingBox | null = null;

        const children = groupDelegate.getChildren();

        const maybeApplyBoundingBox = (boundingBox: BoundingBox | null) => {
            if (boundingBox) {
                globalBoundingBox =
                    globalBoundingBox === null ? boundingBox : this.makeNewBoundingBox(boundingBox, globalBoundingBox);
            }
        };

        for (const child of children) {
            if (!child.getItemDelegate().isVisible()) {
                continue;
            }

            if (instanceofGroup(child) && !(child instanceof DeltaSurface)) {
                const { views, layers, boundingBox, colorScales, numLoadingLayers, errorMessages } =
                    this.makeRecursively(child.getGroupDelegate(), numCollectedLayers + collectedLayers.length);

                collectedErrorMessages.push(...errorMessages);
                collectedNumLoadingLayers += numLoadingLayers;
                maybeApplyBoundingBox(boundingBox);

                if (child instanceof View) {
                    const view: VisualizationView<TTarget> = {
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

                if (child.getLayerDelegate().getStatus() === LayerStatus.ERROR) {
                    const error = child.getLayerDelegate().getError();
                    if (error) {
                        collectedErrorMessages.push(error);
                    }
                    continue;
                }

                if (child.getLayerDelegate().getData() === null) {
                    continue;
                }

                const colorScale = this.findColorScale(child);

                const layer = this.makeLayer(child, colorScale?.colorScale ?? undefined);

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

    private makeLayer(layer: Layer<any, any>, colorScale?: ColorScaleWithName): TargetReturnTypes[TTarget] {
        const func = this._visualizationFunctions.get(layer.constructor.name);
        if (!func) {
            throw new Error(`No visualization function found for layer ${layer.constructor.name}`);
        }

        if (colorScale === undefined) {
            colorScale = new ColorScaleWithName({
                colorPalette: defaultColorPalettes[0],
                gradientType: ColorScaleGradientType.Sequential,
                name: "Default",
                type: ColorScaleType.Continuous,
                steps: 10,
            });
        }

        return func({
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            data: layer.getLayerDelegate().getData(),
            colorScale,
            settings: layer.getLayerDelegate().getSettingsContext().getDelegate().getValues(),
            isLoading: layer.getLayerDelegate().getStatus() === LayerStatus.LOADING,
            predictedNextBoundingBox: layer.getLayerDelegate().getPredictedBoundingBox(),
        });
    }

    private makeNewBoundingBox(newBoundingBox: BoundingBox, oldBoundingBox: BoundingBox): BoundingBox {
        return {
            x: [Math.min(newBoundingBox.x[0], oldBoundingBox.x[0]), Math.max(newBoundingBox.x[1], oldBoundingBox.x[1])],
            y: [Math.min(newBoundingBox.y[0], oldBoundingBox.y[0]), Math.max(newBoundingBox.y[1], oldBoundingBox.y[1])],
            z: [Math.min(newBoundingBox.z[0], oldBoundingBox.z[0]), Math.max(newBoundingBox.z[1], oldBoundingBox.z[1])],
        };
    }

    private findColorScale(layer: Layer<any, any>): { id: string; colorScale: ColorScaleWithName } | null {
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
}

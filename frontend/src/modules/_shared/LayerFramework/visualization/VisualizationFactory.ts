import { Layer as DeckGlLayer } from "@deck.gl/core";
import { Layer as EsvLayer } from "@equinor/esv-intersection";
import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { defaultColorPalettes, defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import * as bbox from "@lib/utils/bbox";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

import { GroupDelegate } from "../delegates/GroupDelegate";
import { ColorScale } from "../framework/ColorScale/ColorScale";
import { DataLayer, LayerStatus } from "../framework/DataLayer/DataLayer";
import { DataLayerManager } from "../framework/DataLayerManager/DataLayerManager";
import { DeltaSurface } from "../framework/DeltaSurface/DeltaSurface";
import { Group } from "../framework/Group/Group";
import {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    LayerColoringType,
    Settings,
    instanceofItemGroup,
} from "../interfaces";

export enum VisualizationTarget {
    DECK_GL = "deck_gl",
    ESV = "esv",
    // VIDEX = "videx",
}

export type VisualizationFunctionArgs<TSettings extends Settings, TData> = DataLayerInformationAccessors<
    TSettings,
    TData
> & {
    id: string;
    name: string;
    colorScale: ColorScaleWithName;
    isLoading: boolean;
};

export type TargetReturnTypes = {
    [VisualizationTarget.DECK_GL]: DeckGlLayer<any>;
    [VisualizationTarget.ESV]: EsvLayer<any>;
};

export type MakeLayerBoundingBoxFunctionArgs<TSettings extends Settings, TData> = DataLayerInformationAccessors<
    TSettings,
    TData
>;

export type MakeVisualizationFunction<TSettingTypes extends Settings, TData, TTarget extends VisualizationTarget> = (
    args: VisualizationFunctionArgs<TSettingTypes, TData>
) => TargetReturnTypes[TTarget] | null;

export type MakeLayerBoundingBoxFunction<TSettings extends Settings, TData> = (
    args: MakeLayerBoundingBoxFunctionArgs<TSettings, TData>
) => bbox.BBox | null;

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
    combinedBoundingBox: bbox.BBox | null;
    colorScales: ColorScaleWithId[];
    numLoadingLayers: number;
};

export class VisualizationFactory<TTarget extends VisualizationTarget> {
    private _visualizationFunctions: Map<string, MakeVisualizationFunction<any, any, TTarget>> = new Map();
    private _layerBoundingBoxCalculationFunctions: Map<string, MakeLayerBoundingBoxFunction<any, any>> = new Map();

    registerLayerFunctions<TSettingTypes extends Settings, TData>(
        layerName: string,
        layerCtor: {
            new (...params: any[]): CustomDataLayerImplementation<TSettingTypes, TData, any>;
        },
        funcs: {
            visualizationFunction: MakeVisualizationFunction<TSettingTypes, TData, TTarget>;
            boundingBoxCalculationFunction?: MakeLayerBoundingBoxFunction<TSettingTypes, TData>;
        }
    ): void {
        if (this._visualizationFunctions.has(layerCtor.name)) {
            throw new Error(`Visualization function for layer ${layerCtor.name} already registered`);
        }
        this._visualizationFunctions.set(layerName, funcs.visualizationFunction);

        if (funcs.boundingBoxCalculationFunction) {
            this._layerBoundingBoxCalculationFunctions.set(layerName, funcs.boundingBoxCalculationFunction);
        }
    }

    make(layerManager: DataLayerManager): FactoryProduct<TTarget> {
        return this.makeRecursively(layerManager.getGroupDelegate());
    }

    private makeRecursively(groupDelegate: GroupDelegate, numCollectedLayers: number = 0): FactoryProduct<TTarget> {
        const collectedViews: VisualizationView<TTarget>[] = [];
        const collectedLayers: LayerWithPosition<TTarget>[] = [];
        const collectedColorScales: ColorScaleWithId[] = [];
        const collectedErrorMessages: (StatusMessage | string)[] = [];
        let collectedNumLoadingLayers = 0;
        let globalBoundingBox: bbox.BBox | null = null;

        const children = groupDelegate.getChildren();

        const maybeApplyBoundingBox = (boundingBox: bbox.BBox | null) => {
            if (boundingBox) {
                globalBoundingBox =
                    globalBoundingBox === null ? boundingBox : bbox.combine(boundingBox, globalBoundingBox);
            }
        };

        for (const child of children) {
            if (!child.getItemDelegate().isVisible()) {
                continue;
            }

            if (instanceofItemGroup(child) && !(child instanceof DeltaSurface)) {
                const {
                    views,
                    layers,
                    combinedBoundingBox: boundingBox,
                    colorScales,
                    numLoadingLayers,
                    errorMessages,
                } = this.makeRecursively(child.getGroupDelegate(), numCollectedLayers + collectedLayers.length);

                collectedErrorMessages.push(...errorMessages);
                collectedNumLoadingLayers += numLoadingLayers;
                maybeApplyBoundingBox(boundingBox);

                if (child instanceof Group) {
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

            if (child instanceof DataLayer) {
                if (child.getStatus() === LayerStatus.LOADING) {
                    collectedNumLoadingLayers++;
                }

                if (child.getStatus() === LayerStatus.ERROR) {
                    const error = child.getError();
                    if (error) {
                        collectedErrorMessages.push(error);
                    }
                    continue;
                }

                if (child.getData() === null) {
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

                const layerBoundingBox = this.makeLayerBoundingBox(child);
                maybeApplyBoundingBox(layerBoundingBox);
                collectedLayers.push({ layer, position: numCollectedLayers + collectedLayers.length });
            }
        }

        return {
            views: collectedViews,
            layers: collectedLayers,
            errorMessages: collectedErrorMessages,
            combinedBoundingBox: globalBoundingBox,
            colorScales: collectedColorScales,
            numLoadingLayers: collectedNumLoadingLayers,
        };
    }

    private makeLayer(
        layer: DataLayer<any, any, any>,
        colorScale?: ColorScaleWithName
    ): TargetReturnTypes[TTarget] | null {
        const func = this._visualizationFunctions.get(layer.getType());
        if (!func) {
            throw new Error(`No visualization function found for layer ${layer.getType()}`);
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
            colorScale,
            isLoading: layer.getStatus() === LayerStatus.LOADING,
            ...layer.makeAccessors(),
        });
    }

    private makeLayerBoundingBox(layer: DataLayer<any, any, any>): bbox.BBox | null {
        const func = this._layerBoundingBoxCalculationFunctions.get(layer.getType());
        if (!func) {
            return null;
        }

        return func(layer.makeAccessors());
    }

    private findColorScale(layer: DataLayer<any, any, any>): { id: string; colorScale: ColorScaleWithName } | null {
        if (layer.getColoringType() !== LayerColoringType.COLORSCALE) {
            return null;
        }

        let colorScaleWithName = new ColorScaleWithName({
            colorPalette: defaultContinuousSequentialColorPalettes[0],
            gradientType: ColorScaleGradientType.Sequential,
            name: layer.getItemDelegate().getName(),
            type: ColorScaleType.Continuous,
            steps: 10,
        });

        const range = layer.getValueRange();
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
                    const range = layer.getValueRange();
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

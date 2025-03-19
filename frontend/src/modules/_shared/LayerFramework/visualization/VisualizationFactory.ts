import { Layer as DeckGlLayer } from "@deck.gl/core";
import { Layer as EsvLayer } from "@equinor/esv-intersection";
import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import * as bbox from "@lib/utils/bbox";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";

import { GroupDelegate } from "../delegates/GroupDelegate";
import { DataLayer, LayerStatus } from "../framework/DataLayer/DataLayer";
import { DataLayerManager } from "../framework/DataLayerManager/DataLayerManager";
import { DeltaSurface } from "../framework/DeltaSurface/DeltaSurface";
import { Group } from "../framework/Group/Group";
import {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
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

export type MakeAnnotationsFunctionArgs<TSettings extends Settings, TData> = DataLayerInformationAccessors<
    TSettings,
    TData
> & {
    id: string;
    name: string;
};

export type Annotation = ColorScaleWithId; // Add more possible annotation types here, e.g. ColorSets etc.

export type LayerVisualizationFunctions<TSettings extends Settings, TData, TTarget extends VisualizationTarget> = {
    visualizationFunction: MakeVisualizationFunction<TSettings, TData, TTarget>;
    boundingBoxCalculationFunction?: MakeLayerBoundingBoxFunction<TSettings, TData>;
    makeAnnotationsFunction?: MakeAnnotationsFunction<TSettings, TData>;
    hoverVisualizationFunction?: MakeVisualizationFunction<TSettings, TData, TTarget>;
};

export type MakeVisualizationFunction<TSettingTypes extends Settings, TData, TTarget extends VisualizationTarget> = (
    args: VisualizationFunctionArgs<TSettingTypes, TData>
) => TargetReturnTypes[TTarget] | null;

export type MakeLayerBoundingBoxFunction<TSettings extends Settings, TData> = (
    args: MakeLayerBoundingBoxFunctionArgs<TSettings, TData>
) => bbox.BBox | null;

export type MakeAnnotationsFunction<TSettings extends Settings, TData> = (
    args: MakeAnnotationsFunctionArgs<TSettings, TData>
) => Annotation[];

export type LayerWithPosition<TTarget extends VisualizationTarget> = {
    layer: TargetReturnTypes[TTarget];
    position: number;
};

export type VisualizationView<TTarget extends VisualizationTarget> = {
    id: string;
    color: string | null;
    name: string;
    layers: LayerWithPosition<TTarget>[];
    annotations: Annotation[];
};

export type FactoryProduct<TTarget extends VisualizationTarget> = {
    views: VisualizationView<TTarget>[];
    layers: LayerWithPosition<TTarget>[];
    errorMessages: (StatusMessage | string)[];
    combinedBoundingBox: bbox.BBox | null;
    numLoadingLayers: number;
    annotations: Annotation[];
};

export class VisualizationFactory<TTarget extends VisualizationTarget> {
    private _visualizationFunctions: Map<string, LayerVisualizationFunctions<any, any, TTarget>> = new Map();

    registerLayerFunctions<TSettings extends Settings, TData>(
        layerName: string,
        layerCtor: {
            new (...params: any[]): CustomDataLayerImplementation<TSettings, TData, any>;
        },
        funcs: LayerVisualizationFunctions<TSettings, TData, TTarget>
    ): void {
        if (this._visualizationFunctions.has(layerCtor.name)) {
            throw new Error(`Visualization function for layer ${layerCtor.name} already registered`);
        }
        this._visualizationFunctions.set(layerName, funcs);
    }

    make(layerManager: DataLayerManager): FactoryProduct<TTarget> {
        return this.makeRecursively(layerManager.getGroupDelegate());
    }

    private makeRecursively(groupDelegate: GroupDelegate, numCollectedLayers: number = 0): FactoryProduct<TTarget> {
        const collectedViews: VisualizationView<TTarget>[] = [];
        const collectedLayers: LayerWithPosition<TTarget>[] = [];
        const collectedAnnotations: Annotation[] = [];
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
                    numLoadingLayers,
                    errorMessages,
                    annotations,
                } = this.makeRecursively(child.getGroupDelegate(), numCollectedLayers + collectedLayers.length);

                collectedErrorMessages.push(...errorMessages);
                collectedNumLoadingLayers += numLoadingLayers;
                maybeApplyBoundingBox(boundingBox);

                if (child instanceof Group) {
                    const view: VisualizationView<TTarget> = {
                        id: child.getItemDelegate().getId(),
                        color: child.getGroupDelegate().getColor(),
                        name: child.getItemDelegate().getName(),
                        layers,
                        annotations,
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

                const layer = this.makeLayer(child);

                if (!layer) {
                    continue;
                }

                const layerBoundingBox = this.makeLayerBoundingBox(child);
                maybeApplyBoundingBox(layerBoundingBox);
                collectedLayers.push({ layer, position: numCollectedLayers + collectedLayers.length });
                collectedAnnotations.push(...this.makeLayerAnnotations(child));
            }
        }

        return {
            views: collectedViews,
            layers: collectedLayers,
            errorMessages: collectedErrorMessages,
            combinedBoundingBox: globalBoundingBox,
            annotations: collectedAnnotations,
            numLoadingLayers: collectedNumLoadingLayers,
        };
    }

    private makeLayer(layer: DataLayer<any, any, any>): TargetReturnTypes[TTarget] | null {
        const func = this._visualizationFunctions.get(layer.getType())?.visualizationFunction;
        if (!func) {
            throw new Error(`No visualization function found for layer ${layer.getType()}`);
        }

        return func({
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            isLoading: layer.getStatus() === LayerStatus.LOADING,
            ...layer.makeAccessors(),
        });
    }

    private makeLayerBoundingBox(layer: DataLayer<any, any, any>): bbox.BBox | null {
        const func = this._visualizationFunctions.get(layer.getType())?.boundingBoxCalculationFunction;
        if (!func) {
            return null;
        }

        return func(layer.makeAccessors());
    }

    private makeLayerAnnotations(layer: DataLayer<any, any, any>): Annotation[] {
        const func = this._visualizationFunctions.get(layer.getType())?.makeAnnotationsFunction;
        if (!func) {
            return [];
        }

        return func({
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            ...layer.makeAccessors(),
        });
    }
}

import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { Layer as EsvLayer } from "@equinor/esv-intersection";
import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import * as bbox from "@lib/utils/bbox";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";

import type { GroupDelegate } from "../delegates/GroupDelegate";
import { DataLayer, DataLayerStatus } from "../framework/DataLayer/DataLayer";
import type { DataLayerManager } from "../framework/DataLayerManager/DataLayerManager";
import { DeltaSurface } from "../framework/DeltaSurface/DeltaSurface";
import { Group } from "../framework/Group/Group";
import type {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
} from "../interfacesAndTypes/customDataLayerImplementation";
import { instanceofItemGroup } from "../interfacesAndTypes/entitites";
import type { Settings } from "../settings/settingsDefinitions";

export enum VisualizationTarget {
    DECK_GL = "deck_gl",
    ESV = "esv",
    // VIDEX = "videx",
}

export type FactoryFunctionArgs<
    TSettings extends Settings,
    TData,
    TInjectedData extends Record<string, any> = never,
> = DataLayerInformationAccessors<TSettings, TData> & {
    id: string;
    name: string;
    isLoading: boolean;
    getInjectedData: () => TInjectedData;
};

export type TargetReturnTypes = {
    [VisualizationTarget.DECK_GL]: DeckGlLayer<any>;
    [VisualizationTarget.ESV]: EsvLayer<any>;
};

export type Annotation = ColorScaleWithId; // Add more possible annotation types here, e.g. ColorSets etc.

export type LayerVisualizationFunctions<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TInjectedData extends Record<string, any> = never,
    TAccumulatedData extends Record<string, any> = never,
> = {
    makeVisualizationFunction: MakeVisualizationFunction<TSettings, TData, TTarget, TInjectedData>;
    calculateBoundingBoxFunction?: CalculateBoundingBoxFunction<TSettings, TData, TInjectedData>;
    makeAnnotationsFunction?: MakeAnnotationsFunction<TSettings, TData, TInjectedData>;
    makeHoverVisualizationFunction?: MakeVisualizationFunction<TSettings, TData, TTarget, TInjectedData>;
    reduceAccumulatedDataFunction?: ReduceAccumulatedDataFunction<TSettings, TData, TAccumulatedData, TInjectedData>;
};

export type MakeVisualizationFunction<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TInjectedData extends Record<string, any> = never,
> = (args: FactoryFunctionArgs<TSettings, TData, TInjectedData>) => TargetReturnTypes[TTarget] | null;

export type CalculateBoundingBoxFunction<
    TSettings extends Settings,
    TData,
    TInjectedData extends Record<string, any> = never,
> = (args: FactoryFunctionArgs<TSettings, TData, TInjectedData>) => bbox.BBox | null;

export type MakeAnnotationsFunction<
    TSettings extends Settings,
    TData,
    TInjectedData extends Record<string, any> = never,
> = (args: FactoryFunctionArgs<TSettings, TData, TInjectedData>) => Annotation[];

export type ReduceAccumulatedDataFunction<
    TSettings extends Settings,
    TData,
    TAccumulatedData,
    TInjectedData extends Record<string, any> = never,
> = (accumulatedData: TAccumulatedData, args: FactoryFunctionArgs<TSettings, TData, TInjectedData>) => TAccumulatedData;

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

export type FactoryProduct<
    TTarget extends VisualizationTarget,
    TAccumulatedData extends Record<string, any> = never,
> = {
    views: VisualizationView<TTarget>[];
    layers: LayerWithPosition<TTarget>[];
    errorMessages: (StatusMessage | string)[];
    combinedBoundingBox: bbox.BBox | null;
    numLoadingLayers: number;
    annotations: Annotation[];
    accumulatedData: TAccumulatedData;
};

export class VisualizationFactory<
    TTarget extends VisualizationTarget,
    TInjectedData extends Record<string, any> = never,
    TAccumulatedData extends Record<string, any> = never,
> {
    private _visualizationFunctions: Map<
        string,
        LayerVisualizationFunctions<any, any, TTarget, TInjectedData, TAccumulatedData>
    > = new Map();

    registerLayerFunctions<TSettings extends Settings, TData>(
        layerName: string,
        layerCtor: {
            new (...params: any[]): CustomDataLayerImplementation<TSettings, TData, any>;
        },
        funcs: LayerVisualizationFunctions<TSettings, TData, TTarget, TInjectedData, TAccumulatedData>,
    ): void {
        if (this._visualizationFunctions.has(layerCtor.name)) {
            throw new Error(`Visualization function for layer ${layerCtor.name} already registered`);
        }
        this._visualizationFunctions.set(layerName, funcs);
    }

    make(
        layerManager: DataLayerManager,
        options?: {
            injectedData?: TInjectedData;
            initialAccumulatedData?: TAccumulatedData;
        },
    ): FactoryProduct<TTarget, TAccumulatedData> {
        return this.makeRecursively(
            layerManager.getGroupDelegate(),
            options?.initialAccumulatedData ?? ({} as TAccumulatedData),
            options?.injectedData,
        );
    }

    private makeRecursively(
        groupDelegate: GroupDelegate,
        accumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
        numCollectedLayers: number = 0,
    ): FactoryProduct<TTarget, TAccumulatedData> {
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
                    accumulatedData: newAccumulatedData,
                } = this.makeRecursively(
                    child.getGroupDelegate(),
                    accumulatedData,
                    injectedData,
                    numCollectedLayers + collectedLayers.length,
                );

                accumulatedData = newAccumulatedData;

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
                if (child.getStatus() === DataLayerStatus.LOADING) {
                    collectedNumLoadingLayers++;
                }

                if (child.getStatus() === DataLayerStatus.ERROR) {
                    const error = child.getError();
                    if (error) {
                        collectedErrorMessages.push(error);
                    }
                    continue;
                }

                if (child.getData() === null) {
                    continue;
                }

                const layer = this.makeLayer(child, injectedData);

                if (!layer) {
                    continue;
                }

                const layerBoundingBox = this.makeLayerBoundingBox(child);
                maybeApplyBoundingBox(layerBoundingBox);
                collectedLayers.push({ layer, position: numCollectedLayers + collectedLayers.length });
                collectedAnnotations.push(...this.makeLayerAnnotations(child));
                accumulatedData = this.accumulateLayerData(child, accumulatedData) ?? accumulatedData;
            }
        }

        return {
            views: collectedViews,
            layers: collectedLayers,
            errorMessages: collectedErrorMessages,
            combinedBoundingBox: globalBoundingBox,
            annotations: collectedAnnotations,
            numLoadingLayers: collectedNumLoadingLayers,
            accumulatedData,
        };
    }

    private makeFactoryFunctionArgs<TSettings extends Settings, TData>(
        layer: DataLayer<TSettings, TData, any>,
        injectedData?: TInjectedData,
    ): FactoryFunctionArgs<TSettings, TData, TInjectedData> {
        function getInjectedData() {
            if (!injectedData) {
                throw new Error("No injected data provided. Did you forget to pass it to the factory?");
            }
            return injectedData;
        }

        return {
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            isLoading: layer.getStatus() === DataLayerStatus.LOADING,
            getInjectedData: getInjectedData.bind(this),
            ...layer.makeAccessors(),
        };
    }

    private makeLayer(
        layer: DataLayer<any, any, any>,
        injectedData?: TInjectedData,
    ): TargetReturnTypes[TTarget] | null {
        const func = this._visualizationFunctions.get(layer.getType())?.makeVisualizationFunction;
        if (!func) {
            throw new Error(`No visualization function found for layer ${layer.getType()}`);
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private makeLayerBoundingBox(layer: DataLayer<any, any, any>, injectedData?: TInjectedData): bbox.BBox | null {
        const func = this._visualizationFunctions.get(layer.getType())?.calculateBoundingBoxFunction;
        if (!func) {
            return null;
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private makeLayerAnnotations(layer: DataLayer<any, any, any>, injectedData?: TInjectedData): Annotation[] {
        const func = this._visualizationFunctions.get(layer.getType())?.makeAnnotationsFunction;
        if (!func) {
            return [];
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private accumulateLayerData(
        layer: DataLayer<any, any, any>,
        accumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
    ): TAccumulatedData | null {
        const func = this._visualizationFunctions.get(layer.getType())?.reduceAccumulatedDataFunction;
        if (!func) {
            return null;
        }

        return func(accumulatedData, this.makeFactoryFunctionArgs(layer, injectedData));
    }
}

import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { Layer as EsvLayer } from "@equinor/esv-intersection";
import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import type { GlobalTopicDefinitions } from "@framework/WorkbenchServices";
import * as bbox from "@lib/utils/bbox";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";

import type { GroupDelegate } from "../delegates/GroupDelegate";
import { DataProvider, DataProviderStatus } from "../framework/DataProvider/DataProvider";
import type { DataProviderManager } from "../framework/DataProviderManager/DataProviderManager";
import { DeltaSurface } from "../framework/DeltaSurface/DeltaSurface";
import { Group } from "../framework/Group/Group";
import type { GroupType } from "../groups/groupTypes";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
} from "../interfacesAndTypes/customDataProviderImplementation";
import type {
    CustomGroupImplementation,
    CustomGroupImplementationWithSettings,
} from "../interfacesAndTypes/customGroupImplementation";
import { instanceofItemGroup } from "../interfacesAndTypes/entities";
import type { StoredData } from "../interfacesAndTypes/sharedTypes";
import type { SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { IntersectionSettingValue } from "../settings/implementations/IntersectionSetting";
import type { SettingTypes, Settings } from "../settings/settingsDefinitions";

export enum VisualizationTarget {
    DECK_GL = "deck_gl",
    ESV = "esv",
    // VIDEX = "videx",
}

export type FactoryFunctionArgs<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = DataProviderInformationAccessors<TSettings, TData, TStoredData> & {
    id: string;
    name: string;
    isLoading: boolean;
    getInjectedData: () => TInjectedData;
    getValueRange: () => [number, number] | null;
};

export type VisualizationGroupBasic<TTarget extends VisualizationTarget> = {
    id: string;
    color: string | null;
    name: string;
    children: LayerWithPosition<TTarget>[];
    annotations: Annotation[];
};

export type EsvView = {
    intersection: IntersectionSettingValue;
    extensionLength: number;
};

export type TargetViewReturnTypes = {
    [VisualizationTarget.DECK_GL]: Record<string, never>;
    [VisualizationTarget.ESV]: EsvView;
};

export interface ViewDataCollectorFunction<
    TSettings extends Settings,
    TGroupKey extends keyof TCustomGroupProps,
    TCustomGroupProps extends Record<GroupType, Record<string, any>> = Record<string, never>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    (args: {
        id: string;
        name: string;
        getSetting: <TKey extends TSettingKey>(setting: TKey) => SettingTypes[TKey];
    }): TCustomGroupProps[TGroupKey];
}

export type TargetDataLayerReturnTypes = {
    [VisualizationTarget.DECK_GL]: DeckGlLayer<any>;
    [VisualizationTarget.ESV]: EsvLayer<any>;
};

export type Annotation = ColorScaleWithId; // Add more possible annotation types here, e.g. ColorSets etc.

export type DataProviderVisualizationFunctions<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
    TAccumulatedData extends Record<string, any> = never,
> = {
    makeVisualizationFunction: MakeVisualizationFunction<TSettings, TData, TTarget, TStoredData, TInjectedData>;
    calculateBoundingBoxFunction?: CalculateBoundingBoxFunction<TSettings, TData, TStoredData, TInjectedData>;
    makeAnnotationsFunction?: MakeAnnotationsFunction<TSettings, TData, TStoredData, TInjectedData>;
    makeHoverVisualizationFunction?: MakeHoverVisualizationFunction<
        TSettings,
        TData,
        TTarget,
        TStoredData,
        TInjectedData
    >;
    reduceAccumulatedDataFunction?: ReduceAccumulatedDataFunction<
        TSettings,
        TData,
        TAccumulatedData,
        TStoredData,
        TInjectedData
    >;
};

export type MakeVisualizationFunction<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (
    args: FactoryFunctionArgs<TSettings, TData, TStoredData, TInjectedData>,
) => TargetDataLayerReturnTypes[TTarget] | null;

// This does likely require a refactor as soon as we have tested against a use case
export type MakeHoverVisualizationFunction<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (
    args: FactoryFunctionArgs<TSettings, TData, TStoredData, TInjectedData> & {
        hoverInfo: Partial<GlobalTopicDefinitions>;
    },
) => TargetDataLayerReturnTypes[TTarget][];

export type CalculateBoundingBoxFunction<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (args: FactoryFunctionArgs<TSettings, TData, TStoredData, TInjectedData>) => bbox.BBox | null;

export type MakeAnnotationsFunction<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (args: FactoryFunctionArgs<TSettings, TData, TStoredData, TInjectedData>) => Annotation[];

export type ReduceAccumulatedDataFunction<
    TSettings extends Settings,
    TData,
    TAccumulatedData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (
    accumulatedData: TAccumulatedData,
    args: FactoryFunctionArgs<TSettings, TData, TStoredData, TInjectedData>,
) => TAccumulatedData;

export type FactoryProduct<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends Record<GroupType, Record<string, any>> = Record<string, never>,
    TAccumulatedData extends Record<string, any> = never,
> = {
    groups: (VisualizationGroupBasic<TTarget> & TargetViewReturnTypes[TTarget])[];
    dataLayers: TargetViewReturnTypes<TTarget>[];
    aggregatedErrorMessages: (StatusMessage | string)[];
    combinedBoundingBox: bbox.BBox | null;
    numLoadingDataLayers: number;
    annotations: Annotation[];
    accumulatedData: TAccumulatedData;
    makeHoverVisualizationsFunction: (
        hoverInfo: Partial<GlobalTopicDefinitions>,
    ) => TargetDataLayerReturnTypes[TTarget][];
};

export class VisualizationAssembler<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends Record<GroupType, Record<string, any>> = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
    TAccumulatedData extends Record<string, any> = never,
> {
    private _visualizationFunctions: Map<
        string,
        DataProviderVisualizationFunctions<any, any, TTarget, any, TInjectedData, TAccumulatedData>
    > = new Map();

    private _groupDataCollectors: Map<keyof TCustomGroupProps, ViewDataCollectorFunction<any, any, TCustomGroupProps>> =
        new Map();

    registerLayerFunctions<TSettings extends Settings, TData, TStoredData extends StoredData = Record<string, never>>(
        layerName: string,
        layerCtor: {
            new (...params: any[]): CustomDataProviderImplementation<TSettings, TData, TStoredData>;
        },
        funcs: DataProviderVisualizationFunctions<
            TSettings,
            TData,
            TTarget,
            TStoredData,
            TInjectedData,
            TAccumulatedData
        >,
    ): void {
        if (this._visualizationFunctions.has(layerCtor.name)) {
            throw new Error(`Visualization function for layer ${layerCtor.name} already registered`);
        }
        this._visualizationFunctions.set(layerName, funcs);
    }

    registerGroupDataCollector<TSettings extends Settings, TGroupType extends keyof TCustomGroupProps>(
        viewName: TGroupType,
        viewCtor: {
            new (...params: any[]): CustomGroupImplementation | CustomGroupImplementationWithSettings<TSettings>;
        },
        collector: ViewDataCollectorFunction<TSettings, TGroupType, TCustomGroupProps>,
    ): void {
        if (this._visualizationFunctions.has(viewCtor.name)) {
            throw new Error(`Visualization function for view ${viewCtor.name} already registered`);
        }
        this._groupDataCollectors.set(viewName, collector);
    }

    make(
        layerManager: DataProviderManager,
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
        const collectedViews: (VisualizationGroupBasic<TTarget> & TargetViewReturnTypes[TTarget])[] = [];
        const collectedLayers: LayerWithPosition<TTarget>[] = [];
        const collectedAnnotations: Annotation[] = [];
        const collectedErrorMessages: (StatusMessage | string)[] = [];
        const collectedMakeHoverVisualizationFunctions: ((
            hoverInfo: Partial<GlobalTopicDefinitions>,
        ) => TargetDataLayerReturnTypes[TTarget][])[] = [];
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
                    groups: views,
                    dataLayers: layers,
                    combinedBoundingBox: boundingBox,
                    numLoadingDataLayers: numLoadingLayers,
                    aggregatedErrorMessages: errorMessages,
                    annotations,
                    accumulatedData: newAccumulatedData,
                    makeHoverVisualizationsFunction,
                } = this.makeRecursively(
                    child.getGroupDelegate(),
                    accumulatedData,
                    injectedData,
                    numCollectedLayers + collectedLayers.length,
                );

                accumulatedData = newAccumulatedData;

                collectedErrorMessages.push(...errorMessages);
                collectedMakeHoverVisualizationFunctions.push(makeHoverVisualizationsFunction);
                collectedNumLoadingLayers += numLoadingLayers;
                maybeApplyBoundingBox(boundingBox);

                if (child instanceof Group) {
                    const view = this.makeView(child, layers, annotations);

                    collectedViews.push(view);
                    continue;
                }

                collectedLayers.push(...layers);
                collectedViews.push(...views);
            }

            if (child instanceof DataProvider) {
                if (child.getStatus() === DataProviderStatus.LOADING) {
                    collectedNumLoadingLayers++;
                }

                if (child.getStatus() === DataProviderStatus.ERROR) {
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
                collectedMakeHoverVisualizationFunctions.push(this.makeHoverLayerFunction(child, injectedData));
                accumulatedData = this.accumulateLayerData(child, accumulatedData) ?? accumulatedData;
            }
        }

        return {
            groups: collectedViews,
            dataLayers: collectedLayers,
            aggregatedErrorMessages: collectedErrorMessages,
            combinedBoundingBox: globalBoundingBox,
            annotations: collectedAnnotations,
            numLoadingDataLayers: collectedNumLoadingLayers,
            accumulatedData,
            makeHoverVisualizationsFunction: (hoverInfo: Partial<GlobalTopicDefinitions>) => {
                const collectedHoverVisualizations: TargetDataLayerReturnTypes[TTarget][] = [];
                for (const makeHoverVisualizationFunction of collectedMakeHoverVisualizationFunctions) {
                    collectedHoverVisualizations.push(...makeHoverVisualizationFunction(hoverInfo));
                }
                return collectedHoverVisualizations;
            },
        };
    }

    private makeView<
        TSettings extends Settings,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >(
        group: Group<TSettings>,
        layers: LayerWithPosition<TTarget>[],
        annotations: Annotation[],
    ): VisualizationGroupBasic<TTarget> & TargetViewReturnTypes[TTarget] {
        const func = this._groupDataCollectors.get(group.getGroupType());
        if (!func) {
            throw new Error(
                `No view function provided for group ${group.getGroupType()}. Did you forget to register it?`,
            );
        }

        return {
            id: group.getItemDelegate().getId(),
            color: group.getGroupDelegate().getColor(),
            name: group.getItemDelegate().getName(),
            children: layers,
            annotations,
            ...func({
                id: group.getItemDelegate().getId(),
                name: group.getItemDelegate().getName(),
                getSetting: <TKey extends TSettingKey>(setting: TKey) =>
                    group.getSharedSettingsDelegate()?.getWrappedSettings()[setting].getValue(),
            }),
        };
    }

    private makeFactoryFunctionArgs<
        TSettings extends Settings,
        TData,
        TStoredData extends StoredData = Record<string, never>,
    >(
        layer: DataProvider<TSettings, TData, any>,
        injectedData?: TInjectedData,
    ): FactoryFunctionArgs<TSettings, TData, TStoredData, TInjectedData> {
        function getInjectedData() {
            if (!injectedData) {
                throw new Error("No injected data provided. Did you forget to pass it to the factory?");
            }
            return injectedData;
        }

        return {
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            isLoading: layer.getStatus() === DataProviderStatus.LOADING,
            getInjectedData: getInjectedData.bind(this),
            getValueRange: layer.getValueRange.bind(layer),
            ...layer.makeAccessors(),
        };
    }

    private makeLayer(
        layer: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): TargetDataLayerReturnTypes[TTarget] | null {
        const func = this._visualizationFunctions.get(layer.getType())?.makeVisualizationFunction;
        if (!func) {
            throw new Error(`No visualization function found for layer ${layer.getType()}`);
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private makeHoverLayerFunction(
        layer: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): (hoverInfo: Partial<GlobalTopicDefinitions>) => TargetDataLayerReturnTypes[TTarget][] {
        const func = this._visualizationFunctions.get(layer.getType())?.makeHoverVisualizationFunction;
        if (!func) {
            return () => [];
        }

        return (hoverInfo: Partial<GlobalTopicDefinitions>) => {
            return func({ ...this.makeFactoryFunctionArgs(layer, injectedData), hoverInfo });
        };
    }

    private makeLayerBoundingBox(layer: DataProvider<any, any, any>, injectedData?: TInjectedData): bbox.BBox | null {
        const func = this._visualizationFunctions.get(layer.getType())?.calculateBoundingBoxFunction;
        if (!func) {
            return null;
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private makeLayerAnnotations(layer: DataProvider<any, any, any>, injectedData?: TInjectedData): Annotation[] {
        const func = this._visualizationFunctions.get(layer.getType())?.makeAnnotationsFunction;
        if (!func) {
            return [];
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private accumulateLayerData(
        layer: DataProvider<any, any, any>,
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

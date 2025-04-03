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
import { GroupType } from "../groups/groupTypes";
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

export enum VisualizationItemType {
    DATA_PROVIDER_VISUALIZATION = "data-provider-visualization",
    GROUP = "group",
}

export enum VisualizationTarget {
    DECK_GL = "deck_gl",
    ESV = "esv",
    // VIDEX = "videx",
}

export type DataProviderVisualizationTargetTypes = {
    [VisualizationTarget.DECK_GL]: DeckGlLayer<any>;
    [VisualizationTarget.ESV]: EsvLayer<any>;
};

export type DataProviderVisualization<TTarget extends VisualizationTarget> = {
    itemType: VisualizationItemType.DATA_PROVIDER_VISUALIZATION;
    id: string;
    name: string;
    visualization: DataProviderVisualizationTargetTypes[TTarget];
};

export type TransformerArgs<
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

export type VisualizationGroupMetadata = {
    itemType: VisualizationItemType.GROUP;
    id: string;
    groupType: GroupType | null;
    color: string | null;
    name: string;
};

export interface HoverVisualizationsFunction<TTarget extends VisualizationTarget> {
    (
        hoverInfo: GlobalTopicDefinitions[FilterHoverKeys<GlobalTopicDefinitions>],
    ): DataProviderVisualizationTargetTypes[TTarget][];
}

export type VisualizationGroup<
    TTarget extends VisualizationTarget,
    TAccumulatedData extends Record<string, any> = never,
> = VisualizationGroupMetadata & {
    children: (VisualizationGroup<TTarget, TAccumulatedData> | DataProviderVisualization<TTarget>)[];
    annotations: Annotation[];
    aggregatedErrorMessages: (StatusMessage | string)[];
    combinedBoundingBox: bbox.BBox | null;
    numLoadingDataProviders: number;
    accumulatedData: TAccumulatedData;
    makeHoverVisualizationsFunction: HoverVisualizationsFunction<TTarget>;
};

export type EsvView = {
    intersection: IntersectionSettingValue;
    extensionLength: number;
};

export interface GroupDataCollector<
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

export type Annotation = ColorScaleWithId; // Add more possible annotation types here, e.g. ColorSets etc.

export type DataProviderTransformers<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
    TAccumulatedData extends Record<string, any> = never,
> = {
    transformToVisualization: VisualizationTransformer<TSettings, TData, TTarget, TStoredData, TInjectedData>;
    transformToBoundingBox?: BoundingBoxTransformer<TSettings, TData, TStoredData, TInjectedData>;
    transformToAnnotations?: AnnotationsTransformer<TSettings, TData, TStoredData, TInjectedData>;
    transformToHoverVisualization?: HoverVisualizationTransformer<
        TSettings,
        TData,
        TTarget,
        TStoredData,
        TInjectedData
    >;
    reduceAccumulatedData?: ReduceAccumulatedDataFunction<
        TSettings,
        TData,
        TAccumulatedData,
        TStoredData,
        TInjectedData
    >;
};

export type VisualizationTransformer<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (
    args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>,
) => DataProviderVisualizationTargetTypes[TTarget] | null;

// This does likely require a refactor as soon as we have tested against a use case
export type HoverVisualizationTransformer<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (
    args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>,
    hoverInfo: GlobalTopicDefinitions[FilterHoverKeys<GlobalTopicDefinitions>],
) => DataProviderVisualizationTargetTypes[TTarget][];

export type BoundingBoxTransformer<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>) => bbox.BBox | null;

export type AnnotationsTransformer<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>) => Annotation[];

export type ReduceAccumulatedDataFunction<
    TSettings extends Settings,
    TData,
    TAccumulatedData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
> = (
    accumulatedData: TAccumulatedData,
    args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>,
) => TAccumulatedData;

type FilterHoverKeys<T> = {
    [K in keyof T]: K extends `global.hover${string}` ? K : never;
}[keyof T];

export type AssemblerProduct<
    TTarget extends VisualizationTarget,
    TAccumulatedData extends Record<string, any> = never,
> = Omit<VisualizationGroup<TTarget, TAccumulatedData>, keyof VisualizationGroupMetadata>;

export class VisualizationAssembler<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends Record<GroupType, Record<string, any>> = Record<string, never>,
    TInjectedData extends Record<string, any> = never,
    TAccumulatedData extends Record<string, any> = never,
> {
    private _dataProviderTransformers: Map<
        string,
        DataProviderTransformers<any, any, TTarget, any, TInjectedData, TAccumulatedData>
    > = new Map();

    private _groupDataCollectors: Map<keyof TCustomGroupProps, GroupDataCollector<any, any, TCustomGroupProps>> =
        new Map();

    registerDataProviderTransformers<
        TSettings extends Settings,
        TData,
        TStoredData extends StoredData = Record<string, never>,
    >(
        dataProviderName: string,
        dataProviderCtor: {
            new (...params: any[]): CustomDataProviderImplementation<TSettings, TData, TStoredData>;
        },
        transformers: DataProviderTransformers<TSettings, TData, TTarget, TStoredData, TInjectedData, TAccumulatedData>,
    ): void {
        if (this._dataProviderTransformers.has(dataProviderCtor.name)) {
            throw new Error(`Transformer function for data provider ${dataProviderCtor.name} already registered`);
        }
        this._dataProviderTransformers.set(dataProviderName, transformers);
    }

    registerGroupDataCollector<TSettings extends Settings, TGroupType extends keyof TCustomGroupProps>(
        groupName: TGroupType,
        groupCtor: {
            new (...params: any[]): CustomGroupImplementation | CustomGroupImplementationWithSettings<TSettings>;
        },
        collector: GroupDataCollector<TSettings, TGroupType, TCustomGroupProps>,
    ): void {
        if (this._dataProviderTransformers.has(groupCtor.name)) {
            throw new Error(`Data collector function for group ${groupCtor.name} already registered`);
        }
        this._groupDataCollectors.set(groupName, collector);
    }

    make(
        dataProviderManager: DataProviderManager,
        options?: {
            injectedData?: TInjectedData;
            initialAccumulatedData?: TAccumulatedData;
        },
    ): AssemblerProduct<TTarget, TAccumulatedData> {
        return this.makeRecursively(
            dataProviderManager.getGroupDelegate(),
            options?.initialAccumulatedData ?? ({} as TAccumulatedData),
            options?.injectedData,
        );
    }

    private makeRecursively(
        groupDelegate: GroupDelegate,
        accumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
    ): VisualizationGroup<TTarget, TAccumulatedData> {
        const children: (VisualizationGroup<TTarget, TAccumulatedData> | DataProviderVisualization<TTarget>)[] = [];
        const annotations: Annotation[] = [];
        const aggregatedErrorMessages: (StatusMessage | string)[] = [];
        const hoverVisualizationFunctions: ((
            hoverInfo: GlobalTopicDefinitions[FilterHoverKeys<GlobalTopicDefinitions>],
        ) => DataProviderVisualizationTargetTypes[TTarget][])[] = [];
        let numLoadingDataProviders = 0;
        let combinedBoundingBox: bbox.BBox | null = null;

        const maybeApplyBoundingBox = (boundingBox: bbox.BBox | null) => {
            if (boundingBox) {
                combinedBoundingBox =
                    combinedBoundingBox === null ? boundingBox : bbox.combine(boundingBox, combinedBoundingBox);
            }
        };

        for (const child of groupDelegate.getChildren()) {
            if (!child.getItemDelegate().isVisible()) {
                continue;
            }

            // Skip DeltaSurface for now
            if (child instanceof DeltaSurface) {
                continue;
            }

            if (instanceofItemGroup(child)) {
                const product = this.makeRecursively(child.getGroupDelegate(), accumulatedData, injectedData);

                accumulatedData = product.accumulatedData;
                aggregatedErrorMessages.push(...product.aggregatedErrorMessages);
                hoverVisualizationFunctions.push(product.makeHoverVisualizationsFunction);
                numLoadingDataProviders += product.numLoadingDataProviders;
                maybeApplyBoundingBox(product.combinedBoundingBox);

                if (child instanceof Group) {
                    const group = this.makeGroup(child, product.children, annotations);

                    children.push(group);
                    continue;
                }

                children.push(...product.children);
            }

            if (child instanceof DataProvider) {
                if (child.getStatus() === DataProviderStatus.LOADING) {
                    numLoadingDataProviders++;
                }

                if (child.getStatus() === DataProviderStatus.ERROR) {
                    const error = child.getError();
                    if (error) {
                        aggregatedErrorMessages.push(error);
                    }
                    continue;
                }

                if (child.getData() === null) {
                    continue;
                }

                const dataProviderVisualization = this.makeDataProviderVisualization(child, injectedData);

                if (!dataProviderVisualization) {
                    continue;
                }

                const layerBoundingBox = this.makeDataProviderBoundingBox(child);
                maybeApplyBoundingBox(layerBoundingBox);
                children.push(dataProviderVisualization);
                annotations.push(...this.makeDataProviderAnnotations(child));
                hoverVisualizationFunctions.push(this.makeDataProviderHoverVisualizationsFunction(child, injectedData));
                accumulatedData = this.accumulateDataProviderData(child, accumulatedData) ?? accumulatedData;
            }
        }

        return {
            itemType: VisualizationItemType.GROUP,
            id: "",
            color: null,
            name: "",
            groupType: null,
            children,
            aggregatedErrorMessages: aggregatedErrorMessages,
            combinedBoundingBox: combinedBoundingBox,
            annotations: annotations,
            numLoadingDataProviders: numLoadingDataProviders,
            accumulatedData,
            makeHoverVisualizationsFunction: (
                hoverInfo: GlobalTopicDefinitions[FilterHoverKeys<GlobalTopicDefinitions>],
            ) => {
                const collectedHoverVisualizations: DataProviderVisualizationTargetTypes[TTarget][] = [];
                for (const makeHoverVisualizationFunction of hoverVisualizationFunctions) {
                    collectedHoverVisualizations.push(...makeHoverVisualizationFunction(hoverInfo));
                }
                return collectedHoverVisualizations;
            },
        };
    }

    private makeGroup<
        TSettings extends Settings,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >(
        group: Group<TSettings>,
        children: (VisualizationGroup<TTarget, TAccumulatedData> | DataProviderVisualization<TTarget>)[],
        annotations: Annotation[],
    ): VisualizationGroup<TTarget, TAccumulatedData> & TCustomGroupProps[keyof TCustomGroupProps] {
        const func = this._groupDataCollectors.get(group.getGroupType());
        if (!func) {
            throw new Error(
                `No view function provided for group ${group.getGroupType()}. Did you forget to register it?`,
            );
        }

        return {
            item: VisualizationItemType.GROUP,
            id: group.getItemDelegate().getId(),
            color: group.getGroupDelegate().getColor(),
            name: group.getItemDelegate().getName(),
            groupType: group.getGroupType(),
            children,
            annotations,
            aggregatedErrorMessages: [],
            combinedBoundingBox: null,
            numLoadingDataProviders: 0,
            accumulatedData: {} as TAccumulatedData,
            makeHoverVisualizationsFunction: () => [],
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
    ): TransformerArgs<TSettings, TData, TStoredData, TInjectedData> {
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

    private makeDataProviderVisualization(
        dataProvider: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): DataProviderVisualization<TTarget> | null {
        const func = this._dataProviderTransformers.get(dataProvider.getType())?.transformToVisualization;
        if (!func) {
            throw new Error(`No visualization transformer found for data provider ${dataProvider.getType()}`);
        }

        const visualization = func(this.makeFactoryFunctionArgs(dataProvider, injectedData));
        if (!visualization) {
            return null;
        }

        return {
            itemType: VisualizationItemType.DATA_PROVIDER_VISUALIZATION,
            id: dataProvider.getItemDelegate().getId(),
            name: dataProvider.getItemDelegate().getName(),
            visualization,
        };
    }

    private makeDataProviderHoverVisualizationsFunction(
        layer: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): HoverVisualizationsFunction<TTarget> {
        const func = this._dataProviderTransformers.get(layer.getType())?.transformToHoverVisualization;
        if (!func) {
            return () => [];
        }

        return (hoverInfo: GlobalTopicDefinitions[FilterHoverKeys<GlobalTopicDefinitions>]) => {
            return func({ ...this.makeFactoryFunctionArgs.bind(this)(layer, injectedData) }, hoverInfo);
        };
    }

    private makeDataProviderBoundingBox(
        layer: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): bbox.BBox | null {
        const func = this._dataProviderTransformers.get(layer.getType())?.transformToBoundingBox;
        if (!func) {
            return null;
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private makeDataProviderAnnotations(
        layer: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): Annotation[] {
        const func = this._dataProviderTransformers.get(layer.getType())?.transformToAnnotations;
        if (!func) {
            return [];
        }

        return func(this.makeFactoryFunctionArgs(layer, injectedData));
    }

    private accumulateDataProviderData(
        layer: DataProvider<any, any, any>,
        accumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
    ): TAccumulatedData | null {
        const func = this._dataProviderTransformers.get(layer.getType())?.reduceAccumulatedData;
        if (!func) {
            return null;
        }

        return func(accumulatedData, this.makeFactoryFunctionArgs(layer, injectedData));
    }
}

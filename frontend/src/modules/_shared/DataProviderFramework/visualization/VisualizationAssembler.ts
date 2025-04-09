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

export interface HoverVisualizationsFunction<TTarget extends VisualizationTarget> {
    (
        hoverInfo: GlobalTopicDefinitions[FilterHoverKeys<GlobalTopicDefinitions>],
    ): DataProviderVisualizationTargetTypes[TTarget][];
}

export type VisualizationGroupMetadata<TGroupType extends GroupType> = {
    itemType: VisualizationItemType.GROUP;
    id: string;
    groupType: TGroupType | null;
    color: string | null;
    name: string;
};

export type VisualizationGroup<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TAccumulatedData extends Record<string, any> = never,
    TGroupType extends GroupType = GroupType,
> = VisualizationGroupMetadata<TGroupType> & {
    children: (VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> | DataProviderVisualization<TTarget>)[];
    annotations: Annotation[];
    aggregatedErrorMessages: (StatusMessage | string)[];
    combinedBoundingBox: bbox.BBox | null;
    numLoadingDataProviders: number;
    accumulatedData: TAccumulatedData;
    makeHoverVisualizationsFunction: HoverVisualizationsFunction<TTarget>;
    customProps: TCustomGroupProps[TGroupType];
};

export type GroupPropsCollectorArgs<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> = {
    id: string;
    name: string;
    getSetting: <TKey extends TSettingKey>(setting: TKey) => SettingTypes[TKey];
};

export interface GroupCustomPropsCollector<
    TSettings extends Settings,
    TGroupKey extends keyof TCustomGroupProps,
    TCustomGroupProps extends Record<GroupType, Record<string, any>> = Record<string, never>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    (args: GroupPropsCollectorArgs<TSettings, TSettingKey>): TCustomGroupProps[TGroupKey];
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
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TAccumulatedData extends Record<string, any> = never,
> = Omit<VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData>, keyof VisualizationGroupMetadata<any>>;

export type CustomGroupPropsMap = Record<GroupType, Record<string, any>>;

export class VisualizationAssembler<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TInjectedData extends Record<string, any> = never,
    TAccumulatedData extends Record<string, any> = never,
> {
    private _dataProviderTransformers: Map<
        string,
        DataProviderTransformers<any, any, TTarget, any, TInjectedData, TAccumulatedData>
    > = new Map();

    private _groupCustomPropsCollectors: Map<
        keyof TCustomGroupProps,
        GroupCustomPropsCollector<any, any, TCustomGroupProps>
    > = new Map();

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

    registerGroupCustomPropsCollector<TSettings extends Settings, TGroupType extends keyof TCustomGroupProps>(
        groupName: TGroupType,
        groupCtor: {
            new (...params: any[]): CustomGroupImplementation | CustomGroupImplementationWithSettings<TSettings>;
        },
        collector: GroupCustomPropsCollector<TSettings, TGroupType, TCustomGroupProps>,
    ): void {
        if (this._dataProviderTransformers.has(groupCtor.name)) {
            throw new Error(`Data collector function for group ${groupCtor.name} already registered`);
        }
        this._groupCustomPropsCollectors.set(groupName, collector);
    }

    make(
        dataProviderManager: DataProviderManager,
        options?: {
            injectedData?: TInjectedData;
            initialAccumulatedData?: TAccumulatedData;
        },
    ): AssemblerProduct<TTarget, TCustomGroupProps, TAccumulatedData> {
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
    ): VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> {
        const children: (
            | VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData>
            | DataProviderVisualization<TTarget>
        )[] = [];
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

                const providerBoundingBox = this.makeDataProviderBoundingBox(child);
                maybeApplyBoundingBox(providerBoundingBox);
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
            customProps: {} as TCustomGroupProps,
        };
    }

    private makeGroup<
        TSettings extends Settings,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >(
        group: Group<TSettings>,
        children: (
            | VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData>
            | DataProviderVisualization<TTarget>
        )[],
        annotations: Annotation[],
    ): VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> {
        const func = this._groupCustomPropsCollectors.get(group.getGroupType());

        return {
            itemType: VisualizationItemType.GROUP,
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
            customProps:
                func?.({
                    id: group.getItemDelegate().getId(),
                    name: group.getItemDelegate().getName(),
                    getSetting: <TKey extends TSettingKey>(setting: TKey) =>
                        group.getSharedSettingsDelegate()?.getWrappedSettings()[setting].getValue(),
                }) ?? ({} as TCustomGroupProps),
        };
    }

    private makeFactoryFunctionArgs<
        TSettings extends Settings,
        TData,
        TStoredData extends StoredData = Record<string, never>,
    >(
        dataProvider: DataProvider<TSettings, TData, any>,
        injectedData?: TInjectedData,
    ): TransformerArgs<TSettings, TData, TStoredData, TInjectedData> {
        function getInjectedData() {
            if (!injectedData) {
                throw new Error("No injected data provided. Did you forget to pass it to the factory?");
            }
            return injectedData;
        }

        return {
            id: dataProvider.getItemDelegate().getId(),
            name: dataProvider.getItemDelegate().getName(),
            isLoading: dataProvider.getStatus() === DataProviderStatus.LOADING,
            getInjectedData: getInjectedData.bind(this),
            getValueRange: dataProvider.getValueRange.bind(dataProvider),
            ...dataProvider.makeAccessors(),
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
        dataProvider: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): HoverVisualizationsFunction<TTarget> {
        const func = this._dataProviderTransformers.get(dataProvider.getType())?.transformToHoverVisualization;
        if (!func) {
            return () => [];
        }

        return (hoverInfo: GlobalTopicDefinitions[FilterHoverKeys<GlobalTopicDefinitions>]) => {
            return func({ ...this.makeFactoryFunctionArgs.bind(this)(dataProvider, injectedData) }, hoverInfo);
        };
    }

    private makeDataProviderBoundingBox(
        dataProvider: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): bbox.BBox | null {
        const func = this._dataProviderTransformers.get(dataProvider.getType())?.transformToBoundingBox;
        if (!func) {
            return null;
        }

        return func(this.makeFactoryFunctionArgs(dataProvider, injectedData));
    }

    private makeDataProviderAnnotations(
        dataProvider: DataProvider<any, any, any>,
        injectedData?: TInjectedData,
    ): Annotation[] {
        const func = this._dataProviderTransformers.get(dataProvider.getType())?.transformToAnnotations;
        if (!func) {
            return [];
        }

        return func(this.makeFactoryFunctionArgs(dataProvider, injectedData));
    }

    private accumulateDataProviderData(
        dataProvider: DataProvider<any, any, any>,
        accumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
    ): TAccumulatedData | null {
        const func = this._dataProviderTransformers.get(dataProvider.getType())?.reduceAccumulatedData;
        if (!func) {
            return null;
        }

        return func(accumulatedData, this.makeFactoryFunctionArgs(dataProvider, injectedData));
    }
}

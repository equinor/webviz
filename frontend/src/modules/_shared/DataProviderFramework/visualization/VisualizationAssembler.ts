import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import * as bbox from "@lib/utils/bbox";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { EsvLayer } from "@modules/_shared/components/EsvIntersection";
import type { HighlightItem } from "@modules/_shared/components/EsvIntersection/types";
import type { TemplatePlot } from "@modules/_shared/types/wellLogTemplates";
import type { WellPickDataCollection } from "@modules/_shared/types/wellpicks";

import type { GroupDelegate } from "../delegates/GroupDelegate";
import { DataProvider, DataProviderStatus } from "../framework/DataProvider/DataProvider";
import type { DataProviderManager } from "../framework/DataProviderManager/DataProviderManager";
import { DeltaSurface } from "../framework/DeltaSurface/DeltaSurface";
import { Group } from "../framework/Group/Group";
import type { GroupType } from "../groups/groupTypes";
import type { CustomDataProviderImplementation } from "../interfacesAndTypes/customDataProviderImplementation";
import type {
    CustomGroupImplementation,
    CustomGroupImplementationWithSettings,
} from "../interfacesAndTypes/customGroupImplementation";
import { instanceofItemGroup, type ItemGroup } from "../interfacesAndTypes/entities";
import type { StoredData } from "../interfacesAndTypes/sharedTypes";
import type { SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { Settings } from "../settings/settingsDefinitions";

import { makeTransformerArgs } from "./makeTransformerArgs";
import { type HoverVisualizationFunctions, mergeHoverVisualizationFunctions } from "./mergeHoverVisualizationFunctions";
import { ProviderMemoStore } from "./ProviderMemoStore";
import { type DataProviderObjects, ProviderObjectsCache } from "./ProviderObjectsCache";
import {
    type DataProviderTransformers,
    type GroupCustomPropsCollector,
    type TransformerArgs,
    TransformerRegistry,
} from "./TransformerRegistry";

// Re-exported, as modules import everything for assembling visualizations from here
export type { HoverVisualizationFunction, HoverVisualizationFunctions } from "./mergeHoverVisualizationFunctions";
export type {
    AnnotationsTransformer,
    BoundingBoxTransformer,
    DataProviderTransformers,
    GroupCustomPropsCollector,
    GroupPropsCollectorArgs,
    HoverVisualizationTransformer,
    ReduceAccumulatedDataFunction,
    TransformerArgs,
    VisualizationTransformer,
} from "./TransformerRegistry";

export enum VisualizationItemType {
    DATA_PROVIDER_VISUALIZATION = "data-provider-visualization",
    GROUP = "group",
}

export enum VisualizationTarget {
    DECK_GL = "deck_gl",
    ESV = "esv",
    WSC_WELL_LOG = "wsc_well_log",
}

export interface EsvLayerItemsMaker {
    makeLayerItems: (intersectionReferenceSystem: IntersectionReferenceSystem | null, order: number) => EsvLayer[];
}

export type DataProviderVisualizationTargetTypes = {
    [VisualizationTarget.DECK_GL]: DeckGlLayer<any>;
    [VisualizationTarget.ESV]: EsvLayerItemsMaker;
    [VisualizationTarget.WSC_WELL_LOG]: TemplatePlot | WellPickDataCollection;
};

export type DataProviderHoverVisualizationTargetTypes = {
    [VisualizationTarget.DECK_GL]: DeckGlLayer<any>;
    [VisualizationTarget.ESV]: HighlightItem;
    [VisualizationTarget.WSC_WELL_LOG]: null;
};

export type DataProviderVisualization<
    TTarget extends VisualizationTarget,
    TVisualization extends DataProviderVisualizationTargetTypes[TTarget] =
        DataProviderVisualizationTargetTypes[TTarget],
> = {
    itemType: VisualizationItemType.DATA_PROVIDER_VISUALIZATION;
    id: string;
    name: string;
    type: string;
    visualization: TVisualization;
};

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
    TAccumulatedData extends Record<string, any> = Record<string, never>,
    TGroupType extends GroupType = GroupType,
> = VisualizationGroupMetadata<TGroupType> & {
    children: (VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> | DataProviderVisualization<TTarget>)[];
    annotations: Annotation[];
    aggregatedErrorMessages: (StatusMessage | string)[];
    allItemIds: Set<string>;
    combinedBoundingBox: bbox.BBox | null;
    numLoadingDataProviders: number;
    numDataProviders: number;
    // While a state is being restored, the product may not reflect it yet - e.g. it can still be the one made from the
    // empty tree before, as products are only made anew once restoring has finished
    isRestoringState: boolean;
    accumulatedData: TAccumulatedData;
    hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget>;
    customProps: TCustomGroupProps[TGroupType];
};

/*
 * Whether the data of a product (or a group in it) is still on its way - use this rather than numLoadingDataProviders
 * alone, which is 0 for a product made before a state started to be restored.
 */
export function isVisualizationLoading(
    group: Pick<VisualizationGroup<any>, "numLoadingDataProviders" | "isRestoringState">,
): boolean {
    return group.isRestoringState || group.numLoadingDataProviders > 0;
}

export type Annotation = ColorScaleWithId; // Add more possible annotation types here, e.g. ColorSets etc.

export type AssemblerProduct<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TAccumulatedData extends Record<string, any> = Record<string, never>,
> = Omit<VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData>, keyof VisualizationGroupMetadata<any>>;

export type CustomGroupPropsMap = Partial<Record<GroupType, Record<string, any>>>;

export type VisualizationAssemblerMakeOptions<
    TInjectedData extends Record<string, any>,
    TAccumulatedData extends Record<string, any>,
> = {
    injectedData?: TInjectedData;
    initialAccumulatedData?: TAccumulatedData;
};

export class VisualizationAssembler<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
    TAccumulatedData extends Record<string, any> = Record<string, never>,
> {
    private _transformerRegistry = new TransformerRegistry<
        TTarget,
        TCustomGroupProps,
        TInjectedData,
        TAccumulatedData
    >();
    private _providerObjectsCache = new ProviderObjectsCache<TTarget, TInjectedData>();
    // Kept apart from the cache, as memoized values are meant to outlive changes to the provider
    private _providerMemoStore = new ProviderMemoStore();

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
        this._transformerRegistry.registerDataProviderTransformers(dataProviderName, transformers);
    }

    registerGroupCustomPropsCollector<TSettings extends Settings, TGroupType extends keyof TCustomGroupProps>(
        groupName: TGroupType,
        groupCtor: {
            new (...params: any[]): CustomGroupImplementation | CustomGroupImplementationWithSettings<TSettings>;
        },
        collector: GroupCustomPropsCollector<TSettings, TGroupType, TCustomGroupProps>,
    ): void {
        this._transformerRegistry.registerGroupCustomPropsCollector(groupName, collector);
    }

    make(
        dataProviderManager: DataProviderManager,
        options?: VisualizationAssemblerMakeOptions<TInjectedData, TAccumulatedData>,
    ): AssemblerProduct<TTarget, TCustomGroupProps, TAccumulatedData> {
        return this.makeRecursively(
            dataProviderManager.getGroupDelegate(),
            [],
            options?.initialAccumulatedData ?? ({} as TAccumulatedData),
            dataProviderManager.isDeserializing(),
            options?.injectedData,
        );
    }

    private collectAllIdsRecursively(groupDelegate: GroupDelegate, allItemIds: Set<string>): void {
        for (const child of groupDelegate.getChildren()) {
            allItemIds.add(child.getItemDelegate().getId());
            if (instanceofItemGroup(child)) {
                this.collectAllIdsRecursively(child.getGroupDelegate(), allItemIds);
            }
        }
    }

    private makeRecursively(
        groupDelegate: GroupDelegate,
        inheritedDataProviders: DataProvider<any, any, any>[],
        accumulatedData: TAccumulatedData,
        isRestoringState: boolean,
        injectedData?: TInjectedData,
    ): VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> {
        const children: (
            | VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData>
            | DataProviderVisualization<TTarget>
        )[] = [];
        const annotations: Annotation[] = [];
        const aggregatedErrorMessages: (StatusMessage | string)[] = [];
        const allItemIds = new Set<string>();
        let hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget> = {};
        let numLoadingDataProviders = 0;
        let numDataProviders = 0;
        let combinedBoundingBox: bbox.BBox | null = null;

        const itemGroups: ItemGroup[] = [];
        const dataProviders: DataProvider<any, any, any>[] = [];

        const maybeApplyBoundingBox = (boundingBox: bbox.BBox | null) => {
            if (boundingBox) {
                combinedBoundingBox =
                    combinedBoundingBox === null ? boundingBox : bbox.combine(boundingBox, combinedBoundingBox);
            }
        };

        for (const child of groupDelegate.getChildren()) {
            // Register item id
            allItemIds.add(child.getItemDelegate().getId());

            if (!child.getItemDelegate().isVisible()) {
                // Even though the item is hidden, recurse into groups to collect all descendant IDs.
                // Downstream code needs to distinguish between a hidden item and a deleted one.
                if (instanceofItemGroup(child)) {
                    this.collectAllIdsRecursively(child.getGroupDelegate(), allItemIds);
                }
                continue;
            }

            // Skip items with deserialization errors, but count the errors for error badge and opening all descendants with errors functionality
            if (child.getItemDelegate().getDeserializationErrors().length) {
                // Include the name of the item with deserialization errors in the error messages
                aggregatedErrorMessages.push(
                    `${child.getItemDelegate().getName()}: ${child.getItemDelegate().getDeserializationErrors().join(", ")}`,
                );
                continue;
            }

            // Skip DeltaSurface for now
            if (child instanceof DeltaSurface) {
                continue;
            }

            if (instanceofItemGroup(child)) {
                itemGroups.push(child);
            }

            if (child instanceof DataProvider) {
                dataProviders.push(child);
            }
        }

        for (const itemGroup of itemGroups) {
            const product = this.makeRecursively(
                itemGroup.getGroupDelegate(),
                [...inheritedDataProviders, ...dataProviders],
                accumulatedData,
                isRestoringState,
                injectedData,
            );

            accumulatedData = product.accumulatedData;
            aggregatedErrorMessages.push(...product.aggregatedErrorMessages);

            // Add all descendant item ids of the group to the set of all item ids
            for (const id of product.allItemIds) {
                allItemIds.add(id);
            }

            hoverVisualizationFunctions = mergeHoverVisualizationFunctions(
                hoverVisualizationFunctions,
                product.hoverVisualizationFunctions,
            );
            numLoadingDataProviders += product.numLoadingDataProviders;
            numDataProviders += product.numDataProviders;
            maybeApplyBoundingBox(product.combinedBoundingBox);

            if (itemGroup instanceof Group) {
                const group = this.makeGroup(itemGroup, product);

                children.push(group);
                continue;
            } else {
                annotations.push(...product.annotations);
            }

            children.push(...product.children);
        }

        for (const child of [...inheritedDataProviders, ...dataProviders]) {
            if (children.some((el) => el.id === child.getItemDelegate().getId())) {
                continue;
            }

            numDataProviders++;

            // IDLE as well - a provider that hasn't started loading yet has no current data either
            if (child.getStatus() === DataProviderStatus.LOADING || child.getStatus() === DataProviderStatus.IDLE) {
                numLoadingDataProviders++;
            }

            if (child.getStatus() === DataProviderStatus.INVALID_SETTINGS) {
                continue;
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

            const transformers = this._transformerRegistry.getDataProviderTransformers(child.getType());
            const transformerArgs = makeTransformerArgs(child, injectedData, this._providerMemoStore);
            const dataProviderObjects = this.makeDataProviderObjects(
                child,
                transformers,
                transformerArgs,
                injectedData,
            );

            if (!dataProviderObjects.visualization) {
                continue;
            }

            maybeApplyBoundingBox(dataProviderObjects.boundingBox);
            children.push(dataProviderObjects.visualization);
            annotations.push(...dataProviderObjects.annotations);
            hoverVisualizationFunctions = mergeHoverVisualizationFunctions(
                hoverVisualizationFunctions,
                dataProviderObjects.hoverVisualizationFunctions,
            );
            // Always reduced anew, as the result depends on the accumulated data passed in, which changes with the
            // providers before this one
            accumulatedData = transformers.reduceAccumulatedData?.(accumulatedData, transformerArgs) ?? accumulatedData;
        }

        return {
            itemType: VisualizationItemType.GROUP,
            id: "",
            color: null,
            name: "",
            groupType: null,
            children,
            aggregatedErrorMessages,
            allItemIds,
            combinedBoundingBox,
            annotations,
            numLoadingDataProviders,
            numDataProviders,
            isRestoringState,
            accumulatedData,
            hoverVisualizationFunctions,
            customProps: {} as TCustomGroupProps,
        };
    }

    private makeDataProviderObjects(
        dataProvider: DataProvider<any, any, any>,
        transformers: DataProviderTransformers<any, any, TTarget, any, TInjectedData, TAccumulatedData>,
        transformerArgs: TransformerArgs<any, any, any, TInjectedData>,
        injectedData: TInjectedData | undefined,
    ): DataProviderObjects<TTarget> {
        const cached = this._providerObjectsCache.get(dataProvider, injectedData);
        if (cached) {
            return cached;
        }

        const visualization = transformers.transformToVisualization(transformerArgs);
        const objects: DataProviderObjects<TTarget> = {
            visualization: visualization
                ? {
                      itemType: VisualizationItemType.DATA_PROVIDER_VISUALIZATION,
                      id: dataProvider.getItemDelegate().getId(),
                      name: dataProvider.getItemDelegate().getName(),
                      type: dataProvider.getType(),
                      visualization,
                  }
                : null,
            hoverVisualizationFunctions: transformers.transformToHoverVisualization?.(transformerArgs) ?? {},
            annotations: transformers.transformToAnnotations?.(transformerArgs) ?? [],
            boundingBox: transformers.transformToBoundingBox?.(transformerArgs) ?? null,
        };

        this._providerObjectsCache.set(dataProvider, injectedData, objects);
        return objects;
    }

    private makeGroup<
        TSettings extends Settings,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >(
        group: Group<TSettings>,
        product: VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData, GroupType>,
    ): VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> {
        const func = this._transformerRegistry.getGroupCustomPropsCollector(group.getGroupType());

        return {
            itemType: VisualizationItemType.GROUP,
            id: group.getItemDelegate().getId(),
            color: group.getGroupDelegate().getColor(),
            name: group.getItemDelegate().getName(),
            groupType: group.getGroupType(),
            children: product.children,
            annotations: product.annotations,
            aggregatedErrorMessages: product.aggregatedErrorMessages,
            allItemIds: product.allItemIds,
            combinedBoundingBox: product.combinedBoundingBox,
            numLoadingDataProviders: product.numLoadingDataProviders,
            numDataProviders: product.numDataProviders,
            isRestoringState: product.isRestoringState,
            accumulatedData: product.accumulatedData,
            hoverVisualizationFunctions: product.hoverVisualizationFunctions,
            customProps:
                func?.({
                    id: group.getItemDelegate().getId(),
                    name: group.getItemDelegate().getName(),
                    getSetting: <TKey extends TSettingKey>(setting: TKey) =>
                        group.getSharedSettingsDelegate()?.getWrappedSettings()[setting].getValue() ?? null,
                }) ?? ({} as TCustomGroupProps),
        };
    }
}

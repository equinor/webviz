import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { HoverData, HoverTopic } from "@framework/HoverService";
import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import * as bbox from "@lib/utils/bbox";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { LayerItem } from "@modules/_shared/components/EsvIntersection";
import type { HighlightItem } from "@modules/_shared/components/EsvIntersection/types";
import type { TemplatePlot } from "@modules/_shared/types/wellLogTemplates";
import type { WellPickDataCollection } from "@modules/_shared/types/wellpicks";

import type { GroupDelegate } from "../delegates/GroupDelegate";
import { DataProvider, DataProviderStatus } from "../framework/DataProvider/DataProvider";
import type { DataProviderManager } from "../framework/DataProviderManager/DataProviderManager";
import { Group } from "../framework/Group/Group";
import type { GroupType } from "../groups/groupTypes";
import type { DataProviderMeta, ProviderSnapshot } from "../interfacesAndTypes/customDataProviderImplementation";
import type {
    CustomGroupImplementation,
    CustomGroupImplementationWithSettings,
} from "../interfacesAndTypes/customGroupImplementation";
import { instanceofItemGroup, type ItemGroup } from "../interfacesAndTypes/entities";
import type { ItemView, StateSnapshot } from "../interfacesAndTypes/ItemView";
import type { SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { Settings, SettingTypeDefinitions } from "../settings/settingsDefinitions";

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
    // Each layer has to be made inside EsvIntersection with the same pixiApplication, therefore the return type is LayerItem and not EsvLayer<any>
    makeLayerItems: (intersectionReferenceSystem: IntersectionReferenceSystem | null) => LayerItem[];
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
    TVisualization extends
        DataProviderVisualizationTargetTypes[TTarget] = DataProviderVisualizationTargetTypes[TTarget],
> = {
    itemType: VisualizationItemType.DATA_PROVIDER_VISUALIZATION;
    id: string;
    name: string;
    type: string;
    visualization: TVisualization;
};

export type TransformerArgs<
    TData,
    TMeta extends DataProviderMeta,
    TInjectedData extends Record<string, any> = Record<string, any>,
> = {
    id: string;
    name: string;
    isLoading: boolean;
    getInjectedData: () => TInjectedData;
    state: StateSnapshot<TData, TMeta> | null;
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
    combinedBoundingBox: bbox.BBox | null;
    numLoadingDataProviders: number;
    numDataProviders: number;
    accumulatedData: TAccumulatedData;
    hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget>;
    customProps: TCustomGroupProps[TGroupType];
};

export type GroupPropsCollectorArgs<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> = {
    id: string;
    name: string;
    getSetting: <TKey extends TSettingKey>(setting: TKey) => SettingTypeDefinitions[TKey]["externalValue"];
};

export interface GroupCustomPropsCollector<
    TSettings extends Settings,
    TGroupKey extends keyof TCustomGroupProps,
    TCustomGroupProps extends CustomGroupPropsMap = Record<string, never>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    (args: GroupPropsCollectorArgs<TSettings, TSettingKey>): TCustomGroupProps[TGroupKey];
}

export type Annotation = ColorScaleWithId; // Add more possible annotation types here, e.g. ColorSets etc.

export type DataProviderTransformers<
    TTarget extends VisualizationTarget,
    TData,
    TMeta extends DataProviderMeta,
    TInjectedData extends Record<string, any> = Record<string, never>,
    TAccumulatedData extends Record<string, any> = Record<string, never>,
> = {
    transformToVisualization: VisualizationTransformer<TTarget, TData, TMeta, TInjectedData>;
    transformToBoundingBox?: BoundingBoxTransformer<TData, TMeta, TInjectedData>;
    transformToAnnotations?: AnnotationsTransformer<TData, TMeta, TInjectedData>;
    transformToHoverVisualization?: HoverVisualizationTransformer<TTarget, TData, TMeta, TInjectedData>;
    reduceAccumulatedData?: ReduceAccumulatedDataFunction<TData, TMeta, TAccumulatedData, TInjectedData>;
};

export type HoverVisualizationFunctions<TTarget extends VisualizationTarget> = {
    [K in HoverTopic]?: HoverVisualizationFunction<TTarget, K>;
};

export type HoverVisualizationFunction<TTarget extends VisualizationTarget, TTopic extends HoverTopic> = (
    hoverInfo: HoverData[TTopic],
) => DataProviderHoverVisualizationTargetTypes[TTarget][];

export type VisualizationTransformer<
    TTarget extends VisualizationTarget,
    TData,
    TMeta extends DataProviderMeta,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (args: TransformerArgs<TData, TMeta, TInjectedData>) => DataProviderVisualizationTargetTypes[TTarget] | null;

// This does likely require a refactor as soon as we have tested against a use case
export type HoverVisualizationTransformer<
    TTarget extends VisualizationTarget,
    TData,
    TMeta extends DataProviderMeta,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (args: TransformerArgs<TData, TMeta, TInjectedData>) => HoverVisualizationFunctions<TTarget>;

export type BoundingBoxTransformer<
    TData,
    TMeta extends DataProviderMeta,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (args: TransformerArgs<TData, TMeta, TInjectedData>) => bbox.BBox | null;

export type AnnotationsTransformer<
    TData,
    TMeta extends DataProviderMeta,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (args: TransformerArgs<TData, TMeta, TInjectedData>) => Annotation[];

export type ReduceAccumulatedDataFunction<
    TData,
    TMeta extends DataProviderMeta,
    TAccumulatedData,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (accumulatedData: TAccumulatedData, args: TransformerArgs<TData, TMeta, TInjectedData>) => TAccumulatedData;

export type AssemblerProduct<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TAccumulatedData extends Record<string, any> = Record<string, never>,
> = Omit<VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData>, keyof VisualizationGroupMetadata<any>>;

export type CustomGroupPropsMap = Partial<Record<GroupType, Record<string, any>>>;

type ItemViewObjects<TTarget extends VisualizationTarget, TAccumulatedData extends Record<string, any>> = {
    visualization: DataProviderVisualization<TTarget> | null;
    hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget>;
    annotations: Annotation[];
    boundingBox: bbox.BBox | null;
    accumulatedData: TAccumulatedData | null;
};

export class VisualizationAssembler<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
    TAccumulatedData extends Record<string, any> = Record<string, never>,
> {
    private _dataProviderTransformers: Map<
        string,
        DataProviderTransformers<TTarget, any, any, TInjectedData, TAccumulatedData>
    > = new Map();

    private _groupCustomPropsCollectors: Map<
        keyof TCustomGroupProps,
        GroupCustomPropsCollector<any, any, TCustomGroupProps>
    > = new Map();

    private _cachedItemViewVisualizationsMap: Map<
        string,
        {
            revisionNumber: number;
            objects: ItemViewObjects<TTarget, TAccumulatedData>;
        }
    > = new Map();

    registerDataProviderTransformers<TData, TMeta extends DataProviderMeta>(
        dataProviderName: string,
        dataProviderCtor: {
            new (...params: any[]): { makeProviderSnapshot: (...args: any[]) => ProviderSnapshot<TData, TMeta> };
        },
        transformers: DataProviderTransformers<TTarget, TData, TMeta, TInjectedData, TAccumulatedData>,
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
            /**
             * @deprecated - Exposed for a hotfix, avoid usage. See issue #1272
             */
            disableCache?: boolean;
        },
    ): AssemblerProduct<TTarget, TCustomGroupProps, TAccumulatedData> {
        return this.makeRecursively(
            dataProviderManager.getGroupDelegate(),
            [],
            options?.initialAccumulatedData ?? ({} as TAccumulatedData),
            options?.injectedData,
            options?.disableCache,
        );
    }

    private makeRecursively(
        groupDelegate: GroupDelegate,
        inheritedItemViews: ItemView[],
        accumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
        /**
         * @deprecated - Exposed for a hotfix, avoid usage. See issue #1272
         */
        disableCache?: boolean,
    ): VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> {
        const children: (
            | VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData>
            | DataProviderVisualization<TTarget>
        )[] = [];
        const annotations: Annotation[] = [];
        const aggregatedErrorMessages: (StatusMessage | string)[] = [];
        let hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget> = {};
        let numLoadingDataProviders = 0;
        let numDataProviders = 0;
        let combinedBoundingBox: bbox.BBox | null = null;

        const itemGroups: ItemGroup[] = [];
        const itemViews: ItemView[] = [];

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

            if (instanceofItemGroup(child)) {
                itemGroups.push(child);
            }

            if (child instanceof DataProvider) {
                itemViews.push(child);
            }
        }

        for (const itemGroup of itemGroups) {
            const product = this.makeRecursively(
                itemGroup.getGroupDelegate(),
                [...inheritedItemViews, ...itemViews],
                accumulatedData,
                injectedData,
                disableCache,
            );

            accumulatedData = product.accumulatedData;
            aggregatedErrorMessages.push(...product.aggregatedErrorMessages);
            hoverVisualizationFunctions = this.mergeHoverVisualizationFunctions(
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

        for (const child of [...inheritedItemViews, ...itemViews]) {
            if (children.some((el) => el.id === child.getId())) {
                continue;
            }

            numDataProviders++;

            if (child.getStatus() === DataProviderStatus.LOADING) {
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

            if (child.getStateSnapshot() === null) {
                continue;
            }

            const itemViewObjects = this.makeItemViewObjects(child, accumulatedData, injectedData);

            if (!itemViewObjects.visualization) {
                continue;
            }

            maybeApplyBoundingBox(itemViewObjects.boundingBox);
            children.push(itemViewObjects.visualization);
            annotations.push(...itemViewObjects.annotations);
            hoverVisualizationFunctions = this.mergeHoverVisualizationFunctions(
                hoverVisualizationFunctions,
                itemViewObjects.hoverVisualizationFunctions,
            );
            accumulatedData = itemViewObjects.accumulatedData ?? accumulatedData;
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
            numLoadingDataProviders,
            numDataProviders,
            accumulatedData,
            hoverVisualizationFunctions: hoverVisualizationFunctions,
            customProps: {} as TCustomGroupProps,
        };
    }

    private makeItemViewObjects(
        itemView: ItemView,
        initialAccumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
        /**
         * @deprecated - Exposed for a hotfix, avoid usage. See issue #1272
         */
        disableCache?: boolean,
    ): ItemViewObjects<TTarget, TAccumulatedData> {
        // ! Cache logic returns the wrong accumulated data for WellLogViewer in some cases. As a hot-fix, we'll allow
        // ! the cache to be disabled here, but this should be reverted once the issue has been resolved. See #1272
        if (!disableCache && this._cachedItemViewVisualizationsMap.has(itemView.getId())) {
            const cached = this._cachedItemViewVisualizationsMap.get(itemView.getId());
            if (cached && cached.revisionNumber === itemView.getRevisionNumber()) {
                return cached.objects;
            }
        }

        const visualization = this.makeItemViewVisualization(itemView, injectedData);
        const hoverVisualizationFunctions = this.makeItemViewHoverVisualizationFunctions(itemView, injectedData);
        const annotations = this.makeItemViewAnnotations(itemView, injectedData);
        const boundingBox = this.makeItemViewBoundingBox(itemView);
        const accumulatedData = this.accumulateItemViewData(itemView, initialAccumulatedData, injectedData);

        const objects: ItemViewObjects<TTarget, TAccumulatedData> = {
            visualization,
            hoverVisualizationFunctions,
            annotations,
            boundingBox,
            accumulatedData,
        };

        this._cachedItemViewVisualizationsMap.set(itemView.getId(), {
            revisionNumber: itemView.getRevisionNumber(),
            objects,
        });

        return objects;
    }

    private makeGroup<
        TSettings extends Settings,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >(
        group: Group<TSettings>,
        product: VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData, GroupType>,
    ): VisualizationGroup<TTarget, TCustomGroupProps, TAccumulatedData> {
        const func = this._groupCustomPropsCollectors.get(group.getGroupType());

        return {
            itemType: VisualizationItemType.GROUP,
            id: group.getItemDelegate().getId(),
            color: group.getGroupDelegate().getColor(),
            name: group.getItemDelegate().getName(),
            groupType: group.getGroupType(),
            children: product.children,
            annotations: product.annotations,
            aggregatedErrorMessages: product.aggregatedErrorMessages,
            combinedBoundingBox: product.combinedBoundingBox,
            numLoadingDataProviders: product.numLoadingDataProviders,
            numDataProviders: product.numDataProviders,
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

    private makeFactoryFunctionArgs(
        itemView: ItemView,
        injectedData?: TInjectedData,
    ): TransformerArgs<any, any, TInjectedData> {
        function getInjectedData() {
            if (!injectedData) {
                throw new Error("No injected data provided. Did you forget to pass it to the factory?");
            }
            return injectedData;
        }

        return {
            id: itemView.getId(),
            name: itemView.getName(),
            isLoading: itemView.getStatus() === DataProviderStatus.LOADING,
            getInjectedData: getInjectedData.bind(this),
            state: itemView.getStateSnapshot(),
        };
    }

    private makeItemViewVisualization(
        itemView: ItemView,
        injectedData?: TInjectedData,
    ): DataProviderVisualization<TTarget> | null {
        const func = this._dataProviderTransformers.get(itemView.getType())?.transformToVisualization;
        if (!func) {
            throw new Error(`No visualization transformer found for data provider ${itemView.getType()}`);
        }

        const visualization = func(this.makeFactoryFunctionArgs(itemView, injectedData));
        if (!visualization) {
            return null;
        }

        const visualizationObj: DataProviderVisualization<TTarget> = {
            itemType: VisualizationItemType.DATA_PROVIDER_VISUALIZATION,
            id: itemView.getId(),
            name: itemView.getName(),
            type: itemView.getType(),
            visualization,
        };

        return visualizationObj;
    }

    private makeItemViewHoverVisualizationFunctions(
        itemView: ItemView,
        injectedData?: TInjectedData,
    ): HoverVisualizationFunctions<TTarget> {
        const func = this._dataProviderTransformers.get(itemView.getType())?.transformToHoverVisualization;
        if (!func) {
            return {};
        }

        return func(this.makeFactoryFunctionArgs(itemView, injectedData));
    }

    private makeItemViewBoundingBox(itemView: ItemView, injectedData?: TInjectedData): bbox.BBox | null {
        const func = this._dataProviderTransformers.get(itemView.getType())?.transformToBoundingBox;
        if (!func) {
            return null;
        }

        return func(this.makeFactoryFunctionArgs(itemView, injectedData));
    }

    private makeItemViewAnnotations(itemView: ItemView, injectedData?: TInjectedData): Annotation[] {
        const func = this._dataProviderTransformers.get(itemView.getType())?.transformToAnnotations;
        if (!func) {
            return [];
        }

        return func(this.makeFactoryFunctionArgs(itemView, injectedData));
    }

    private accumulateItemViewData(
        itemView: ItemView,
        accumulatedData: TAccumulatedData,
        injectedData?: TInjectedData,
    ): TAccumulatedData | null {
        const func = this._dataProviderTransformers.get(itemView.getType())?.reduceAccumulatedData;
        if (!func) {
            return null;
        }

        return func(accumulatedData, this.makeFactoryFunctionArgs(itemView, injectedData));
    }

    private mergeHoverVisualizationFunctions(
        base: HoverVisualizationFunctions<TTarget>,
        additional: HoverVisualizationFunctions<TTarget>,
    ): HoverVisualizationFunctions<TTarget> {
        const merged: HoverVisualizationFunctions<TTarget> = { ...base };

        for (const key in additional) {
            const typedKey = key as HoverTopic;
            const baseFn = base[typedKey];
            const additionalFn = additional[typedKey];

            if (baseFn && additionalFn) {
                // TypeScript can't narrow K per key in a dynamic loop; we assert here intentionally
                merged[typedKey] = ((hoverInfo: any) => [
                    ...(baseFn as any)(hoverInfo),
                    ...(additionalFn as any)(hoverInfo),
                ]) as any;
            } else if (additionalFn) {
                merged[typedKey] = additionalFn as any;
            }
        }

        return merged;
    }
}

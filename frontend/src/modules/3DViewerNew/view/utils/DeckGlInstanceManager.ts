/*
This manager is responsible for managing plugins for DeckGL, forwarding events to them, and adding/adjusting layers based on the plugins' responses.
*/
import { Layer, PickingInfo } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import {
    PublishSubscribe,
    PublishSubscribeDelegate,
    TopicPayloads,
} from "@modules_shared/utils/PublishSubscribeDelegate";
import { MapMouseEvent, SubsurfaceViewerProps } from "@webviz/subsurface-viewer";

export enum DeckGlPluginTopic {
    REQUIRE_REDRAW = "REQUIRE_REDRAW",
}

export type DeckGlPluginPayloads = {
    [DeckGlPluginTopic.REQUIRE_REDRAW]: undefined;
};

export class DeckGlPlugin<
    TAdditionalTopic extends string | never = never,
    TAdditionalPayloads extends TopicPayloads<TAdditionalTopic> | never = never
> implements PublishSubscribe<DeckGlPluginTopic | TAdditionalTopic, DeckGlPluginPayloads & TAdditionalPayloads>
{
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<TAdditionalTopic | DeckGlPluginTopic>();

    private requireRedraw() {
        this._publishSubscribeDelegate.notifySubscribers(DeckGlPluginTopic.REQUIRE_REDRAW);
    }

    handleDragStart?(pickingInfo: PickingInfo): void;
    handleDrag?(pickingInfo: PickingInfo, deckGlRef: DeckGLRef): void;
    handleMouseEvent?(event: MapMouseEvent): void;
    handleKeyUpEvent?(key: string): void;
    handleKeyDownEvent?(key: string): void;
    getCursor?(): string | null;

    protected makeSnapshot?<T extends TAdditionalTopic>(
        topic: T,
    ): TAdditionalPayloads[T];

    makeSnapshotGetter<T extends DeckGlPluginTopic | TAdditionalTopic>(
        topic: T
    ): () => (DeckGlPluginPayloads & TAdditionalPayloads)[T] {
        const snapshotGetter = (): any => {
            if (topic === DeckGlPluginTopic.REQUIRE_REDRAW) {
                return undefined;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<TAdditionalTopic | DeckGlPluginTopic> {
        return this._publishSubscribeDelegate;
    }
}

export enum DeckGlInstanceManagerTopic {
    REDRAW = "REDRAW",
}

export type DeckGlInstanceManagerPayloads = {
    [DeckGlInstanceManagerTopic.REDRAW]: undefined;
};

export class DeckGlInstanceManager implements PublishSubscribe<DeckGlPluginTopic, DeckGlPluginPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DeckGlPluginTopic>();

    private _ref: DeckGLRef;
    private _hoverPoint: [number, number, number] | null = null;
    private _plugins: DeckGlPlugin[] = [];
    private _layers: Layer<any>[] = [];
    private _layersIdPluginMap = new Map<string, DeckGlPlugin>();

    constructor(ref: DeckGLRef) {
        this._ref = ref;
    }

    addPlugin(plugin: DeckGlPlugin) {
        this._plugins.push(plugin);
    }

    addLayers(layers: Layer<any>) {
        this._layers.push(layers);
    }

    redraw() {}

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DeckGlPluginTopic> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends DeckGlPluginTopic>(topic: T): () => DeckGlPluginPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === DeckGlPluginTopic.REQUIRE_REDRAW) {
                return undefined;
            }
        };

        return snapshotGetter;
    }

    private getLayerIdFromPickingInfo(pickingInfo: PickingInfo): string | undefined {
        return pickingInfo.layer?.id;
    }

    handleDrag(pickingInfo: PickingInfo): void {
        const layerId = this.getLayerIdFromPickingInfo(pickingInfo);
        if (!layerId) {
            return;
        }

        const plugin = this._layersIdPluginMap.get(layerId);
        if (!plugin) {
            return;
        }

        plugin.handleDrag?.(pickingInfo, this._ref);
    }

    handleDragStart(pickingInfo: PickingInfo) {
        const layerId = this.getLayerIdFromPickingInfo(pickingInfo);
        if (!layerId) {
            return;
        }

        const plugin = this._layersIdPluginMap.get(layerId);
        if (!plugin) {
            return;
        }

        plugin.handleDragStart?.(pickingInfo);
    }

    handleMouseEvent(event: MapMouseEvent) {}

    makeDeckGlComponentProps(): Partial<SubsurfaceViewerProps> {
        return {
            onDrag: this.handleDrag.bind(this),
            onMouseEvent: this.handleMouseEvent.bind(this),
        };
    }
}

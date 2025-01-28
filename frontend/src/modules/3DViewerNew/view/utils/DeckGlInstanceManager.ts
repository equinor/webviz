/*
This manager is responsible for managing plugins for DeckGL, forwarding events to them, and adding/adjusting layers based on the plugins' responses.
*/
import { Layer, PickingInfo } from "@deck.gl/core";
import { DeckGLProps, DeckGLRef } from "@deck.gl/react";
import { PublishSubscribe, PublishSubscribeDelegate } from "@modules_shared/utils/PublishSubscribeDelegate";
import { MapMouseEvent, SubsurfaceViewerProps } from "@webviz/subsurface-viewer";

export enum DeckGlPluginTopic {
    REQUIRE_REDRAW = "REQUIRE_REDRAW",
}

export type DeckGlPluginPayloads = {
    [DeckGlPluginTopic.REQUIRE_REDRAW]: undefined;
};

export class DeckGlPlugin {
    private _manager: DeckGlInstanceManager;

    constructor(manager: DeckGlInstanceManager) {
        this._manager = manager;
    }

    private requireRedraw() {
        this._manager.redraw();
    }

    handleDragStart?(pickingInfo: PickingInfo): void;
    handleDrag?(pickingInfo: PickingInfo): void;
    handleMouseHover?(pickingInfo: PickingInfo): void;
    handleMouseClick?(pickingInfo: PickingInfo): void;
    handleKeyUpEvent?(key: string): void;
    handleKeyDownEvent?(key: string): void;
    getCursor?(pickingInfo: PickingInfo): string | null;
    getLayers?(): Layer<any>[];
}

export enum DeckGlInstanceManagerTopic {
    REDRAW = "REDRAW",
}

export type DeckGlInstanceManagerPayloads = {
    [DeckGlInstanceManagerTopic.REDRAW]: undefined;
};

type HoverPoint = {
    worldCoordinates: number[];
    screenCoordinates: [number, number];
};

export class DeckGlInstanceManager
    implements PublishSubscribe<DeckGlInstanceManagerTopic, DeckGlInstanceManagerPayloads>
{
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DeckGlInstanceManagerTopic>();

    private _ref: DeckGLRef | null;
    private _hoverPoint: HoverPoint | null = null;
    private _plugins: DeckGlPlugin[] = [];
    private _layersIdPluginMap = new Map<string, DeckGlPlugin>();
    private _cursor: string = "auto";

    constructor(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    setRef(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    addPlugin(plugin: DeckGlPlugin) {
        this._plugins.push(plugin);
    }

    redraw() {
        this._publishSubscribeDelegate.notifySubscribers(DeckGlInstanceManagerTopic.REDRAW);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DeckGlInstanceManagerTopic> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends DeckGlInstanceManagerTopic>(topic: T): () => DeckGlInstanceManagerPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === DeckGlInstanceManagerTopic.REDRAW) {
                return undefined;
            }
        };

        return snapshotGetter;
    }

    private getLayerIdFromPickingInfo(pickingInfo: PickingInfo): string | undefined {
        return pickingInfo.layer?.id;
    }

    private setCursor(cursor: string) {
        this._cursor = cursor;
        this._publishSubscribeDelegate.notifySubscribers(DeckGlInstanceManagerTopic.REDRAW);
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

        plugin.handleDrag?.(pickingInfo);
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

    handleMouseEvent(event: MapMouseEvent) {
        const firstLayerInfo = this.getFirstLayerUnderCursorInfo(event);
        if (!firstLayerInfo || !firstLayerInfo.coordinate) {
            this._hoverPoint = null;
            return;
        }

        this._hoverPoint = {
            worldCoordinates: firstLayerInfo.coordinate,
            screenCoordinates: [firstLayerInfo.x, firstLayerInfo.y],
        };

        const layerId = this.getLayerIdFromPickingInfo(firstLayerInfo);
        if (!layerId) {
            return;
        }

        const plugin = this._layersIdPluginMap.get(layerId);
        if (!plugin) {
            return;
        }

        if (event.type === "hover") {
            plugin.handleMouseHover?.(firstLayerInfo);
            this._cursor = plugin.getCursor?.(firstLayerInfo) ?? "auto";
        }
    }

    private getFirstLayerUnderCursorInfo(event: MapMouseEvent): PickingInfo | undefined {
        for (const info of event.infos) {
            if (info.coordinate && info.x) {
                return info;
            }
        }

        return undefined;
    }

    getCursor(cursorState: Parameters<Exclude<DeckGLProps["getCursor"], undefined>>[0]): string {
        if (cursorState.isDragging) {
            return "grabbing";
        }

        return this._cursor;
    }

    makeDeckGlComponentProps(withLayers: Layer<any>[]): Partial<SubsurfaceViewerProps> {
        const layers = [...withLayers];
        for (const plugin of this._plugins) {
            const pluginLayers = plugin.getLayers?.() ?? [];
            layers.push(...pluginLayers);
            for (const layer of pluginLayers) {
                this._layersIdPluginMap.set(layer.id, plugin);
            }
        }
        return {
            onDrag: this.handleDrag.bind(this),
            onMouseEvent: this.handleMouseEvent.bind(this),
            getCursor: this.getCursor.bind(this),
            layers,
        };
    }
}

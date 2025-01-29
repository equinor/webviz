/*
This manager is responsible for managing plugins for DeckGL, forwarding events to them, and adding/adjusting layers based on the plugins' responses.
*/
import React from "react";

import { Layer, PickingInfo } from "@deck.gl/core";
import { DeckGLProps, DeckGLRef } from "@deck.gl/react";
import { PublishSubscribe, PublishSubscribeDelegate } from "@modules_shared/utils/PublishSubscribeDelegate";
import { MapMouseEvent, SubsurfaceViewerProps } from "@webviz/subsurface-viewer";

export type ContextMenuItem = {
    icon?: React.ReactNode;
    label: string;
    onClick: () => void;
};

export type ContextMenu = {
    position: { x: number; y: number };
    items: ContextMenuItem[];
};
export class DeckGlPlugin {
    private _manager: DeckGlInstanceManager;

    constructor(manager: DeckGlInstanceManager) {
        this._manager = manager;
    }

    protected requireRedraw() {
        this._manager.redraw();
    }

    protected requestDisablePanning() {
        this._manager.disablePanning();
    }

    protected requestEnablePanning() {
        this._manager.enablePanning();
    }

    protected getFirstLayerUnderCursorInfo(x: number, y: number): PickingInfo | undefined {
        return this._manager.pickFirstLayerUnderCursorInfo(x, y);
    }

    handleDrag?(pickingInfo: PickingInfo): void;
    handleLayerHover?(pickingInfo: PickingInfo): void;
    handleLayerClick?(pickingInfo: PickingInfo): void;
    handleClickAway?(): void;
    handleGlobalMouseHover?(pickingInfo: PickingInfo): void;
    handleGlobalMouseClick?(pickingInfo: PickingInfo): boolean;
    handleKeyUpEvent?(key: string): void;
    handleKeyDownEvent?(key: string): void;
    getCursor?(pickingInfo: PickingInfo): string | null;
    getLayers?(): Layer<any>[];
    getContextMenuItems?(pickingInfo: PickingInfo): ContextMenuItem[];
}

export enum DeckGlInstanceManagerTopic {
    REDRAW = "REDRAW",
    CONTEXT_MENU = "CONTEXT_MENU",
}

export type DeckGlInstanceManagerPayloads = {
    [DeckGlInstanceManagerTopic.REDRAW]: number;
    [DeckGlInstanceManagerTopic.CONTEXT_MENU]: ContextMenu | null;
};

type HoverPoint = {
    worldCoordinates: number[];
    screenCoordinates: [number, number];
};

type KeyboardEventListener = (event: KeyboardEvent) => void;

export class DeckGlInstanceManager implements PublishSubscribe<DeckGlInstanceManagerPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DeckGlInstanceManagerPayloads>();

    private _ref: DeckGLRef | null;
    private _hoverPoint: HoverPoint | null = null;
    private _plugins: DeckGlPlugin[] = [];
    private _layersIdPluginMap = new Map<string, DeckGlPlugin>();
    private _cursor: string = "auto";
    private _redrawCycle: number = 0;
    private _eventListeners: KeyboardEventListener[] = [];
    private _contextMenu: ContextMenu | null = null;

    constructor(ref: DeckGLRef | null) {
        this._ref = ref;
        this.addKeyboardEventListeners();
    }

    setRef(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    private addKeyboardEventListeners() {
        const handleKeyDown = this.handleKeyDown.bind(this);
        const handleKeyUp = this.handleKeyUp.bind(this);

        this._eventListeners = [handleKeyDown, handleKeyUp];

        document.addEventListener("keyup", handleKeyUp);
        document.addEventListener("keydown", handleKeyDown);
    }

    private maybeRemoveKeyboardEventListeners() {
        for (const listener of this._eventListeners) {
            document.removeEventListener("keydown", listener);
        }
    }

    private handleKeyDown(event: KeyboardEvent) {
        for (const plugin of this._plugins) {
            plugin.handleKeyDownEvent?.(event.key);
        }
    }

    private handleKeyUp(event: KeyboardEvent) {
        for (const plugin of this._plugins) {
            plugin.handleKeyUpEvent?.(event.key);
        }
    }

    addPlugin(plugin: DeckGlPlugin) {
        this._plugins.push(plugin);
    }

    redraw() {
        this._redrawCycle++;
        this._publishSubscribeDelegate.notifySubscribers(DeckGlInstanceManagerTopic.REDRAW);
    }

    disablePanning() {
        if (!this._ref) {
            return;
        }

        this._ref.deck?.setProps({
            controller: {
                dragPan: false,
                dragRotate: false,
            },
        });
    }

    enablePanning() {
        if (!this._ref) {
            return;
        }

        this._ref.deck?.setProps({
            controller: {
                dragRotate: true,
                dragPan: true,
            },
        });
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DeckGlInstanceManagerPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends DeckGlInstanceManagerTopic>(topic: T): () => DeckGlInstanceManagerPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === DeckGlInstanceManagerTopic.REDRAW) {
                return this._redrawCycle;
            }
            if (topic === DeckGlInstanceManagerTopic.CONTEXT_MENU) {
                return this._contextMenu;
            }

            throw new Error(`Unknown topic ${topic}`);
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
    }

    handleMouseEvent(event: MapMouseEvent) {
        this._contextMenu = null;
        this._publishSubscribeDelegate.notifySubscribers(DeckGlInstanceManagerTopic.CONTEXT_MENU);

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
        const plugin = this._layersIdPluginMap.get(layerId ?? "");
        if (layerId && plugin) {
            if (event.type === "hover") {
                plugin.handleLayerHover?.(firstLayerInfo);
                this._cursor = plugin.getCursor?.(firstLayerInfo) ?? "auto";
            }

            if (event.type === "click") {
                plugin.handleLayerClick?.(firstLayerInfo);
            }

            if (event.type === "contextmenu") {
                const contextMenuItems = plugin.getContextMenuItems?.(firstLayerInfo) ?? [];
                this._contextMenu = {
                    position: { x: event.x ?? 0, y: event.y ?? 0 },
                    items: contextMenuItems,
                };
                this._publishSubscribeDelegate.notifySubscribers(DeckGlInstanceManagerTopic.CONTEXT_MENU);
            }

            return;
        }

        const pluginsThatDidNotAcceptEvent: DeckGlPlugin[] = [];
        for (const plugin of this._plugins) {
            if (event.type === "hover") {
                plugin.handleGlobalMouseHover?.(firstLayerInfo);
                this._cursor = "auto";
            } else if (event.type === "click") {
                const accepted = plugin.handleGlobalMouseClick?.(firstLayerInfo);
                if (!accepted) {
                    pluginsThatDidNotAcceptEvent.push(plugin);
                }
            }
        }

        if (event.type === "click") {
            for (const plugin of pluginsThatDidNotAcceptEvent) {
                plugin.handleClickAway?.();
            }
        }
    }

    pickFirstLayerUnderCursorInfo(x: number, y: number): PickingInfo | undefined {
        if (!this._ref?.deck) {
            return undefined;
        }

        const layer = this._ref.deck.pickObject({ x, y, radius: 10, unproject3D: true }) ?? undefined;
        return layer;
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
            getCursor: (state) => this.getCursor(state),
            layers,
        };
    }

    beforeDestroy() {
        this.maybeRemoveKeyboardEventListeners();
    }
}

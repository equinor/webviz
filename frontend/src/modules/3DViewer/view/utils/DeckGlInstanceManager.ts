/*
This manager is responsible for managing plugins for DeckGL, forwarding events to them, and adding/adjusting layers based on the plugins' responses.
*/
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { DeckGLProps, DeckGLRef } from "@deck.gl/react";
import type { MapMouseEvent } from "@webviz/subsurface-viewer";

import type { SubsurfaceViewerWithCameraStateProps } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

export type ContextMenuItem = {
    icon?: React.ReactElement;
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

    protected setDragStart() {
        this._manager.setDragStart();
    }

    protected setDragEnd() {
        this._manager.setDragEnd();
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

type KeyboardEventListener = (event: KeyboardEvent) => void;

export class DeckGlInstanceManager implements PublishSubscribe<DeckGlInstanceManagerPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DeckGlInstanceManagerPayloads>();

    private _isDragging: boolean = false;
    private _ref: DeckGLRef | null;
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

    setDragStart() {
        this._isDragging = true;
    }

    setDragEnd() {
        this._isDragging = false;
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

    handleMouseEvent(event: MapMouseEvent) {
        if (this._isDragging) {
            return;
        }

        if (event.type !== "hover") {
            this._contextMenu = null;
            this._publishSubscribeDelegate.notifySubscribers(DeckGlInstanceManagerTopic.CONTEXT_MENU);
        }

        const firstLayerInfo = this.getFirstLayerUnderCursorInfo(event);
        if (!firstLayerInfo || !firstLayerInfo.coordinate) {
            return;
        }

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
                    position: { x: firstLayerInfo.x, y: firstLayerInfo.y },
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

        const layer =
            this._ref.deck.pickMultipleObjects({ x, y, radius: 10, depth: 1, unproject3D: true }) ?? undefined;
        return layer[0];
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

    makeDeckGlComponentProps(props: SubsurfaceViewerWithCameraStateProps): SubsurfaceViewerWithCameraStateProps {
        const pluginLayerIds: string[] = [];
        const layers = [...(props.layers ?? [])];
        for (const plugin of this._plugins) {
            const pluginLayers = plugin.getLayers?.() ?? [];
            layers.push(...pluginLayers);
            for (const layer of pluginLayers) {
                this._layersIdPluginMap.set(layer.id, plugin);
                pluginLayerIds.push(layer.id);
            }
        }

        return {
            ...props,
            onDrag: this.handleDrag.bind(this),
            onMouseEvent: (event) => {
                this.handleMouseEvent(event);
                props.onMouseEvent?.(event);
            },
            getCursor: (state) => this.getCursor(state),
            layers,
            views: {
                ...props.views,
                viewports: (props.views?.viewports ?? []).map((viewport) => ({
                    ...viewport,
                    layerIds: [...(viewport.layerIds ?? []), ...pluginLayerIds],
                })),
                layout: props.views?.layout ?? [1, 1],
            },
        };
    }

    beforeDestroy() {
        this.enablePanning();
        this.maybeRemoveKeyboardEventListeners();
    }
}

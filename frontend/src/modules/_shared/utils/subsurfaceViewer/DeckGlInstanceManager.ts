/*
This manager is responsible for managing plugins for DeckGL, forwarding events to them, and adding/adjusting layers based on the plugins' responses.
*/
import type { Layer, PickingInfo, View } from "@deck.gl/core";
import type { DeckGLProps, DeckGLRef } from "@deck.gl/react";
import type { MapMouseEvent } from "@webviz/subsurface-viewer";
import { v4 } from "uuid";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import type { SubsurfaceViewerWithCameraStateProps } from "@modules/_shared/components/SubsurfaceViewer/_components/SubsurfaceViewerWithCameraState";

export type ContextMenuItem = {
    icon?: React.ReactElement;
    label: string;
    onClick: () => void;
};

export type ContextMenu = {
    position: { x: number; y: number };
    items: ContextMenuItem[];
};

export type LayerFilter = (args: any) => boolean;

export class DeckGlPlugin {
    private _manager: DeckGlInstanceManager;
    private _id: string;

    constructor(manager: DeckGlInstanceManager) {
        this._manager = manager;
        this._id = v4();
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

    protected makeLayerId(layerId: string): string {
        return `${this._id}-${layerId}`;
    }

    protected getDeck() {
        return this._manager.getDeck();
    }

    protected runWithTemporaryDeckProps<T>(tempProps: Partial<DeckGLProps>, fn: () => T): T | undefined {
        return this._manager.runWithTemporaryDeckProps(tempProps, fn);
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

    /**
     * Views that should exist in deck.gl but must NOT be surfaced via subsurface-viewer props.
     */
    getHiddenDeckViews?(): View[];

    /**
     * ViewState fragments for hidden views (keyed by view id)
     */
    getHiddenViewStatePatch?(): Record<string, any>;

    /**
     * Allow plugins to wrap/combine layerFilter (e.g. “probe view draws only in picking pass”)
     */
    wrapLayerFilter?(prev?: LayerFilter): LayerFilter;

    // Debug only
    getViewStateOverride?(): any | null;
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
    private _verticalScale: number = 1;

    private _deckSetPropsWrapped = false;
    private _originalDeckSetProps: ((props: any) => void) | null = null;

    private _hiddenViews: View[] = []; // plugin registered
    private _hiddenViewStatePatch: Record<string, any> = {};
    private _layerFilterWrappers: ((prev?: any) => any)[] = [];

    constructor(ref: DeckGLRef | null) {
        this._ref = ref;
        this.addKeyboardEventListeners();
    }

    setRef(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    private installDeckPropsInterceptionIfPossible() {
        const deck = this._ref?.deck;
        if (!deck || this._deckSetPropsWrapped) return;

        this._deckSetPropsWrapped = true;
        this._originalDeckSetProps = deck.setProps.bind(deck);

        deck.setProps = (incoming: any = {}) => {
            // incoming is what subsurface-viewer / DeckGL React wants to apply
            const merged = this.mergeDeckProps(incoming);
            this._originalDeckSetProps?.(merged);
        };
    }

    private mergeDeckProps(incoming: any) {
        // 1) Merge views: keep incoming views, append hidden views (by id)
        const inViews = incoming.views
            ? Array.isArray(incoming.views)
                ? incoming.views
                : [incoming.views]
            : this._ref?.deck?.props?.views
              ? Array.isArray(this._ref.deck.props.views)
                  ? this._ref.deck.props.views
                  : [this._ref.deck.props.views]
              : [];

        const existingIds = new Set(inViews.map((v: any) => v?.id ?? v?.props?.id).filter(Boolean));

        // Prepend hidden views so they render behind (deck.gl renders views in order)
        const mergedViews = [...this._hiddenViews.filter((v) => !existingIds.has((v as any).id)), ...inViews];

        // 2) Collect dynamic viewState patches from plugins
        let dynamicPatches: Record<string, any> = { ...this._hiddenViewStatePatch };
        for (const plugin of this._plugins) {
            const patch = plugin.getHiddenViewStatePatch?.();
            if (patch) {
                dynamicPatches = { ...dynamicPatches, ...patch };
            }
        }

        // 3) Merge viewState: preserve incoming viewState, add patches for hidden view ids
        //    (If viewState is a function, don't touch it — see note below.)
        const inVS = incoming.viewState ?? this._ref?.deck?.props?.viewState;
        const mergedViewState =
            typeof inVS === "function"
                ? inVS
                : {
                      ...(inVS ?? {}),
                      ...Object.fromEntries(
                          Object.entries(dynamicPatches).map(([id, patch]) => [
                              id,
                              { ...(inVS?.[id] ?? {}), ...patch },
                          ]),
                      ),
                  };

        // 4) Compose layerFilter
        const baseLayerFilter = incoming.layerFilter ?? this._ref?.deck?.props?.layerFilter;
        const mergedLayerFilter = this._layerFilterWrappers.reduce((prev, wrap) => wrap(prev), baseLayerFilter);

        return {
            ...incoming,
            views: mergedViews,
            viewState: mergedViewState,
            layerFilter: mergedLayerFilter,
        };
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

        // Collect hidden view contributions (if any)
        const hiddenViews = plugin.getHiddenDeckViews?.() ?? [];
        for (const v of hiddenViews) {
            this._hiddenViews.push(v);
        }

        const vsPatch = plugin.getHiddenViewStatePatch?.() ?? {};
        this._hiddenViewStatePatch = { ...this._hiddenViewStatePatch, ...vsPatch };

        const wrap = plugin.wrapLayerFilter?.bind(plugin);
        if (wrap) {
            this._layerFilterWrappers.push(wrap);
        }

        // If deck exists already, ensure interception is installed (and refresh)
        this.installDeckPropsInterceptionIfPossible();
        this._ref?.deck?.setProps({}); // triggers recompute via wrapper
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

    getDeck() {
        return this._ref?.deck ?? null;
    }

    /**
     * Temporarily set deck props, run a synchronous function, then restore.
     * IMPORTANT: fn must be synchronous (no await), or you may see visual flicker.
     */
    runWithTemporaryDeckProps<T>(tempProps: Partial<DeckGLProps>, fn: () => T): T | undefined {
        const deck = this._ref?.deck;
        if (!deck) return undefined;

        const prev = {
            views: deck.props.views,
            viewState: deck.props.viewState,
            layerFilter: deck.props.layerFilter,
        };

        deck.setProps(tempProps as any);
        try {
            return fn();
        } finally {
            deck.setProps(prev as any);
        }
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

        if (!layer || !layer.length) {
            return undefined;
        }

        const firstLayerInfo = layer[0];
        if (!firstLayerInfo.coordinate) {
            return undefined;
        }

        firstLayerInfo.coordinate = [
            firstLayerInfo.coordinate[0],
            firstLayerInfo.coordinate[1],
            firstLayerInfo.coordinate[2] / this._verticalScale,
        ];

        return firstLayerInfo;
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
                if (pluginLayerIds.includes(layer.id)) {
                    throw new Error(
                        `Layer with id ${layer.id} is already registered by another plugin. This may lead to unexpected behavior. Make sure to use the makeLayerId method to create unique layer ids in your plugins.`,
                    );
                }
                this._layersIdPluginMap.set(layer.id, plugin);
                pluginLayerIds.push(layer.id);
            }
        }

        if ("verticalScale" in props) {
            this._verticalScale = props.verticalScale ?? 1;
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

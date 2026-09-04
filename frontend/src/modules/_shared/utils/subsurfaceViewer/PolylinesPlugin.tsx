import type { Layer, PickingInfo } from "@deck.gl/core";
import { Edit, Remove } from "@mui/icons-material";
import { isEqual } from "lodash-es";
import { v4 } from "uuid";

import addPathIcon from "@assets/add_path.cur?url";
import continuePathIcon from "@assets/continue_path.cur?url";
import removePathIcon from "@assets/remove_path.cur?url";

import { type PublishSubscribe, PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

import {
    AllowHoveringOf,
    EditablePolylineLayer,
    isEditablePolylineLayerPickingInfo,
} from "../../customDeckGlLayers/EditablePolylineLayer";
import { PolylinesLayer, isPolylinesLayerPickingInfo } from "../../customDeckGlLayers/PolylinesLayer";
import { lengthAlongAtXyPosition } from "../polylineHoverUtils";

import { type ContextMenuItem, type DeckGlInstanceManager, DeckGlPlugin } from "./DeckGlInstanceManager";

export type Polyline = {
    id: string;
    name: string;
    color: [number, number, number];
    path: number[][];
    version?: number;
};

export enum PolylineEditingMode {
    DRAW = "draw",
    ADD_POINT = "add_point",
    REMOVE_POINT = "remove_point",
    DISABLED = "disabled",
    IDLE = "idle",
}

export enum PolylinesPluginTopic {
    EDITING_POLYLINE_ID = "editing_polyline_id",
    EDITING_MODE = "editing_mode",
    POLYLINES = "polylines",
    POLYLINE_HOVER = "polyline_hover",
    // Fired when the committed `_polylines` set changes due to an explicit, deliberate
    // action (save or delete) - never on a mere mode/selection change or draft edit.
    POLYLINES_COMMITTED = "polylines_committed",
    // Fired whenever the in-progress draft (returned by getActivePolyline()) changes,
    // e.g. as points are added/removed/dragged. POLYLINES does not cover this, since the
    // draft is kept out of `_polylines` until it is saved.
    ACTIVE_POLYLINE = "active_polyline",
}

export type PolylinesPluginTopicPayloads = {
    [PolylinesPluginTopic.EDITING_MODE]: PolylineEditingMode;
    [PolylinesPluginTopic.EDITING_POLYLINE_ID]: string | null;
    [PolylinesPluginTopic.POLYLINES]: Polyline[];
    [PolylinesPluginTopic.POLYLINE_HOVER]: { polylineId: string; lengthAlong: number } | null;
    [PolylinesPluginTopic.POLYLINES_COMMITTED]: void;
    [PolylinesPluginTopic.ACTIVE_POLYLINE]: Polyline | undefined;
};

enum AppendToPathLocation {
    START = "start",
    END = "end",
}

function* defaultColorGenerator() {
    const colors: [number, number, number][] = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [255, 0, 255],
        [0, 255, 255],
    ];

    let index = 0;
    while (true) {
        yield colors[index];
        index = (index + 1) % colors.length;
    }
}

export class PolylinesPlugin extends DeckGlPlugin implements PublishSubscribe<PolylinesPluginTopicPayloads> {
    private _currentEditingPolylineId: string | null = null;
    private _currentEditingPolylinePathReferencePointIndex: number | null = null;
    // Live, uncommitted copy of the polyline currently being drawn/edited - new or pre-existing.
    // `_polylines` (the committed/persisted set) is only ever mutated by an explicit save or delete.
    private _editingPolylineDraft: Polyline | null = null;
    private _polylines: Polyline[] = [];
    private _editingMode: PolylineEditingMode = PolylineEditingMode.DISABLED;
    private _draggedPathPointIndex: number | null = null;
    private _appendToPathLocation: AppendToPathLocation = AppendToPathLocation.END;
    private _selectedPolylineId: string | null = null;
    private _hoverPoint: number[] | null = null;
    private _polylineHoverData: { polylineId: string; lengthAlong: number } | null = null;
    private _visiblePolylineIds: string[] = [];
    private _colorGenerator: Generator<[number, number, number]>;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<PolylinesPluginTopicPayloads>();

    private setCurrentEditingPolylineId(id: string | null, shouldRedraw = false): void {
        this._currentEditingPolylineId = id;
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.EDITING_POLYLINE_ID);
        if (shouldRedraw) {
            this.requireRedraw();
        }
        this.setReadoutSuppressed(this._currentEditingPolylineId !== null);
    }

    constructor(manager: DeckGlInstanceManager, colorGenerator?: Generator<[number, number, number]>) {
        super(manager);
        this._colorGenerator = colorGenerator ?? defaultColorGenerator();
    }

    setVisiblePolylineIds(visiblePolylineIds: string[]): void {
        this._visiblePolylineIds = visiblePolylineIds;
    }

    getActivePolyline(): Polyline | undefined {
        return this._editingPolylineDraft ?? undefined;
    }

    getPolylines(): Polyline[] {
        return this._polylines;
    }

    setPolylines(polylines: Polyline[]): void {
        if (isEqual(this._polylines, polylines)) {
            return;
        }
        this._polylines = polylines;
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES);
        this.requireRedraw();
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<PolylinesPluginTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    setEditingMode(mode: PolylineEditingMode): void {
        this._editingMode = mode;
        this.setReadoutSuppressed(this._currentEditingPolylineId !== null);
        this._hoverPoint = null;
        if (this._polylineHoverData !== null) {
            this._polylineHoverData = null;
            this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINE_HOVER);
        }
        if (mode === PolylineEditingMode.DISABLED) {
            this.discardActivePolyline();
        }
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.EDITING_MODE);
        if (mode === PolylineEditingMode.DISABLED) {
            this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES);
        }
        this.requireRedraw();
    }

    /**
     * Drops the in-progress edit/draft without touching the committed `_polylines` set.
     * Safe to call unconditionally - a no-op when nothing is being edited.
     */
    discardActivePolyline(): void {
        if (this._currentEditingPolylineId === null) {
            return;
        }
        this._editingPolylineDraft = null;
        this._currentEditingPolylinePathReferencePointIndex = null;
        this._selectedPolylineId = null;
        this.setCurrentEditingPolylineId(null);
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.ACTIVE_POLYLINE);
    }

    /**
     * Ends the in-progress edit/draft the way clicking away from it should: saves it if it
     * has enough points to be a valid polyline, otherwise discards it. Unlike
     * `discardActivePolyline()`, this never silently throws away a completed edit.
     */
    private finishActivePolylineEditing(): void {
        const draft = this._editingPolylineDraft;
        if (draft && draft.path.length >= 2) {
            this.saveActivePolyline(draft.name);
        } else {
            this.discardActivePolyline();
            this.setEditingMode(PolylineEditingMode.IDLE);
        }
    }

    /**
     * Commits the in-progress edit/draft into the committed `_polylines` set and requests
     * persistence. Requires at least two points - otherwise this is a no-op (the caller
     * should disable the save action in that case rather than relying on this guard alone).
     */
    saveActivePolyline(name: string): void {
        const draft = this._editingPolylineDraft;
        if (!draft || draft.path.length < 2) {
            return;
        }

        const finalizedPolyline: Polyline = { ...draft, name };
        const existingIndex = this._polylines.findIndex((polyline) => polyline.id === draft.id);
        if (existingIndex === -1) {
            this._polylines = [...this._polylines, finalizedPolyline];
        } else {
            this._polylines = this._polylines.map((polyline) =>
                polyline.id === draft.id ? finalizedPolyline : polyline,
            );
        }

        this._editingPolylineDraft = null;
        this._currentEditingPolylinePathReferencePointIndex = null;
        this._selectedPolylineId = null;
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES);
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.ACTIVE_POLYLINE);
        this.setEditingMode(PolylineEditingMode.IDLE);
        this.setCurrentEditingPolylineId(null);
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES_COMMITTED);
        this.requireRedraw();
    }

    getEditingMode(): PolylineEditingMode {
        return this._editingMode;
    }

    getPolylineHoverData(): { polylineId: string; lengthAlong: number } | null {
        return this._polylineHoverData;
    }

    getCurrentEditingPolylineId(): string | null {
        return this._currentEditingPolylineId;
    }

    handleKeyUpEvent(key: string): void {
        if (key === "Escape") {
            if (this._editingMode === PolylineEditingMode.DISABLED) {
                this._currentEditingPolylinePathReferencePointIndex = null;
                this.requireRedraw();
                return;
            }
            if (this._editingMode === PolylineEditingMode.IDLE) {
                this._currentEditingPolylinePathReferencePointIndex = null;
                this._hoverPoint = null;
                this.requireRedraw();
                return;
            }

            this._hoverPoint = null;
            this.setEditingMode(PolylineEditingMode.IDLE);
            return;
        }
        if (key === "Delete") {
            if (this._editingMode === PolylineEditingMode.IDLE) {
                if (this._selectedPolylineId) {
                    this._polylines = this._polylines.filter((polyline) => polyline.id !== this._selectedPolylineId);
                    this._selectedPolylineId = null;
                    this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES);
                    this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES_COMMITTED);
                    this.requireRedraw();
                }
                return;
            }
        }
    }

    handleLayerClick(pickingInfo: PickingInfo): void {
        if (this._editingMode === PolylineEditingMode.DISABLED || this._editingMode === PolylineEditingMode.IDLE) {
            if (isPolylinesLayerPickingInfo(pickingInfo)) {
                this._selectedPolylineId = pickingInfo.polylineId ?? null;
                this.requireRedraw();
            }
            return;
        }

        if (!isEditablePolylineLayerPickingInfo(pickingInfo)) {
            return;
        }

        const activePolyline = this.getActivePolyline();
        if (!activePolyline) {
            return;
        }

        if (pickingInfo.editableEntity?.type === "point") {
            if (![PolylineEditingMode.DRAW, PolylineEditingMode.REMOVE_POINT].includes(this._editingMode)) {
                return;
            }

            const index = pickingInfo.editableEntity.index;
            if (this._editingMode === PolylineEditingMode.DRAW) {
                if (
                    (index === 0 || index === activePolyline.path.length - 1) &&
                    this._currentEditingPolylinePathReferencePointIndex !== index
                ) {
                    this._appendToPathLocation = index === 0 ? AppendToPathLocation.START : AppendToPathLocation.END;
                    this._currentEditingPolylinePathReferencePointIndex = index;
                    this.requireRedraw();
                    return;
                }
            }

            const newPath = activePolyline.path.filter((_, i) => i !== index);
            let newReferencePathPointIndex: number | null = null;
            if (this._currentEditingPolylinePathReferencePointIndex !== null) {
                newReferencePathPointIndex = Math.max(0, this._currentEditingPolylinePathReferencePointIndex - 1);
                if (index > this._currentEditingPolylinePathReferencePointIndex) {
                    newReferencePathPointIndex = this._currentEditingPolylinePathReferencePointIndex;
                }
                if (activePolyline.path.length - 1 < 1) {
                    newReferencePathPointIndex = null;
                }
            }

            if (newPath.length === 0) {
                this.discardActivePolyline();
                this.setEditingMode(PolylineEditingMode.IDLE);
                return;
            }
            this.updateActivePolylinePath(newPath);
            this._currentEditingPolylinePathReferencePointIndex = newReferencePathPointIndex;
            this.requireRedraw();
            return;
        }

        if (pickingInfo.editableEntity?.type === "line") {
            if (![PolylineEditingMode.DRAW, PolylineEditingMode.ADD_POINT].includes(this._editingMode)) {
                return;
            }

            if (!pickingInfo.coordinate) {
                return;
            }

            const index = pickingInfo.editableEntity.index;
            const newPath = [...activePolyline.path];
            newPath.splice(index + 1, 0, [...pickingInfo.coordinate]);
            this.updateActivePolylinePath(newPath);

            let newReferencePathPointIndex: number | null = null;
            if (
                this._currentEditingPolylinePathReferencePointIndex !== null &&
                this._appendToPathLocation !== AppendToPathLocation.START
            ) {
                newReferencePathPointIndex = this._currentEditingPolylinePathReferencePointIndex + 1;
                if (index > this._currentEditingPolylinePathReferencePointIndex) {
                    newReferencePathPointIndex = this._currentEditingPolylinePathReferencePointIndex;
                }
            }

            this._currentEditingPolylinePathReferencePointIndex = newReferencePathPointIndex;
            this.requireRedraw();
        }
    }

    private updateActivePolylinePath(newPath: number[][]): void {
        if (!this._editingPolylineDraft || isEqual(this._editingPolylineDraft.path, newPath)) {
            return;
        }

        this._editingPolylineDraft = {
            ...this._editingPolylineDraft,
            path: newPath,
            version: (this._editingPolylineDraft.version ?? 0) + 1,
        };

        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.ACTIVE_POLYLINE);
    }

    handleClickAway(): boolean {
        if (this._editingMode === PolylineEditingMode.DISABLED) {
            return false;
        }
        this._selectedPolylineId = null;
        if (this._editingMode !== PolylineEditingMode.DRAW) {
            // The click terminated an active editing session. Consume it so it does not also
            // register as a pick/readout on whatever was under the cursor.
            const wasEditing = this._currentEditingPolylineId !== null;
            this.finishActivePolylineEditing();
            return wasEditing;
        }
        this.requireRedraw();
        return false;
    }

    handleLayerHover(pickingInfo: PickingInfo): void {
        if (this._editingMode !== PolylineEditingMode.IDLE) {
            return;
        }

        if (isPolylinesLayerPickingInfo(pickingInfo) && pickingInfo.polylineId && pickingInfo.coordinate) {
            const polyline = this._polylines.find((p) => p.id === pickingInfo.polylineId);
            if (!polyline || polyline.path.length < 2) {
                return;
            }

            const [x, y] = pickingInfo.coordinate;
            const lengthAlong = lengthAlongAtXyPosition(polyline.path, x, y);
            const newHoverData = { polylineId: polyline.id, lengthAlong };
            if (!isEqual(this._polylineHoverData, newHoverData)) {
                this._polylineHoverData = newHoverData;
                this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINE_HOVER);
            }
        }
    }

    handleGlobalMouseHover(pickingInfo: PickingInfo): void {
        if (this._editingMode === PolylineEditingMode.IDLE && this._polylineHoverData !== null) {
            this._polylineHoverData = null;
            this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINE_HOVER);
            return;
        }
        if (this._editingMode !== PolylineEditingMode.DRAW || !pickingInfo.coordinate) {
            return;
        }

        this._hoverPoint = pickingInfo.coordinate;
        this.requireRedraw();
    }

    private makeNewPolylineName(): string {
        const base = "New polyline";
        const existingNames = new Set(this._polylines.map((p) => p.name));

        if (!existingNames.has(base)) {
            return base;
        }

        for (let i = 1; i < 10000; i++) {
            const name = `${base} (${i})`;
            if (!existingNames.has(name)) {
                return name;
            }
        }

        throw new Error("Unable to generate unique polyline name");
    }

    handleGlobalMouseClick(pickingInfo: PickingInfo): boolean {
        if (this._editingMode === PolylineEditingMode.DISABLED) {
            return false;
        }

        if (!pickingInfo.coordinate) {
            return false;
        }

        const activePolyline = this.getActivePolyline();
        if (!activePolyline && this._editingMode === PolylineEditingMode.DRAW) {
            const id = v4();
            this._editingPolylineDraft = {
                id,
                name: this.makeNewPolylineName(),
                color: this._colorGenerator.next().value,
                path: [[...pickingInfo.coordinate]],
                version: 0,
            };
            this._currentEditingPolylinePathReferencePointIndex = 0;
            this.setCurrentEditingPolylineId(id, true);
            this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.ACTIVE_POLYLINE);
        } else if (activePolyline) {
            if (this._currentEditingPolylinePathReferencePointIndex === null) {
                this.finishActivePolylineEditing();
                return true;
            }

            if (this._editingMode === PolylineEditingMode.DRAW) {
                this.appendToActivePolylinePath(pickingInfo.coordinate);
                this.requireRedraw();
                return true;
            }
        }

        return false;
    }

    private appendToActivePolylinePath(point: number[]): void {
        const activePolyline = this.getActivePolyline();
        if (!activePolyline) {
            return;
        }

        const newPath = [...activePolyline.path];
        if (this._appendToPathLocation === AppendToPathLocation.START) {
            newPath.unshift(point);
            this._currentEditingPolylinePathReferencePointIndex = 0;
        } else {
            newPath.push(point);
            this._currentEditingPolylinePathReferencePointIndex = newPath.length - 1;
        }

        this.updateActivePolylinePath(newPath);
    }

    handleDragStart(pickingInfo: PickingInfo): void {
        if (!isEditablePolylineLayerPickingInfo(pickingInfo)) {
            return;
        }

        if (pickingInfo.editableEntity?.type === "point") {
            this._draggedPathPointIndex = pickingInfo.editableEntity.index;
            this.requestDisablePanning();
            this.setDragStart();
        }
    }

    handleDrag(pickingInfo: PickingInfo): void {
        if (this._draggedPathPointIndex === null || !pickingInfo.coordinate) {
            return;
        }

        const activePolyline = this.getActivePolyline();
        if (!activePolyline) {
            return;
        }

        // Take first layer under cursor to get coordinates for the polyline point
        // An alternative would be to store a reference to the layer the polyline was first created upon
        // and always try to use that layer to get the coordinates
        const layerUnderCursor = this.getFirstLayerUnderCursorInfo(pickingInfo.x, pickingInfo.y);
        if (!layerUnderCursor || !layerUnderCursor.coordinate) {
            return;
        }

        const newPath = [...activePolyline.path];
        newPath[this._draggedPathPointIndex] = [...layerUnderCursor.coordinate];
        this.updateActivePolylinePath(newPath);
        this.requireRedraw();
    }

    handleDragEnd(): void {
        this._draggedPathPointIndex = null;
        this.requestEnablePanning();
        this.setDragEnd();
    }

    getCursor(pickingInfo: PickingInfo): string | null {
        if (this._editingMode === PolylineEditingMode.DISABLED) {
            return null;
        }

        const activePolyline = this.getActivePolyline();

        if (isEditablePolylineLayerPickingInfo(pickingInfo) && pickingInfo.editableEntity) {
            if (
                [PolylineEditingMode.DRAW, PolylineEditingMode.ADD_POINT].includes(this._editingMode) &&
                pickingInfo.editableEntity.type === "line"
            ) {
                return `url("${addPathIcon}"), crosshair`;
            }

            if (
                activePolyline &&
                [PolylineEditingMode.DRAW, PolylineEditingMode.REMOVE_POINT].includes(this._editingMode) &&
                pickingInfo.editableEntity.type === "point"
            ) {
                const index = pickingInfo.index;
                if (
                    (index === 0 || index === activePolyline.path.length - 1) &&
                    index !== this._currentEditingPolylinePathReferencePointIndex &&
                    this._editingMode === PolylineEditingMode.DRAW
                ) {
                    return `url("${continuePathIcon}"), crosshair`;
                }

                return `url("${removePathIcon}"), crosshair`;
            }

            if (this._editingMode === PolylineEditingMode.IDLE && pickingInfo.editableEntity.type === "point") {
                return "grab";
            }
        }

        return "auto";
    }

    getContextMenuItems(pickingInfo: PickingInfo): ContextMenuItem[] {
        if (this._editingMode !== PolylineEditingMode.IDLE) {
            return [];
        }

        if (!isPolylinesLayerPickingInfo(pickingInfo) || !pickingInfo.polylineId) {
            return [];
        }

        return [
            {
                icon: <Edit />,
                label: "Edit",
                onClick: () => {
                    const polyline = this._polylines.find((p) => p.id === pickingInfo.polylineId);
                    if (!polyline) {
                        return;
                    }
                    this._editingPolylineDraft = { ...polyline, path: polyline.path.map((point) => [...point]) };
                    this.setCurrentEditingPolylineId(polyline.id, true);
                    this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.ACTIVE_POLYLINE);
                },
            },
            {
                icon: <Remove />,
                label: "Delete",
                onClick: () => {
                    this._polylines = this._polylines.filter((polyline) => polyline.id !== pickingInfo.polylineId);
                    // Deleting a polyline other than the one currently being edited must not
                    // touch the active editing session/draft. This should only be able to match
                    // the active id defensively, since the active polyline is excluded from the
                    // pickable layer this context menu is opened from.
                    if (pickingInfo.polylineId === this._currentEditingPolylineId) {
                        this.discardActivePolyline();
                    }
                    this.requireRedraw();
                    this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES);
                    this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.POLYLINES_COMMITTED);
                },
            },
        ];
    }

    getLayers(): Layer<any>[] {
        const layers: Layer<any>[] = [
            new PolylinesLayer({
                id: super.makeLayerId("polylines-layer"),
                polylines: this._polylines.filter(
                    (polyline) =>
                        polyline.id !== this._currentEditingPolylineId &&
                        (this._visiblePolylineIds.includes(polyline.id) ||
                            this._editingMode !== PolylineEditingMode.DISABLED),
                ),
                selectedPolylineId:
                    this._editingMode === PolylineEditingMode.DISABLED
                        ? undefined
                        : (this._selectedPolylineId ?? undefined),
                hoverable: this._editingMode === PolylineEditingMode.IDLE,
                visible: this._editingMode !== PolylineEditingMode.DISABLED,
            }),
        ];

        let allowHoveringOf = AllowHoveringOf.NONE;
        if ([PolylineEditingMode.DRAW, PolylineEditingMode.ADD_POINT].includes(this._editingMode)) {
            allowHoveringOf = AllowHoveringOf.LINES_AND_POINTS;
        }
        if (this._editingMode === PolylineEditingMode.REMOVE_POINT) {
            allowHoveringOf = AllowHoveringOf.POINTS;
        }

        const activePolyline = this.getActivePolyline();
        layers.push(
            new EditablePolylineLayer({
                id: super.makeLayerId("editable-polyline-layer"),
                polyline: activePolyline,
                polylineVersion: activePolyline?.version ?? 0,
                mouseHoverPoint: this._hoverPoint ?? undefined,
                referencePathPointIndex:
                    this._editingMode === PolylineEditingMode.DRAW
                        ? (this._currentEditingPolylinePathReferencePointIndex ?? undefined)
                        : undefined,
                onDragStart: this.handleDragStart.bind(this),
                onDragEnd: this.handleDragEnd.bind(this),
                allowHoveringOf,
                visible: activePolyline !== undefined,
                updateTriggers: {
                    renderLayers: [this._hoverPoint?.join(",") ?? ""],
                },
            }),
        );

        return layers;
    }

    makeSnapshotGetter<T extends PolylinesPluginTopic>(topic: T): () => PolylinesPluginTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === PolylinesPluginTopic.EDITING_MODE) {
                return this._editingMode;
            }
            if (topic === PolylinesPluginTopic.EDITING_POLYLINE_ID) {
                return this._currentEditingPolylineId;
            }
            if (topic === PolylinesPluginTopic.POLYLINES) {
                return this._polylines;
            }
            if (topic === PolylinesPluginTopic.POLYLINE_HOVER) {
                return this._polylineHoverData;
            }
            if (topic === PolylinesPluginTopic.POLYLINES_COMMITTED) {
                return undefined;
            }
            if (topic === PolylinesPluginTopic.ACTIVE_POLYLINE) {
                return this._editingPolylineDraft ?? undefined;
            }

            throw new Error(`Unknown topic ${topic}`);
        };

        return snapshotGetter;
    }
}

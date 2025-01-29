import addPathIcon from "@assets/add_path.svg";
import continuePathIcon from "@assets/continue_path.svg";
import removePathIcon from "@assets/remove_path.svg";
import { Layer, PickingInfo } from "@deck.gl/core";
import { PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { v4 } from "uuid";

import { ContextMenuItem, DeckGlPlugin } from "./DeckGlInstanceManager";

import {
    AllowHoveringOf,
    EditablePolylineLayer,
    isEditablePolylineLayerPickingInfo,
} from "../hooks/editablePolylines/deckGlLayers/EditablePolylineLayer";
import { PolylinesLayer, isPolylinesLayerPickingInfo } from "../hooks/editablePolylines/deckGlLayers/PolylinesLayer";

export type Polyline = {
    id: string;
    name: string;
    color: [number, number, number, number];
    path: number[][];
};

export enum PolylineEditingMode {
    DRAW = "draw",
    ADD_POINT = "add_point",
    REMOVE_POINT = "remove_point",
    NONE = "none",
    IDLE = "idle",
}

export enum PolylinesPluginTopic {
    EDITING_POLYLINE_CHANGE = "editing_polyline_change",
    EDITING_MODE_CHANGE = "editing_mode_change",
}

export type PolylinesPluginTopicPayloads = {
    [PolylinesPluginTopic.EDITING_MODE_CHANGE]: {
        editingMode: PolylineEditingMode;
    };
    [PolylinesPluginTopic.EDITING_POLYLINE_CHANGE]: {
        editingPolylineId: string | null;
    };
};

enum AppendToPathLocation {
    START = "start",
    END = "end",
}

export class PolylinesPlugin extends DeckGlPlugin {
    private _currentEditingPolylineId: string | null = null;
    private _currentEditingPolylinePathReferencePointIndex: number | null = null;
    private _polylines: Polyline[] = [];
    private _editingMode: PolylineEditingMode = PolylineEditingMode.NONE;
    private _draggedPathPointIndex: number | null = null;
    private _appendToPathLocation: AppendToPathLocation = AppendToPathLocation.END;
    private _selectedPolylineId: string | null = null;
    private _hoverPoint: number[] | null = null;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<PolylinesPluginTopicPayloads>();

    private setCurrentEditingPolylineId(id: string | null): void {
        this._currentEditingPolylineId = id;
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.EDITING_POLYLINE_CHANGE);
    }

    private getActivePolyline(): Polyline | undefined {
        return this._polylines.find((polyline) => polyline.id === this._currentEditingPolylineId);
    }

    setEditingMode(mode: PolylineEditingMode): void {
        this._editingMode = mode;
        if ([PolylineEditingMode.NONE, PolylineEditingMode.IDLE].includes(mode)) {
            this._hoverPoint = null;
            this._currentEditingPolylinePathReferencePointIndex = null;
        }
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.EDITING_MODE_CHANGE);
        this.requireRedraw();
    }

    getCurrentEditingPolylineId(): string | null {
        return this._currentEditingPolylineId;
    }

    handleKeyUpEvent(key: string): void {
        if (key === "Escape") {
            if (this._editingMode === PolylineEditingMode.NONE) {
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
            this.requireRedraw();
        }
    }

    handleLayerClick(pickingInfo: PickingInfo): void {
        if (this._editingMode === PolylineEditingMode.NONE || this._editingMode === PolylineEditingMode.IDLE) {
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
            if (this._currentEditingPolylinePathReferencePointIndex !== null) {
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
        const activePolyline = this.getActivePolyline();
        if (!activePolyline) {
            return;
        }

        this._polylines = this._polylines.map((polyline) => {
            if (polyline.id === activePolyline.id) {
                return {
                    ...polyline,
                    path: newPath,
                };
            }
            return polyline;
        });
    }

    handleClickAway(): void {
        this._selectedPolylineId = null;
        this.requireRedraw();
    }

    handleGlobalMouseHover(pickingInfo: PickingInfo): void {
        if (this._editingMode !== PolylineEditingMode.DRAW) {
            return;
        }

        if (!pickingInfo.coordinate) {
            return;
        }

        this._hoverPoint = pickingInfo.coordinate;
        this.requireRedraw();
    }

    handleGlobalMouseClick(pickingInfo: PickingInfo): boolean {
        if (this._editingMode === PolylineEditingMode.NONE) {
            return false;
        }

        if (!pickingInfo.coordinate) {
            return false;
        }

        const activePolyline = this.getActivePolyline();
        if (!activePolyline && this._editingMode === PolylineEditingMode.DRAW) {
            const id = v4();
            this._polylines.push({
                id,
                name: "New polyline",
                color: [255, 0, 0, 255],
                path: [[...pickingInfo.coordinate]],
            });
            this._polylines = [...this._polylines];
            this._currentEditingPolylinePathReferencePointIndex = 0;
            this.setCurrentEditingPolylineId(id);
            this.requireRedraw();
        } else if (activePolyline) {
            if (this._currentEditingPolylinePathReferencePointIndex === null) {
                this.setCurrentEditingPolylineId(null);
                this.setEditingMode(PolylineEditingMode.IDLE);
                this.requireRedraw();
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
            this._draggedPathPointIndex = pickingInfo.index;
            this.requestDisablePanning();
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
        if (!layerUnderCursor) {
            return;
        }

        const newPath = [...activePolyline.path];
        newPath[this._draggedPathPointIndex] = [...pickingInfo.coordinate];
        this.updateActivePolylinePath(newPath);
        this.requireRedraw();
    }

    handleDragEnd(): void {
        this._draggedPathPointIndex = null;
        this.requestEnablePanning();
    }

    getCursor(pickingInfo: PickingInfo): string | null {
        if (this._editingMode === PolylineEditingMode.NONE) {
            return null;
        }

        const activePolyline = this.getActivePolyline();

        if (isEditablePolylineLayerPickingInfo(pickingInfo) && pickingInfo.editableEntity) {
            if (
                [PolylineEditingMode.DRAW, PolylineEditingMode.ADD_POINT].includes(this._editingMode) &&
                pickingInfo.editableEntity.type === "line"
            ) {
                return `url(${addPathIcon}) 4 2, crosshair`;
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
                    return `url(${continuePathIcon}) 4 2, crosshair`;
                }

                return `url(${removePathIcon}) 4 2, crosshair`;
            }

            if (this._editingMode === PolylineEditingMode.IDLE) {
                return "pointer";
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
                label: "Edit",
                onClick: () => {
                    this.setCurrentEditingPolylineId(pickingInfo.polylineId ?? null);
                    this.requireRedraw();
                },
            },
            {
                label: "Delete",
                onClick: () => {
                    this._polylines = this._polylines.filter((polyline) => polyline.id !== pickingInfo.polylineId);
                    this.setCurrentEditingPolylineId(null);
                    this.requireRedraw();
                },
            },
        ];
    }

    getLayers(): Layer<any>[] {
        const layers: Layer<any>[] = [
            new PolylinesLayer({
                id: "polylines-layer",
                polylines: this._polylines.filter((polyline) => polyline.id !== this._currentEditingPolylineId),
                selectedPolylineId:
                    this._editingMode === PolylineEditingMode.NONE ? undefined : this._selectedPolylineId ?? undefined,
                hoverable: this._editingMode === PolylineEditingMode.IDLE,
            }),
        ];

        let allowHoveringOf = AllowHoveringOf.NONE;
        if (this._editingMode === PolylineEditingMode.DRAW) {
            allowHoveringOf = AllowHoveringOf.LINES_AND_POINTS;
        }
        if (this._editingMode === PolylineEditingMode.ADD_POINT) {
            allowHoveringOf = AllowHoveringOf.LINES;
        }
        if (this._editingMode === PolylineEditingMode.REMOVE_POINT) {
            allowHoveringOf = AllowHoveringOf.POINTS;
        }

        const activePolyline = this.getActivePolyline();
        if (activePolyline) {
            layers.push(
                new EditablePolylineLayer({
                    id: "editable-polylines-layer",
                    polyline: activePolyline,
                    mouseHoverPoint: this._hoverPoint ?? undefined,
                    referencePathPointIndex:
                        this._editingMode === PolylineEditingMode.DRAW
                            ? this._currentEditingPolylinePathReferencePointIndex ?? undefined
                            : undefined,
                    onDragStart: this.handleDragStart.bind(this),
                    onDragEnd: this.handleDragEnd.bind(this),
                    allowHoveringOf,
                })
            );
        }

        return layers;
    }

    protected makeSnapshot<T extends PolylinesPluginTopic>(topic: T): PolylinesPluginTopicPayloads[T] {
        if (topic === PolylinesPluginTopic.EDITING_MODE_CHANGE) {
            return {
                editingMode: this._editingMode,
            } as PolylinesPluginTopicPayloads[T];
        }
        if (topic === PolylinesPluginTopic.EDITING_POLYLINE_CHANGE) {
            return {
                editingPolylineId: this._currentEditingPolylineId,
            } as PolylinesPluginTopicPayloads[T];
        }

        throw new Error("Unknown topic");
    }
}

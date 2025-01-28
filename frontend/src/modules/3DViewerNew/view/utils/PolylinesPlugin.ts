import addPathIcon from "@assets/add_path.svg";
import continuePathIcon from "@assets/continue_path.svg";
import removePathIcon from "@assets/remove_path.svg";
import { Layer, PickingInfo } from "@deck.gl/core";
import { PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { DeckGlPlugin } from "./DeckGlInstanceManager";

import { isEditablePolylineLayerPickingInfo } from "../hooks/editablePolylines/deckGlLayers/EditablePolylineLayer";

export type Polyline = {
    id: string;
    name: string;
    color: [number, number, number, number];
    path: [number, number, number][];
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
    private _draggedPointIndex: number | null = null;
    private _appendToPathLocation: AppendToPathLocation = AppendToPathLocation.END;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<PolylinesPluginTopic>();

    private setCurrentEditingPolylineId(id: string | null): void {
        this._currentEditingPolylineId = id;
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.EDITING_POLYLINE_CHANGE);
    }

    private getActivePolyline(): Polyline | undefined {
        return this._polylines.find((polyline) => polyline.id === this._currentEditingPolylineId);
    }

    setEditingMode(mode: PolylineEditingMode): void {
        this._editingMode = mode;
        this._publishSubscribeDelegate.notifySubscribers(PolylinesPluginTopic.EDITING_MODE_CHANGE);
    }

    getCurrentEditingPolylineId(): string | null {
        return this._currentEditingPolylineId;
    }

    handleKeyUpEvent(key: string): void {
        if (key === "Escape") {
            if (this._editingMode === PolylineEditingMode.NONE) {
                this.setCurrentEditingPolylineId(null);
                this._currentEditingPolylinePathReferencePointIndex = null;
            }
            if (this._editingMode == PolylineEditingMode.IDLE) {
                this._currentEditingPolylinePathReferencePointIndex = null;
            }

            this._editingMode = PolylineEditingMode.IDLE;
        }
    }

    handleMouseClick(pickingInfo: PickingInfo): void {
        if (this._editingMode === PolylineEditingMode.NONE) {
            return;
        }
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

    getLayers(): Layer<any>[] {
        return [];
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

import { MapMouseEvent } from "@webviz/subsurface-viewer";

import { DeckGlPlugin } from "./DeckGlInstanceManager";

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

export class PolylinesPlugin extends DeckGlPlugin<PolylinesPluginTopic, PolylinesPluginTopicPayloads> {
    private _currentEditingPolylineId: string | null = null;
    private _currentEditingPolylinePathReferencePointIndex: number | null = null;
    private _polylines: Polyline[] = [];
    private _editingMode: PolylineEditingMode = PolylineEditingMode.NONE;
    private _draggedPointIndex: number | null = null;
    private _appendToPathLocation: AppendToPathLocation = AppendToPathLocation.END;

    private setCurrentEditingPolylineId(id: string | null): void {
        this._currentEditingPolylineId = id;
        super.getPublishSubscribeDelegate().notifySubscribers(PolylinesPluginTopic.EDITING_POLYLINE_CHANGE);
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

    handleMouseEvent(event: MapMouseEvent): void {
        if (this._editingMode === PolylineEditingMode.NONE) {
            return;
        }

        if (event.type === "click") {
            if (this._editingMode === PolylineEditingMode.DRAW) {
                this.setCurrentEditingPolylineId(null);
                this._editingMode = PolylineEditingMode.NONE;
            }
        }
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

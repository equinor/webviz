import { Controller, Layer, SchematicData, SchematicLayer } from "@equinor/esv-intersection";

import { HighlightOverlay } from "./HighlightOverlay";
import {
    Intersection,
    IntersectionHandler,
    IntersectionHandlerOptions,
    IntersectionHandlerTopic,
} from "./IntersectionHandler";

import { HighlightItem, LayerDataItem, ReadoutItem } from "../types/types";
import {
    makeHighlightItemFromIntersectionResult,
    makeReadoutItemFromIntersectionResult,
} from "../utils/intersectionConversion";
import { makeLayerDataItems } from "../utils/layerDataItems";
import { isSchematicLayer } from "../utils/layers";

export enum InteractionHandlerTopic {
    READOUT_ITEMS_CHANGE = "readout-items-change",
}

export type InteractionHandlerTopicPayload = {
    [InteractionHandlerTopic.READOUT_ITEMS_CHANGE]: {
        items: ReadoutItem[];
    };
};

export type InteractionHandlerOptions = {
    intersectionOptions: IntersectionHandlerOptions;
};

export class InteractionHandler {
    private _intersectionHandler: IntersectionHandler;
    private _highlightOverlay: HighlightOverlay;
    private _staticHighlightItems: HighlightItem[] = [];
    private _layerDataItems: LayerDataItem[] = [];
    private _schematicLayer: SchematicLayer<SchematicData> | null = null;
    private _subscribers: Map<InteractionHandlerTopic, Set<(payload: any) => void>> = new Map();

    constructor(controller: Controller, container: HTMLElement, options: InteractionHandlerOptions) {
        this._intersectionHandler = new IntersectionHandler(controller, options.intersectionOptions);
        this._highlightOverlay = new HighlightOverlay(container, controller);

        this._intersectionHandler.subscribe(IntersectionHandlerTopic.INTERSECTION, this.handleIntersection.bind(this));
    }

    addLayer(layer: Layer<any>) {
        if (isSchematicLayer(layer)) {
            this._schematicLayer = layer;
            return;
        }

        const layerDataObjects = makeLayerDataItems(layer);
        for (const layerDataObject of layerDataObjects) {
            this._intersectionHandler.addIntersectionItem(layerDataObject.intersectionItem);
        }
        this._layerDataItems.push(...layerDataObjects);
    }

    removeLayer(layerId: string) {
        if (this._schematicLayer && this._schematicLayer.id === layerId) {
            this._schematicLayer = null;
            return;
        }

        const layerDataObjectsToRemove = this._layerDataItems.filter(
            (layerDataObject) => layerDataObject.layer.id === layerId
        );
        this._layerDataItems = this._layerDataItems.filter((layerDataObject) => layerDataObject.layer.id !== layerId);

        for (const layerDataObject of layerDataObjectsToRemove) {
            this._intersectionHandler.removeIntersectionObject(layerDataObject.id);
        }
    }

    setStaticHighlightItems(highlightItems: HighlightItem[]) {
        this._staticHighlightItems = highlightItems;
        this._highlightOverlay.setHighlightItems([...this._staticHighlightItems]);
    }

    subscribe<T extends InteractionHandlerTopic>(
        topic: T,
        callback: (payload: InteractionHandlerTopicPayload[T]) => void
    ): () => void {
        const subscribers = this._subscribers.get(topic) || new Set();
        subscribers.add(callback);
        this._subscribers.set(topic, subscribers);

        return () => {
            subscribers.delete(callback);
        };
    }

    publish<T extends InteractionHandlerTopic>(topic: T, payload: InteractionHandlerTopicPayload[T]) {
        const subscribers = this._subscribers.get(topic) || new Set();
        for (const subscriber of subscribers) {
            subscriber(payload);
        }
    }

    destroy() {
        this._intersectionHandler.destroy();
        this._highlightOverlay.destroy();
    }

    private handleIntersection(payload: { intersections: Intersection[] }) {
        const highlightItems: HighlightItem[] = [];
        const readoutItems: ReadoutItem[] = [];

        let md: number | undefined;

        for (const intersection of payload.intersections) {
            const layerDataObject = this._layerDataItems.find(
                (layerDataObject) => layerDataObject.id === intersection.id
            );
            if (layerDataObject) {
                const highlightItem = makeHighlightItemFromIntersectionResult(
                    intersection.item,
                    layerDataObject.layer,
                    layerDataObject.index
                );
                highlightItems.push(highlightItem);

                const readoutItem = makeReadoutItemFromIntersectionResult(
                    intersection.item,
                    layerDataObject.layer,
                    layerDataObject.index
                );
                readoutItems.push(readoutItem);

                if (readoutItem.md) {
                    md = readoutItem.md;
                }
            }
        }

        // Schematics are a special case since we don't want to calculate MD multiple times
        if (md && this._schematicLayer && this._schematicLayer.data) {
            for (const key in this._schematicLayer.data) {
                const schematicArr = this._schematicLayer.data[key as keyof SchematicData];
                if (Array.isArray(schematicArr)) {
                    for (const [index, item] of schematicArr.entries()) {
                        if (!("start" in item) || !("end" in item)) {
                            continue;
                        }
                        if (md >= item.start && md <= item.end) {
                            const readoutItem: ReadoutItem = {
                                layer: this._schematicLayer,
                                index,
                                point: [0, 0],
                                md,
                                schematicType: key as keyof SchematicData,
                            };
                            readoutItems.push(readoutItem);
                        }
                    }
                }
            }
        }

        this._highlightOverlay.setHighlightItems([...this._staticHighlightItems, ...highlightItems]);

        this.publish(InteractionHandlerTopic.READOUT_ITEMS_CHANGE, { items: readoutItems });
    }
}

import React from "react";

import { QueryClient } from "@tanstack/query-core";

import { BaseLayer } from "./BaseLayer";

export enum LayerManagerTopic {
    LAYERS_CHANGED = "layers-changed",
}

export type LayerManagerTopicValueTypes = {
    [LayerManagerTopic.LAYERS_CHANGED]: BaseLayer<any, any>[];
};

export class LayerManager {
    private _queryClient: QueryClient | null = null;
    private _layers: BaseLayer<any, any>[] = [];
    private _subscribers: Map<LayerManagerTopic, Set<() => void>> = new Map();

    setQueryClient(queryClient: QueryClient): void {
        this._queryClient = queryClient;
    }

    addLayer(layer: BaseLayer<any, any>): void {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        layer.setName(this.makeUniqueLayerName(layer.getName()));
        layer.setQueryClient(this._queryClient);
        this._layers = [layer, ...this._layers];
        this.notifySubscribers(LayerManagerTopic.LAYERS_CHANGED);
    }

    removeLayer(id: string): void {
        this._layers = this._layers.filter((layer) => layer.getId() !== id);
        this.notifySubscribers(LayerManagerTopic.LAYERS_CHANGED);
    }

    getLayer(id: string): BaseLayer<any, any> | undefined {
        return this._layers.find((layer) => layer.getId() === id);
    }

    getLayers(): BaseLayer<any, any>[] {
        return this._layers;
    }

    changeOrder(order: string[]): void {
        this._layers = order
            .map((id) => this._layers.find((layer) => layer.getId() === id))
            .filter(Boolean) as BaseLayer<any, any>[];
        this.notifySubscribers(LayerManagerTopic.LAYERS_CHANGED);
    }

    subscribe(topic: LayerManagerTopic, subscriber: () => void): void {
        const subscribers = this._subscribers.get(topic) ?? new Set();
        subscribers.add(subscriber);
        this._subscribers.set(topic, subscribers);
    }

    private notifySubscribers(topic: LayerManagerTopic): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    private makeUniqueLayerName(name: string): string {
        let potentialName = name;
        let i = 1;
        while (this._layers.some((layer) => layer.getName() === potentialName)) {
            potentialName = `${name} (${i})`;
            i++;
        }
        return potentialName;
    }

    makeSubscriberFunction(topic: LayerManagerTopic): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const subscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const subscribers = this._subscribers.get(topic) || new Set();
            subscribers.add(onStoreChangeCallback);
            this._subscribers.set(topic, subscribers);

            return () => {
                subscribers.delete(onStoreChangeCallback);
            };
        };

        return subscriber;
    }

    makeSnapshotGetter<T extends LayerManagerTopic>(topic: T): () => LayerManagerTopicValueTypes[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerManagerTopic.LAYERS_CHANGED) {
                return this.getLayers();
            }
        };

        return snapshotGetter;
    }
}

export function useLayerManagerTopicValue<T extends LayerManagerTopic>(
    layerManager: LayerManager,
    topic: T
): LayerManagerTopicValueTypes[T] {
    const value = React.useSyncExternalStore<LayerManagerTopicValueTypes[T]>(
        layerManager.makeSubscriberFunction(topic),
        layerManager.makeSnapshotGetter(topic)
    );

    return value;
}

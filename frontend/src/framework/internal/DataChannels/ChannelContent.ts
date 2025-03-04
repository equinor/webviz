import type { DataElement, KeyType } from "@framework/DataChannelTypes";

export interface ChannelContentDefinition {
    readonly contentIdString: string;
    readonly displayName: string;
    readonly dataGenerator: DataGenerator;
}

export enum ChannelContentNotificationTopic {
    DATA_ARRAY_CHANGE = "data-array-change",
}

export interface ChannelContentMetaData {
    readonly ensembleIdentString: string;
    readonly unit?: string;
    readonly displayString?: string;
    readonly preferredColor?: string;
}

export type DataGenerator = () => DataGeneratorRet;

export type DataGeneratorRet = {
    data: DataElement<KeyType>[];
    metaData: ChannelContentMetaData;
};

export class ChannelContent {
    private _idString: string;
    private _displayName: string;
    private _dataGenerator: DataGenerator;
    private _cachedDataArray: DataElement<KeyType>[] | null = null;
    private _cachedMetaData: ChannelContentMetaData | null = null;
    private _subscribersMap: Map<ChannelContentNotificationTopic, Set<() => void>> = new Map();

    constructor(def: ChannelContentDefinition) {
        this._idString = def.contentIdString;
        this._displayName = def.displayName;
        this._dataGenerator = def.dataGenerator;
    }

    getIdString(): string {
        return this._idString;
    }

    getDisplayName(): string {
        return this._displayName;
    }

    publish(dataGenerator: DataGenerator): void {
        this._dataGenerator = dataGenerator;
        this._cachedDataArray = null;
        this._cachedMetaData = null;

        this.notifySubscribers(ChannelContentNotificationTopic.DATA_ARRAY_CHANGE);
    }

    private runDataGenerator(): void {
        const { data, metaData } = this._dataGenerator();
        this._cachedDataArray = data;
        this._cachedMetaData = metaData ?? null;
    }

    getDataArray(): DataElement<KeyType>[] {
        if (this._cachedDataArray === null) {
            this.runDataGenerator();
        }
        return this._cachedDataArray as DataElement<KeyType>[];
    }

    getMetaData(): ChannelContentMetaData {
        if (this._cachedMetaData === null) {
            this.runDataGenerator();
        }
        return this._cachedMetaData as ChannelContentMetaData;
    }

    subscribe(topic: ChannelContentNotificationTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: ChannelContentNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

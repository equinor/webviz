import { DataElement, KeyType } from "@framework/DataChannelTypes";

export interface ModuleChannelContentDefinition {
    idString: string;
    displayName: string;
}

export enum ModuleChannelContentNotificationTopic {
    DataArrayChange = "data-array-change",
}

export interface ModuleChannelContentMetaData {
    ensembleIdentString: string;
    unit?: string;
    displayString?: string;
    preferredColor?: string;
}

export type DataGenerator = () => {
    data: DataElement<KeyType>[];
    metaData: ModuleChannelContentMetaData;
};

export class ModuleChannelContent {
    private _idString: string;
    private _displayName: string;
    private _dataGenerator: DataGenerator;
    private _cachedDataArray: DataElement<KeyType>[] | null = null;
    private _cachedMetaData: ModuleChannelContentMetaData | null = null;
    private _subscribersMap: Map<ModuleChannelContentNotificationTopic, Set<() => void>> = new Map();

    constructor({
        idString,
        displayName,
        dataGenerator,
    }: {
        idString: string;
        displayName: string;
        dataGenerator: DataGenerator;
    }) {
        this._idString = idString;
        this._displayName = displayName;
        this._dataGenerator = dataGenerator;
    }

    getIdString(): string {
        return this._idString;
    }

    getDisplayName(): string {
        return this._displayName;
    }

    publish(
        dataGenerator: () => {
            data: DataElement<KeyType>[];
            metaData: ModuleChannelContentMetaData;
        }
    ): void {
        this._dataGenerator = dataGenerator;
        this._cachedDataArray = null;
        this._cachedMetaData = null;

        this.notifySubscribers(ModuleChannelContentNotificationTopic.DataArrayChange);
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

    getMetaData(): ModuleChannelContentMetaData {
        if (this._cachedMetaData === null) {
            this.runDataGenerator();
        }
        return this._cachedMetaData as ModuleChannelContentMetaData;
    }

    subscribe(topic: ModuleChannelContentNotificationTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: ModuleChannelContentNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

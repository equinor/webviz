import { DataElement, KeyType } from "@framework/DataChannelTypes";

export interface ModuleChannelContentDefinition {
    idString: string;
    displayName: string;
}

export enum ModuleChannelContentNotificationTopic {
    DataArrayChange = "data-array-change",
}

export class ModuleChannelContent {
    private _idString: string;
    private _displayName: string;
    private _dataGenerator: () => {
        data: DataElement<KeyType>[];
        metaData?: Record<string, string | number>;
    };
    private _cachedDataArray: DataElement<KeyType>[] | null = null;
    private _cachedMetaData: Record<string, string | number> | null = null;
    private _subscribersMap: Map<ModuleChannelContentNotificationTopic, Set<() => void>> = new Map();

    constructor({
        idString,
        displayName,
        dataGenerator,
    }: {
        idString: string;
        displayName: string;
        dataGenerator: () => {
            data: DataElement<KeyType>[];
            metaData?: Record<string, string | number>;
        };
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
            metaData?: Record<string, string | number>;
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

    getMetaData(): Record<string, string | number> | null {
        if (this._cachedMetaData === null) {
            this.runDataGenerator();
        }
        return this._cachedMetaData;
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

import { Data } from "../../DataChannelTypes";

export interface ContentDefinition {
    ident: string;
    name: string;
}

export enum ContentTopic {
    ContentChange = "content-change",
}

export class Content<TMetaData> {
    private _cachedDataArray: (TMetaData extends undefined ? Data[] : { data: Data[]; metaData: TMetaData }) | null =
        null;
    private _subscribersMap: Map<ContentTopic, Set<() => void>> = new Map();

    constructor(
        private _ident: string,
        private _name: string,
        private _dataGenerator: () => TMetaData extends undefined ? Data[] : { data: Data[]; metaData: TMetaData }
    ) {}

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    publish(dataGenerator: () => TMetaData extends undefined ? Data[] : { data: Data[]; metaData: TMetaData }): void {
        this._dataGenerator = dataGenerator;
        this._cachedDataArray = null;
        this.notifySubscribers(ContentTopic.ContentChange);
    }

    getDataArray(): Data[] {
        if (this._cachedDataArray === null) {
            this._cachedDataArray = this._dataGenerator();
        }
        if (typeof this._cachedDataArray === "object" && "data" in this._cachedDataArray) {
            return this._cachedDataArray.data;
        }
        return this._cachedDataArray;
    }

    getMetaData(): TMetaData | undefined {
        if (this._cachedDataArray === null) {
            this._cachedDataArray = this._dataGenerator();
        }
        if (typeof this._cachedDataArray === "object" && "metaData" in this._cachedDataArray) {
            return this._cachedDataArray.metaData;
        }
        return undefined;
    }

    subscribe(topic: ContentTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: ContentTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

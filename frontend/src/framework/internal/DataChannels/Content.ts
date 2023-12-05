import { Data, Type, TypeToTypeScriptTypeMapping } from "../../DataChannelTypes";

export interface ContentDefinition {
    ident: string;
    name: string;
}

export enum ContentTopic {
    ContentChange = "content-change",
}

export class Content {
    private _cachedDataArray: {
        data: Data<Type, Type>[];
        metaData?: Record<string, TypeToTypeScriptTypeMapping[Type]>;
    } | null = null;
    private _subscribersMap: Map<ContentTopic, Set<() => void>> = new Map();

    constructor(
        private _ident: string,
        private _name: string,
        private _dataGenerator: () => {
            data: Data<Type, Type>[];
            metaData?: Record<string, TypeToTypeScriptTypeMapping[Type]>;
        }
    ) {}

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    publish(
        dataGenerator: () => { data: Data<Type, Type>[]; metaData?: Record<string, TypeToTypeScriptTypeMapping[Type]> }
    ): void {
        this._dataGenerator = dataGenerator;
        this._cachedDataArray = null;
        this.notifySubscribers(ContentTopic.ContentChange);
    }

    getDataArray(): Data<Type, Type>[] {
        if (this._cachedDataArray === null) {
            this._cachedDataArray = this._dataGenerator();
        }
        if (typeof this._cachedDataArray === "object" && "data" in this._cachedDataArray) {
            return this._cachedDataArray.data;
        }
        return this._cachedDataArray;
    }

    getMetaData(): Record<string, TypeToTypeScriptTypeMapping[Type]> | null {
        if (this._cachedDataArray === null) {
            this._cachedDataArray = this._dataGenerator();
        }
        if (typeof this._cachedDataArray === "object" && "metaData" in this._cachedDataArray) {
            return this._cachedDataArray.metaData ?? null;
        }
        return null;
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

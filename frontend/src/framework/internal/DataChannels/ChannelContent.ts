import type { ChannelContentMetaData, DataElement, KeyType } from "@framework/types/dataChannnel";

export interface ChannelContentDefinition {
    readonly contentIdString: string;
    readonly displayName: string;
    readonly dataGenerator: DataGenerator;
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
}

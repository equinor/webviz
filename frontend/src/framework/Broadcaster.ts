import { EnsembleIdent } from "@framework/EnsembleIdent";

export enum BroadcastChannelKeyCategory {
    TimestampMs = "timestampms",
    Realization = "realization",
    GridIndex = "grid-index",
    GridIJK = "grid-ijk",
    MeasuredDepth = "measured-depth",
}

export enum BroadcastChannelValueType {
    Numeric = "numeric",
    String = "string",
}

enum Type {
    Number = "number",
    String = "string",
    NumberTriplet = "number-triplet",
}

const BroadcastChannelKeyCategoryToTypeMap = {
    [BroadcastChannelKeyCategory.TimestampMs]: Type.Number,
    [BroadcastChannelKeyCategory.Realization]: Type.Number,
    [BroadcastChannelKeyCategory.GridIndex]: Type.Number,
    [BroadcastChannelKeyCategory.GridIJK]: Type.NumberTriplet,
    [BroadcastChannelKeyCategory.MeasuredDepth]: Type.Number,
};

const BroadcastChannelValueTypeToTypeMap = {
    [BroadcastChannelValueType.Numeric]: Type.Number,
    [BroadcastChannelValueType.String]: Type.String,
};

function checkValueIsExpectedType(value: any, type: Type): boolean {
    if (type === Type.Number) {
        return typeof value === "number";
    }

    if (type === Type.String) {
        return typeof value === "string";
    }

    if (type === Type.NumberTriplet) {
        if (!Array.isArray(value)) {
            return false;
        }

        if (value.length !== 3) {
            return false;
        }

        return value.every((v) => typeof v === "number");
    }

    throw new Error(`Unknown type '${type}'`);
}

export type BroadcastChannelDef = {
    key: BroadcastChannelKeyCategory;
    value: BroadcastChannelValueType;
};

export type BroadcastChannelsDef = {
    [key: string]: BroadcastChannelDef;
};

export type BroadcastChannelMeta = {
    ensembleIdent: EnsembleIdent;
    description: string;
    unit: string;
};

export type BroadcastChannelData = {
    key: number | [number, number, number];
    value: number | string;
};

export type BroadcastChannelInputDef = {
    name: string;
    displayName: string;
    keyCategories?: BroadcastChannelKeyCategory[];
};

export function checkChannelCompatibility(
    channelDef1: BroadcastChannelDef,
    channelKeyCategory: BroadcastChannelKeyCategory
): boolean {
    if (channelDef1.key !== channelKeyCategory) {
        return false;
    }

    return true;
}

export class BroadcastChannel {
    private _name: string;
    private _metaData: BroadcastChannelMeta | null;
    private _moduleInstanceId: string;
    private _subscribers: Set<(data: BroadcastChannelData[], metaData: BroadcastChannelMeta) => void>;
    private _cachedData: BroadcastChannelData[] | null;
    private _dataDef: BroadcastChannelDef;
    private _dataGenerator: (() => BroadcastChannelData[]) | null;

    constructor(name: string, def: BroadcastChannelDef, moduleInstanceId: string) {
        this._name = name;
        this._subscribers = new Set();
        this._cachedData = null;
        this._dataDef = def;
        this._dataGenerator = null;
        this._metaData = null;
        this._moduleInstanceId = moduleInstanceId;
    }

    private makeExceptionMessage(keyOrValue: "Key" | "Value", value: string, expectedType: string): string {
        return `Generated data is not compatible with channel definition. ${keyOrValue} '${
            typeof value === "string" ? `"${value}"` : value
        }' at index 0 is not compatible with channel ${keyOrValue.toLowerCase()} definition of type '${expectedType}'.\n\nChannel definition: ${JSON.stringify(
            this._dataDef
        )}\nModule: ${this._moduleInstanceId}\nChannel name: ${this._name}`;
    }

    private assertGeneratedDataMatchesDefinition(data: BroadcastChannelData[]): void {
        if (data.length === 0) {
            return;
        }

        const expectedKeyType = BroadcastChannelKeyCategoryToTypeMap[this._dataDef.key];
        if (!checkValueIsExpectedType(data[0].key, expectedKeyType)) {
            throw new Error(this.makeExceptionMessage("Key", data[0].key.toString(), expectedKeyType));
        }

        const expectedValueType = BroadcastChannelValueTypeToTypeMap[this._dataDef.value];
        if (!checkValueIsExpectedType(data[0].value, expectedValueType)) {
            throw new Error(this.makeExceptionMessage("Value", data[0].value.toString(), expectedValueType));
        }
    }

    private generateAndVerifyData(dataGenerator: () => BroadcastChannelData[]): BroadcastChannelData[] {
        const generatedData = dataGenerator();

        this.assertGeneratedDataMatchesDefinition(generatedData);

        return generatedData;
    }

    public getName(): string {
        return this._name;
    }

    public getDataDef(): BroadcastChannelDef {
        return this._dataDef;
    }

    public getMetaData(): BroadcastChannelMeta {
        if (!this._metaData) {
            throw new Error("No meta data");
        }
        return this._metaData;
    }

    public getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    public broadcast(metaData: BroadcastChannelMeta, dataGenerator: () => BroadcastChannelData[]): void {
        this._dataGenerator = dataGenerator;
        this._metaData = metaData;

        if (this._subscribers.size === 0) {
            return;
        }

        this._cachedData = this.generateAndVerifyData(dataGenerator);

        for (const cb of this._subscribers) {
            cb(this._cachedData, this._metaData);
        }
    }

    public subscribe(
        callbackChannelDataChanged: (data: BroadcastChannelData[], metaData: BroadcastChannelMeta) => void
    ): () => void {
        this._subscribers.add(callbackChannelDataChanged);

        if (this._subscribers.size === 1 && this._dataGenerator) {
            this._cachedData = this.generateAndVerifyData(this._dataGenerator);
        }

        if (this._cachedData && this._metaData) {
            callbackChannelDataChanged(this._cachedData, this._metaData);
        }

        return () => {
            this._subscribers.delete(callbackChannelDataChanged);
        };
    }
}

export class Broadcaster {
    private _channels: BroadcastChannel[];
    private _subscribers: Set<(channels: BroadcastChannel[]) => void>;

    constructor() {
        this._channels = [];
        this._subscribers = new Set();
    }

    public registerChannel(
        channelName: string,
        channelDef: BroadcastChannelDef,
        moduleInstanceId: string
    ): BroadcastChannel {
        const channel = new BroadcastChannel(channelName, channelDef, moduleInstanceId);
        this._channels.push(channel);
        this.notifySubscribersAboutChannelsChanges();
        return channel;
    }

    public unregisterAllChannelsForModuleInstance(moduleInstanceId: string): void {
        this._channels = this._channels.filter((c) => c.getModuleInstanceId() !== moduleInstanceId);
        this.notifySubscribersAboutChannelsChanges();
    }

    public getChannel(channelName: string): BroadcastChannel | null {
        const channel = this._channels.find((c) => c.getName() === channelName);
        if (!channel) {
            return null;
        }

        return channel as BroadcastChannel;
    }

    public getChannelNames(): string[] {
        return this._channels.map((c) => c.getName());
    }

    public subscribeToChannelsChanges(cb: (channels: BroadcastChannel[]) => void): () => void {
        this._subscribers.add(cb);
        cb(this._channels);
        return () => {
            this._subscribers.delete(cb);
        };
    }

    private notifySubscribersAboutChannelsChanges() {
        for (const cb of this._subscribers) {
            cb(this._channels);
        }
    }
}

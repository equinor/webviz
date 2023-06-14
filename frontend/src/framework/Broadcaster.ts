import { EnsembleIdent } from "@framework/utils/ensembleIdent";

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

interface Type {
    test(value: any): boolean;
}

class TypeArray implements Type {
    private _type: Type | undefined;
    private _length: number | undefined;

    constructor(type?: Type, length?: number) {
        this._type = type;
        this._length = length;
    }

    public test(value: any): boolean {
        if (!Array.isArray(value)) {
            return false;
        }

        if (this._length && value.length !== this._length) {
            return false;
        }

        if (this._type) {
            return value.every((item) => {
                if (this._type) {
                    return this._type.test(item);
                }
                return true;
            });
        }

        return true;
    }

    public toString(): string {
        return `Array<${this._type ? this._type.toString() : "any"}>(length: ${this._length})`;
    }
}

class TypeNumber implements Type {
    public test(value: any): boolean {
        return typeof value === "number";
    }

    public toString(): string {
        return "number";
    }
}

class TypeString implements Type {
    public test(value: any): boolean {
        return typeof value === "string";
    }

    public toString(): string {
        return "string";
    }
}

export const BroadcastChannelKeyMeta = {
    [BroadcastChannelKeyCategory.TimestampMs]: { type: new TypeNumber() },
    [BroadcastChannelKeyCategory.Realization]: { type: new TypeNumber() },
    [BroadcastChannelKeyCategory.GridIndex]: { type: new TypeNumber() },
    [BroadcastChannelKeyCategory.GridIJK]: { type: new TypeArray(new TypeNumber(), 3) },
    [BroadcastChannelKeyCategory.MeasuredDepth]: { type: new TypeNumber() },
};

export const BroadcastChannelValueTypeMeta = {
    [BroadcastChannelValueType.Numeric]: { type: new TypeNumber() },
    [BroadcastChannelValueType.String]: { type: new TypeString() },
};

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
    private _dataChangeSubscribers: Set<(data: BroadcastChannelData[], metaData: BroadcastChannelMeta) => void>;
    private _removalSubscribers: Set<() => void>;
    private _cachedData: BroadcastChannelData[] | null;
    private _dataDef: BroadcastChannelDef;
    private _dataGenerator: (() => BroadcastChannelData[]) | null;

    constructor(name: string, def: BroadcastChannelDef, moduleInstanceId: string) {
        this._name = name;
        this._dataChangeSubscribers = new Set();
        this._removalSubscribers = new Set();
        this._cachedData = null;
        this._dataDef = def;
        this._dataGenerator = null;
        this._metaData = null;
        this._moduleInstanceId = moduleInstanceId;
    }

    private verifyGeneratedData(data: BroadcastChannelData[]): void {
        if (data.length === 0) {
            return;
        }

        data.forEach((item, index) => {
            if (!BroadcastChannelKeyMeta[this._dataDef.key].type.test(item.key)) {
                throw new Error(
                    `Generated data is not compatible with channel definition. Key '${
                        typeof item.key === "string" ? `"${item.key}"` : item.key
                    }' at index ${index} is not compatible with channel key definition of type '${BroadcastChannelKeyMeta[
                        this._dataDef.key
                    ].type.toString()}'.\n\nChannel definition: ${JSON.stringify(this._dataDef)}`
                );
            }

            if (!BroadcastChannelValueTypeMeta[this._dataDef.value].type.test(item.value)) {
                throw new Error(
                    `Generated data is not compatible with channel definition. Value '${
                        typeof item.value === "string" ? `"${item.value}"` : item.value
                    }' at index ${index} is not compatible with channel value definition of type '${BroadcastChannelValueTypeMeta[
                        this._dataDef.value
                    ].type.toString()}'.\n\nChannel definition: ${JSON.stringify(this._dataDef)}`
                );
            }
        });
    }

    private generateAndVerifyData(dataGenerator: () => BroadcastChannelData[]): BroadcastChannelData[] {
        const generatedData = dataGenerator();

        this.verifyGeneratedData(generatedData);

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

        if (this._dataChangeSubscribers.size === 0) {
            return;
        }

        this._cachedData = this.generateAndVerifyData(dataGenerator);

        for (const cb of this._dataChangeSubscribers) {
            cb(this._cachedData, this._metaData);
        }
    }

    public subscribe(
        callbackChannelDataChanged: (data: BroadcastChannelData[], metaData: BroadcastChannelMeta) => void,
        callbackChannelRemoved: () => void
    ): () => void {
        this._dataChangeSubscribers.add(callbackChannelDataChanged);
        this._removalSubscribers.add(callbackChannelRemoved);

        if (this._dataChangeSubscribers.size === 1 && this._dataGenerator) {
            this._cachedData = this.generateAndVerifyData(this._dataGenerator);
        }

        if (this._cachedData && this._metaData) {
            callbackChannelDataChanged(this._cachedData, this._metaData);
        }

        return () => {
            this._dataChangeSubscribers.delete(callbackChannelDataChanged);
            this._removalSubscribers.delete(callbackChannelRemoved);
        };
    }

    public onRemoval(): void {
        for (const cb of this._removalSubscribers) {
            cb();
        }
    }
}

class Broadcaster {
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
        const channel = this._channels.find((c) => c.getModuleInstanceId() === moduleInstanceId);
        if (!channel) {
            return;
        }

        channel.onRemoval();

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

export const broadcaster = new Broadcaster();

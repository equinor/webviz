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

export type BroadcastChannelKeyMeta = {
    [BroadcastChannelKeyCategory.TimestampMs]: { type: number };
    [BroadcastChannelKeyCategory.Realization]: { type: number };
    [BroadcastChannelKeyCategory.GridIndex]: { type: number };
    [BroadcastChannelKeyCategory.GridIJK]: { type: [number, number, number] };
    [BroadcastChannelKeyCategory.MeasuredDepth]: { type: number };
};

export type BroadcastChannelValueTypeMeta = {
    [BroadcastChannelValueType.Numeric]: { type: number };
    [BroadcastChannelValueType.String]: { type: string };
};

export type BroadcastChannelDef = {
    key: BroadcastChannelKeyCategory;
    value: BroadcastChannelValueType;
};

export type BroadcastChannelsDef = {
    [key: string]: BroadcastChannelDef;
};

export type BroadcastChannelMeta = {
    ensemble: string;
    description: string;
    unit: string;
};

export type MapDataTypeToTSType<DT extends BroadcastChannelDef> = {
    key: BroadcastChannelKeyMeta[DT["key"]]["type"];
    value: BroadcastChannelValueTypeMeta[DT["value"]]["type"];
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

export class BroadcastChannel<D extends BroadcastChannelDef> {
    private _name: string;
    private _metaData: BroadcastChannelMeta;
    private _moduleInstanceId: string;
    private _subscribers: Set<(data: MapDataTypeToTSType<D>[], metaData: BroadcastChannelMeta) => void>;
    private _cachedData: MapDataTypeToTSType<D>[] | null;
    private _dataDef: BroadcastChannelDef;
    private _dataGenerator: (() => MapDataTypeToTSType<D>[]) | null;

    constructor(name: string, def: BroadcastChannelDef, moduleInstanceId: string) {
        this._name = name;
        this._subscribers = new Set();
        this._cachedData = null;
        this._dataDef = def;
        this._dataGenerator = null;
        this._metaData = {
            ensemble: "",
            description: "",
            unit: "",
        };
        this._moduleInstanceId = moduleInstanceId;
    }

    public getName(): string {
        return this._name;
    }

    public getDataDef(): BroadcastChannelDef {
        return this._dataDef;
    }

    public getMetaData(): BroadcastChannelMeta {
        return this._metaData;
    }

    public getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    public broadcast(metaData: BroadcastChannelMeta, dataGenerator: () => MapDataTypeToTSType<D>[]) {
        this._dataGenerator = dataGenerator;
        this._metaData = metaData;

        if (this._subscribers.size === 0) {
            return;
        }

        this._cachedData = dataGenerator();

        console.log("Broadcasting on channel:", this._name, "Data:", this._cachedData);

        for (const cb of this._subscribers) {
            cb(this._cachedData, this._metaData);
        }
    }

    public subscribe(cb: (data: MapDataTypeToTSType<D>[], metaData: BroadcastChannelMeta) => void) {
        this._subscribers.add(cb);

        if (this._subscribers.size === 1 && this._dataGenerator) {
            this._cachedData = this._dataGenerator();
        }

        if (this._cachedData) {
            cb(this._cachedData, this._metaData);
        }

        return () => {
            this._subscribers.delete(cb);
        };
    }
}

class Broadcaster {
    private _channels: BroadcastChannel<any>[];
    private _subscribers: Set<(channels: BroadcastChannel<any>[]) => void>;

    constructor() {
        this._channels = [];
        this._subscribers = new Set();
    }

    public registerChannel<D extends BroadcastChannelDef>(
        channelName: string,
        channelDef: BroadcastChannelDef,
        moduleInstanceId: string
    ): BroadcastChannel<D> {
        const channel = new BroadcastChannel<D>(channelName, channelDef, moduleInstanceId);
        this._channels.push(channel);
        this.notifySubscribersAboutChannelsChanges();
        return channel;
    }

    public broadcast(channelName: string, metaData: BroadcastChannelMeta, dataGenerator: () => any) {
        const channel = this._channels.find((c) => c.getName() === channelName);
        if (!channel) {
            return;
        }

        channel.broadcast(metaData, dataGenerator);
    }

    public getChannel<D extends BroadcastChannelDef>(channelName: string): BroadcastChannel<D> | null {
        const channel = this._channels.find((c) => c.getName() === channelName);
        if (!channel) {
            return null;
        }

        return channel as BroadcastChannel<D>;
    }

    public getChannelNames(): string[] {
        return this._channels.map((c) => c.getName());
    }

    public subscribeToChannelsChanges(cb: (channels: BroadcastChannel<any>[]) => void): () => void {
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

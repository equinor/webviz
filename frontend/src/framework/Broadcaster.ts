export enum BroadcastChannelDataTypes {
    datetime = "datetime",
    realization = "realization",
    value = "value",
}

export enum BroadcastChannelDataFormat {
    Array = "array",
    Object = "object",
}

export type BroadcastChannelDataTypesMapping = {
    [BroadcastChannelDataTypes.datetime]: number;
    [BroadcastChannelDataTypes.realization]: number;
    [BroadcastChannelDataTypes.value]: number;
};

export type MapDataTypeToTSType<DT extends Record<string, BroadcastChannelDataTypes>> = {
    [key in keyof DT]: BroadcastChannelDataTypesMapping[DT[key]];
};

export type BroadcastChannelDef = {
    type: BroadcastChannelDataFormat;
    data: {
        [key: string]: BroadcastChannelDataTypes;
    };
};

export type BroadcastChannelsDef = {
    [key: string]: BroadcastChannelDef;
};

export class BroadcastChannel<D extends BroadcastChannelDef> {
    private _name: string;
    private _subscribers: Set<
        (
            data: D["type"] extends BroadcastChannelDataFormat.Array
                ? MapDataTypeToTSType<D["data"]>[]
                : MapDataTypeToTSType<D["data"]>
        ) => void
    >;
    private _cachedData:
        | (D["type"] extends BroadcastChannelDataFormat.Array
              ? MapDataTypeToTSType<D["data"]>[]
              : MapDataTypeToTSType<D["data"]>)
        | null;
    private _dataDef: BroadcastChannelDef;

    constructor(name: string, def: BroadcastChannelDef) {
        this._name = name;
        this._subscribers = new Set();
        this._cachedData = null;
        this._dataDef = def;
    }

    public getName() {
        return this._name;
    }

    public getDataDef() {
        return this._dataDef;
    }

    public broadcast(
        data: D["type"] extends BroadcastChannelDataFormat.Array
            ? MapDataTypeToTSType<D["data"]>[]
            : MapDataTypeToTSType<D["data"]>
    ) {
        this._cachedData = data;

        console.log("Broadcasting on channel:", this._name, "Data:", data);

        for (const cb of this._subscribers) {
            cb(data);
        }
    }

    public subscribe(
        cb: (
            data: D["type"] extends BroadcastChannelDataFormat.Array
                ? MapDataTypeToTSType<D["data"]>[]
                : MapDataTypeToTSType<D["data"]>
        ) => void
    ) {
        this._subscribers.add(cb);

        if (this._cachedData) {
            cb(this._cachedData);
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
        channelDef: BroadcastChannelDef
    ): BroadcastChannel<D> {
        const channel = new BroadcastChannel<D>(channelName, channelDef);
        this._channels.push(channel);
        this.notifySubscribersAboutChannelsChanges();
        return channel;
    }

    public broadcast(channelName: string, data: any) {
        const channel = this._channels.find((c) => c.getName() === channelName);
        if (!channel) {
            return;
        }

        channel.broadcast(data);
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

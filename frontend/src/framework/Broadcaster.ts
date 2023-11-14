import { EnsembleIdent } from "@framework/EnsembleIdent";

export enum Genre {
    TimestampMs = "timestampms",
    Realization = "realization",
    GridIndex = "grid-index",
    GridIJK = "grid-ijk",
    MeasuredDepth = "measured-depth",
}

export enum GenreContent {
    Numeric = "numeric",
    String = "string",
}

enum Type {
    Number = "number",
    String = "string",
    NumberTriplet = "number-triplet",
}

const GenreToTypeMapping = {
    [Genre.TimestampMs]: Type.Number,
    [Genre.Realization]: Type.Number,
    [Genre.GridIndex]: Type.Number,
    [Genre.GridIJK]: Type.NumberTriplet,
    [Genre.MeasuredDepth]: Type.Number,
};

const GenreContentToTypeMapping = {
    [GenreContent.Numeric]: Type.Number,
    [GenreContent.String]: Type.String,
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

export type Broadcaster = {
    name: string;
    genre: Genre;
}

export type OutputChannel = {
    name: string;
    key: Genre;
    value: GenreContent;
};

export type ChannelMeta = {
    ensembleIdent: EnsembleIdent;
    description: string;
    unit: string;
};

export type ChannelData = {
    key: number | [number, number, number];
    value: number | string;
};

export type InputChannel = {
    name: string;
    displayName: string;
    keyCategories?: Genre[];
};

export function checkChannelCompatibility(channelDef: OutputChannel, channelKeyCategory: Genre): boolean {
    if (channelDef.key !== channelKeyCategory) {
        return false;
    }

    return true;
}

export class BroadcastChannel {
    private _name: string;
    private _displayName: string;
    private _metaData: ChannelMeta | null;
    private _moduleInstanceId: string;
    private _subscribers: Set<(data: ChannelData[], metaData: ChannelMeta) => void>;
    private _cachedData: ChannelData[] | null;
    private _dataDef: OutputChannel;
    private _dataGenerator: (() => ChannelData[]) | null;

    constructor(name: string, displayName: string, def: OutputChannel, moduleInstanceId: string) {
        this._name = name;
        this._displayName = displayName;
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

    private assertGeneratedDataMatchesDefinition(data: ChannelData[]): void {
        if (data.length === 0) {
            return;
        }

        const expectedKeyType = GenreToTypeMapping[this._dataDef.key];
        if (!checkValueIsExpectedType(data[0].key, expectedKeyType)) {
            throw new Error(this.makeExceptionMessage("Key", data[0].key.toString(), expectedKeyType));
        }

        const expectedValueType = GenreContentToTypeMapping[this._dataDef.value];
        if (!checkValueIsExpectedType(data[0].value, expectedValueType)) {
            throw new Error(this.makeExceptionMessage("Value", data[0].value.toString(), expectedValueType));
        }
    }

    private generateAndVerifyData(dataGenerator: () => ChannelData[]): ChannelData[] {
        const generatedData = dataGenerator();

        this.assertGeneratedDataMatchesDefinition(generatedData);

        return generatedData;
    }

    getName(): string {
        return this._name;
    }

    getDisplayName(): string {
        return this._displayName;
    }

    getDataDef(): OutputChannel {
        return this._dataDef;
    }

    getMetaData(): ChannelMeta {
        if (!this._metaData) {
            throw new Error("No meta data");
        }
        return this._metaData;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    broadcast(metaData: ChannelMeta, dataGenerator: () => ChannelData[]): void {
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

    subscribe(
        callbackChannelDataChanged: (data: ChannelData[] | null, metaData: ChannelMeta | null) => void
    ): () => void {
        this._subscribers.add(callbackChannelDataChanged);

        if (this._subscribers.size === 1 && this._dataGenerator) {
            this._cachedData = this.generateAndVerifyData(this._dataGenerator);
        }

        callbackChannelDataChanged(this._cachedData ?? null, this._metaData ?? null);

        return () => {
            this._subscribers.delete(callbackChannelDataChanged);
        };
    }
}

export class DataBroadcaster {
    private _channels: BroadcastChannel[];
    private _subscribers: Set<(channels: BroadcastChannel[]) => void>;

    constructor() {
        this._channels = [];
        this._subscribers = new Set();
    }

    registerChannel(
        channelName: string,
        displayName: string,
        channelDef: OutputChannel,
        moduleInstanceId: string
    ): BroadcastChannel {
        const channel = new BroadcastChannel(channelName, displayName, channelDef, moduleInstanceId);
        this._channels.push(channel);
        this.notifySubscribersAboutChannelsChanges();
        return channel;
    }

    unregisterAllChannelsForModuleInstance(moduleInstanceId: string): void {
        this._channels = this._channels.filter((c) => c.getModuleInstanceId() !== moduleInstanceId);
        this.notifySubscribersAboutChannelsChanges();
    }

    getChannelsForModuleInstance(moduleInstanceId: string): BroadcastChannel[] {
        return this._channels.filter((c) => c.getModuleInstanceId() === moduleInstanceId);
    }

    getChannel(channelName: string): BroadcastChannel | null {
        const channel = this._channels.find((c) => c.getName() === channelName);
        if (!channel) {
            return null;
        }

        return channel as BroadcastChannel;
    }

    getChannelNames(): string[] {
        return this._channels.map((c) => c.getName());
    }

    subscribeToChannelsChanges(cb: (channels: BroadcastChannel[]) => void): () => void {
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

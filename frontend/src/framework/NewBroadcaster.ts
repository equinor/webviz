import React from "react";

import { isEqual } from "lodash";

import { EnsembleIdent } from "./EnsembleIdent";

export enum Genre {
    TimestampMs = "timestamp-ms",
    Realization = "realization",
    GridIndex = "grid-index",
    GridIJK = "grid-ijk",
    MeasuredDepth = "measured-depth",
}

export enum ContentType {
    Numeric = "numeric",
    String = "string",
}

export interface Channel {
    ident: string;
    name: string;
    genre: Genre;
    contentType: ContentType;
}

interface Program {
    ident: string;
    name: string;
}

interface Content {
    key: number | [number, number, number];
    value: number | string;
}

enum Type {
    Number = "number",
    String = "string",
    NumberTriplet = "number-triplet",
}

const GenreTypes = {
    [Genre.TimestampMs]: Type.Number,
    [Genre.Realization]: Type.Number,
    [Genre.GridIndex]: Type.Number,
    [Genre.GridIJK]: Type.NumberTriplet,
    [Genre.MeasuredDepth]: Type.Number,
};

const ProgramTypes = {
    [ContentType.Numeric]: Type.Number,
    [ContentType.String]: Type.String,
};

export interface ChannelListener {
    ident: string;
    name: string;
    supportedGenres: Genre[];
}

export type ChannelMeta = {
    ensembleIdent: EnsembleIdent;
    description: string;
    unit: string;
};

export enum ProgramTopics {
    ContentChange = "content-change",
}

export class ChannelProgram {
    private _cachedContent: Content[] = [];
    private _subscribersMap: Map<ProgramTopics, Set<() => void>> = new Map();

    constructor(private _name: string, private _contentGenerator: () => Content[]) {}

    getName(): string {
        return this._name;
    }

    broadcast(contentGenerator: () => Content[]): void {
        this._contentGenerator = contentGenerator;
        this._cachedContent = contentGenerator();
        this.notifySubscribers(ProgramTopics.ContentChange);
    }

    subscribe(topic: ProgramTopics, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: ProgramTopics): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

export function useBroadcast<TGenre extends Genre, TContentType extends ContentType>(options: {
    channel: ModuleChannel<TGenre, TContentType>;
    dependencies: any[];
    programs: Program[];
    contentGenerator: (programIdent: string) => Content[];
}) {
    const [prevDependencies, setPrevDependencies] = React.useState<any[]>([]);

    if (!isEqual(prevDependencies, options.dependencies)) {
        setPrevDependencies(options.dependencies);

        options.channel.unregisterAllPrograms();

        for (const program of options.programs) {
            options.channel.registerProgram(program.name, () => options.contentGenerator(program.ident));
        }
    }
}

export enum ModuleChannelTopics {
    ProgramsChange = "programs-change",
}

export class ModuleChannel<TGenre extends Genre, TContentType extends ContentType> {
    /**
     * This class holds all programs of a module.
     */

    private _programs: ChannelProgram[] = [];
    private _subscribersMap: Map<ModuleChannelTopics, Set<() => void>> = new Map();

    constructor(
        private _ident: string,
        private _name: string,
        private _genre: TGenre,
        private _contentType: TContentType
    ) {}

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    getGenre(): Genre {
        return this._genre;
    }

    getContentType(): ContentType {
        return this._contentType;
    }

    getProgram(name: string): ChannelProgram | null {
        const program = this._programs.find((p) => p.getName() === name);
        if (!program) {
            return null;
        }

        return program;
    }

    getPrograms(): ChannelProgram[] {
        return this._programs;
    }

    registerProgram(name: string, contentGenerator: () => Content[]): void {
        this._programs.push(new ChannelProgram(name, contentGenerator));
        this.notifySubscribers(ModuleChannelTopics.ProgramsChange);
    }

    unregisterProgram(name: string): void {
        this._programs = this._programs.filter((p) => p.getName() !== name);
        this.notifySubscribers(ModuleChannelTopics.ProgramsChange);
    }

    unregisterAllPrograms(): void {
        this._programs = [];
        this.notifySubscribers(ModuleChannelTopics.ProgramsChange);
    }

    subscribe(topic: ModuleChannelTopics, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: ModuleChannelTopics): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

export enum ModuleBroadcasterTopics {
    ChannelsChange = "channels-change",
}

export class ModuleChannelListener {
    constructor(private _ident: string, private _name: string, private _supportedGenres: Genre[]) {}

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    getSupportedGenres(): Genre[] {
        return this._supportedGenres;
    }
}

export class ModuleBroadcaster {
    /**
     * This class holds all channels of a module.
     */

    private _channels: ModuleChannel<any, any>[] = [];
    private _subscribersMap: Map<ModuleBroadcasterTopics, Set<() => void>> = new Map();

    // Is constructor assignment a pattern we would like to use?
    constructor(private _moduleInstanceId: string) {}

    getChannel(ident: string): ModuleChannel<any, any> | null {
        const channel = this._channels.find((c) => c.getIdent() === ident);
        if (!channel) {
            return null;
        }

        return channel;
    }

    getChannels(): ModuleChannel<any, any>[] {
        return this._channels;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    registerChannel(options: { ident: string; name: string; genre: Genre; contentType: ContentType }): void {
        const newChannel = new ModuleChannel(options.ident, options.name, options.genre, options.contentType);
        this._channels.push(newChannel);
        this.notifySubscribers(ModuleBroadcasterTopics.ChannelsChange);
    }

    unregisterAllChannels(): void {
        this._channels = [];
        this.notifySubscribers(ModuleBroadcasterTopics.ChannelsChange);
    }

    subscribe(topic: ModuleBroadcasterTopics, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: ModuleBroadcasterTopics): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

export enum BroadcastingServiceTopics {
    BroadcastersChange = "broadcasters-change",
}

export class BroadcastService {
    /**
     * This class holds all modules' broadcasters and makes them available to the outside world.
     */

    private _broadcasters: ModuleBroadcaster[] = [];
    private _subscribersMap: Map<BroadcastingServiceTopics, Set<() => void>> = new Map();

    registerBroadcaster(moduleInstanceId: string): void {
        this._broadcasters.push(new ModuleBroadcaster(moduleInstanceId));
        this.notifySubscribers(BroadcastingServiceTopics.BroadcastersChange);
    }

    unregisterBroadcaster(moduleInstanceId: string): void {
        const broadcaster = this._broadcasters.find((b) => b.getModuleInstanceId() === moduleInstanceId);
        if (!broadcaster) {
            return;
        }

        broadcaster.unregisterAllChannels();

        this._broadcasters = this._broadcasters.filter((b) => b.getModuleInstanceId() !== moduleInstanceId);
        this.notifySubscribers(BroadcastingServiceTopics.BroadcastersChange);
    }

    getBroadcasterForModuleInstance(moduleInstanceId: string): ModuleBroadcaster | null {
        const broadcaster = this._broadcasters.find((b) => b.getModuleInstanceId() === moduleInstanceId);
        if (!broadcaster) {
            return null;
        }

        return broadcaster;
    }

    subscribe(topic: BroadcastingServiceTopics, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: BroadcastingServiceTopics): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

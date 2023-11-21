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

export interface Content {
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
    multiTasking?: boolean;
}

export type ChannelMeta = {
    ensembleIdent: EnsembleIdent;
    description: string;
    unit: string;
};

export enum ProgramTopic {
    ContentChange = "content-change",
}

export class ChannelProgram {
    private _cachedContent: Content[] = [];
    private _subscribersMap: Map<ProgramTopic, Set<() => void>> = new Map();

    constructor(private _name: string, private _contentGenerator: () => Content[]) {}

    getName(): string {
        return this._name;
    }

    broadcast(contentGenerator: () => Content[]): void {
        this._contentGenerator = contentGenerator;
        this._cachedContent = contentGenerator();
        this.notifySubscribers(ProgramTopic.ContentChange);
    }

    getContent(): Content[] {
        return this._contentGenerator();
    }

    subscribe(topic: ProgramTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: ProgramTopic): void {
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

        for (const oldProgram of options.channel.getPrograms()) {
            if (!options.programs.some((p) => p.name === oldProgram.getName())) {
                options.channel.unregisterProgram(oldProgram.getName());
            }
        }
        for (const program of options.programs) {
            if (!options.channel.hasProgram(program.name)) {
                options.channel.registerProgram(program.name, () => options.contentGenerator(program.ident));
            } else {
                options.channel.getProgram(program.name)?.broadcast(() => options.contentGenerator(program.ident));
            }
        }
    }
}

export enum ModuleChannelTopic {
    ProgramsChange = "programs-change",
    ContentChange = "content-change",
    ChannelAboutToBeRemoved = "channel-about-to-be-removed",
}

export class ModuleChannel<TGenre extends Genre, TContentType extends ContentType> {
    /**
     * This class holds all programs of a module.
     */

    private _programs: ChannelProgram[] = [];
    private _subscribersMap: Map<ModuleChannelTopic, Set<() => void>> = new Map();

    constructor(
        private _broadcaster: ModuleBroadcaster,
        private _ident: string,
        private _name: string,
        private _genre: TGenre,
        private _contentType: TContentType
    ) {
        this.handleProgramContentChange = this.handleProgramContentChange.bind(this);
    }

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    getBroadcaster(): ModuleBroadcaster {
        return this._broadcaster;
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

    broadcast(programIdents: string[], contentGenerator: (programIdent: string) => Content[]): void {
        for (const oldProgram of this._programs) {
            if (!programIdents.includes(oldProgram.getName())) {
                this.unregisterProgram(oldProgram.getName());
            }
        }
        for (const programIdent of programIdents) {
            if (!this.hasProgram(programIdent)) {
                this.registerProgram(programIdent, () => contentGenerator(programIdent));
            } else {
                this.getProgram(programIdent)?.broadcast(() => contentGenerator(programIdent));
            }
        }
        this.notifySubscribers(ModuleChannelTopic.ContentChange);
    }

    private handleProgramContentChange(): void {
        this.notifySubscribers(ModuleChannelTopic.ContentChange);
    }

    registerProgram(name: string, contentGenerator: () => Content[]): void {
        const program = new ChannelProgram(name, contentGenerator);
        program.subscribe(ProgramTopic.ContentChange, this.handleProgramContentChange);
        this._programs.push(program);
        this.notifySubscribers(ModuleChannelTopic.ProgramsChange);
        this.notifySubscribers(ModuleChannelTopic.ContentChange);
    }

    unregisterProgram(name: string): void {
        this._programs = this._programs.filter((p) => p.getName() !== name);
        this.notifySubscribers(ModuleChannelTopic.ProgramsChange);
    }

    unregisterAllPrograms(): void {
        this._programs = [];
        this.notifySubscribers(ModuleChannelTopic.ProgramsChange);
    }

    hasProgram(ident: string): boolean {
        return this._programs.some((p) => p.getName() === ident);
    }

    subscribe(topic: ModuleChannelTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    unsubscribe(topic: ModuleChannelTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        topicSubscribers.delete(callback);
    }

    private notifySubscribers(topic: ModuleChannelTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }

    beforeRemove(): void {
        this.notifySubscribers(ModuleChannelTopic.ChannelAboutToBeRemoved);
    }
}

export enum ModuleChannelListenerTopic {
    ContentChange = "content-change",
    ChannelChange = "channel-change",
}

export class ModuleChannelListener {
    private _broadcaster: ModuleBroadcaster;
    private _ident: string;
    private _name: string;
    private _supportedGenres: Genre[];
    private _multiTasking: boolean;
    private _channel: ModuleChannel<any, any> | null = null;
    private _programIdents: string[] = [];
    private _subscribersMap: Map<ModuleChannelListenerTopic, Set<() => void>> = new Map();

    constructor(options: {
        broadcaster: ModuleBroadcaster;
        ident: string;
        name: string;
        supportedGenres: Genre[];
        multiTasking?: boolean;
    }) {
        this._broadcaster = options.broadcaster;
        this._ident = options.ident;
        this._name = options.name;
        this._supportedGenres = options.supportedGenres;
        this._multiTasking = options.multiTasking ?? false;
        this.handleChannelRemove = this.handleChannelRemove.bind(this);
        this.handleContentChange = this.handleContentChange.bind(this);
        this.handleProgramsChange = this.handleProgramsChange.bind(this);
    }

    getBroadcaster(): ModuleBroadcaster {
        return this._broadcaster;
    }

    startListeningTo(channel: ModuleChannel<any, any>, programIdents: string[]): void {
        this._channel = channel;
        this._programIdents = programIdents;

        this._channel.subscribe(ModuleChannelTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
        this._channel.subscribe(ModuleChannelTopic.ContentChange, this.handleContentChange);
        this._channel.subscribe(ModuleChannelTopic.ProgramsChange, this.handleProgramsChange);

        this.notifySubscribers(ModuleChannelListenerTopic.ChannelChange);
    }

    getChannel(): ModuleChannel<any, any> | null {
        return this._channel;
    }

    stopListening(): void {
        if (this._channel) {
            this._channel.unsubscribe(ModuleChannelTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
            this._channel.unsubscribe(ModuleChannelTopic.ContentChange, this.handleContentChange);
            this._channel.unsubscribe(ModuleChannelTopic.ProgramsChange, this.handleProgramsChange);
            this._channel = null;
            this._programIdents = [];
        }
    }

    isListening(): boolean {
        return this._channel !== null;
    }

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    getSupportedGenres(): Genre[] {
        return this._supportedGenres;
    }

    subscribe(topic: ModuleChannelListenerTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: ModuleChannelListenerTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }

    private handleChannelRemove(): void {
        this._channel?.unsubscribe(ModuleChannelTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
        this._channel?.unsubscribe(ModuleChannelTopic.ContentChange, this.handleContentChange);
        this._channel?.unsubscribe(ModuleChannelTopic.ProgramsChange, this.handleProgramsChange);
        this._channel = null;
        this._programIdents = [];
    }

    private handleContentChange(): void {
        this.notifySubscribers(ModuleChannelListenerTopic.ContentChange);
    }

    private handleProgramsChange(): void {
        const updatedProgramIdents = this._programIdents.filter((programIdent) =>
            this._channel?.hasProgram(programIdent)
        );
        if (updatedProgramIdents.length !== this._programIdents.length) {
            this._programIdents = updatedProgramIdents;
            this.notifySubscribers(ModuleChannelListenerTopic.ChannelChange);
            return;
        }
    }
}

export function useChannelListener(channelListener: ModuleChannelListener | null): {
    name: string;
    programs: { programName: string; content: Content[] }[];
    listening: boolean;
} {
    const [programs, setPrograms] = React.useState<{ programName: string; content: Content[] }[]>([]);

    React.useEffect(() => {
        function handleContentChange(): void {
            const channel = channelListener?.getChannel();
            if (!channel) {
                return;
            }

            const programs = channel.getPrograms().map((program) => {
                return {
                    programName: program.getName(),
                    content: program.getContent(),
                };
            });

            setPrograms(programs ?? []);
        }

        const unsubscribeFunc = channelListener?.subscribe(
            ModuleChannelListenerTopic.ContentChange,
            handleContentChange
        );

        handleContentChange();

        return () => {
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    }, [channelListener]);

    return { name: channelListener?.getName() ?? "", programs, listening: channelListener?.isListening() ?? false };
}

export enum ModuleBroadcasterTopic {
    ChannelsChange = "channels-change",
    ListenersChange = "listeners-change",
}

export class ModuleBroadcaster {
    /**
     * This class holds all channels of a module.
     */

    private _channels: ModuleChannel<any, any>[] = [];
    private _listeners: ModuleChannelListener[] = [];
    private _subscribersMap: Map<ModuleBroadcasterTopic, Set<() => void>> = new Map();

    // Is constructor assignment a pattern we would like to use?
    constructor(private _moduleInstanceId: string) {}

    getChannel(ident: string): ModuleChannel<any, any> | null {
        return this._channels.find((c) => c.getIdent() === ident) ?? null;
    }

    getChannels(): ModuleChannel<any, any>[] {
        return this._channels;
    }

    getListener(ident: string): ModuleChannelListener | null {
        return this._listeners.find((l) => l.getIdent() === ident) ?? null;
    }

    getListeners(): ModuleChannelListener[] {
        return this._listeners;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    registerChannel(options: { ident: string; name: string; genre: Genre; contentType: ContentType }): void {
        const newChannel = new ModuleChannel(this, options.ident, options.name, options.genre, options.contentType);
        this._channels.push(newChannel);
        this.notifySubscribers(ModuleBroadcasterTopic.ChannelsChange);
    }

    registerListener(options: { ident: string; name: string; supportedGenres: Genre[]; multiTasking: boolean }): void {
        const newListener = new ModuleChannelListener({
            broadcaster: this,
            ident: options.ident,
            name: options.name,
            supportedGenres: options.supportedGenres,
            multiTasking: options.multiTasking,
        });
        this._listeners.push(newListener);
        this.notifySubscribers(ModuleBroadcasterTopic.ListenersChange);
    }

    unregisterAllChannels(): void {
        for (const channel of this._channels) {
            channel.beforeRemove();
        }
        this._channels = [];
        this.notifySubscribers(ModuleBroadcasterTopic.ChannelsChange);
    }

    subscribe(topic: ModuleBroadcasterTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: ModuleBroadcasterTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

export enum BroadcastingServiceTopic {
    BroadcastersChange = "broadcasters-change",
}

export class BroadcastService {
    /**
     * This class holds all modules' broadcasters and makes them available to the outside world.
     */

    private _broadcasters: ModuleBroadcaster[] = [];
    private _subscribersMap: Map<BroadcastingServiceTopic, Set<() => void>> = new Map();

    registerBroadcaster(moduleInstanceId: string): void {
        this._broadcasters.push(new ModuleBroadcaster(moduleInstanceId));
        this.notifySubscribers(BroadcastingServiceTopic.BroadcastersChange);
    }

    unregisterBroadcaster(moduleInstanceId: string): void {
        const broadcaster = this._broadcasters.find((b) => b.getModuleInstanceId() === moduleInstanceId);
        if (!broadcaster) {
            return;
        }

        broadcaster.unregisterAllChannels();

        this._broadcasters = this._broadcasters.filter((b) => b.getModuleInstanceId() !== moduleInstanceId);
        this.notifySubscribers(BroadcastingServiceTopic.BroadcastersChange);
    }

    getBroadcasterForModuleInstance(moduleInstanceId: string): ModuleBroadcaster | null {
        const broadcaster = this._broadcasters.find((b) => b.getModuleInstanceId() === moduleInstanceId);
        if (!broadcaster) {
            return null;
        }

        return broadcaster;
    }

    subscribe(topic: BroadcastingServiceTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    private notifySubscribers(topic: BroadcastingServiceTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}

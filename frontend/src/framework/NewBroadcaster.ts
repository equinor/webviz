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

export interface Program {
    ident: string;
    name: string;
}

export interface Content<TValueType = number | string> {
    key: number | [number, number, number];
    value: TValueType;
}

export enum Type {
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

export type TypeToTSTypeMapping = {
    [Type.Number]: number;
    [Type.String]: string;
    [Type.NumberTriplet]: [number, number, number];
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

export enum ProgramTopic {
    ContentChange = "content-change",
}

export class ChannelProgram {
    private _cachedContent: Content[] = [];
    private _subscribersMap: Map<ProgramTopic, Set<() => void>> = new Map();

    constructor(private _ident: string, private _name: string, private _contentGenerator: () => Content[]) {}

    getIdent(): string {
        return this._ident;
    }

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
            if (!options.programs.some((p) => p.ident === oldProgram.getIdent())) {
                options.channel.unregisterProgram(oldProgram.getIdent());
            }
        }
        for (const program of options.programs) {
            if (!options.channel.hasProgram(program.ident)) {
                options.channel.registerProgram(program.ident, program.name, () =>
                    options.contentGenerator(program.ident)
                );
            } else {
                options.channel.getProgram(program.ident)?.broadcast(() => options.contentGenerator(program.ident));
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
        private _broadcaster: ModuleBroadcastService,
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

    getBroadcaster(): ModuleBroadcastService {
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

    private handleProgramContentChange(): void {
        this.notifySubscribers(ModuleChannelTopic.ContentChange);
    }

    registerProgram(ident: string, name: string, contentGenerator: () => Content[]): void {
        const program = new ChannelProgram(ident, name, contentGenerator);
        program.subscribe(ProgramTopic.ContentChange, this.handleProgramContentChange);
        this._programs.push(program);
        this.notifySubscribers(ModuleChannelTopic.ProgramsChange);
        this.notifySubscribers(ModuleChannelTopic.ContentChange);
    }

    unregisterProgram(ident: string): void {
        this._programs = this._programs.filter((p) => p.getIdent() !== ident);
        this.notifySubscribers(ModuleChannelTopic.ProgramsChange);
    }

    unregisterAllPrograms(): void {
        this._programs = [];
        this.notifySubscribers(ModuleChannelTopic.ProgramsChange);
    }

    hasProgram(ident: string): boolean {
        return this._programs.some((p) => p.getIdent() === ident);
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
    private _broadcaster: ModuleBroadcastService;
    private _ident: string;
    private _name: string;
    private _supportedGenres: Genre[];
    private _canMultitask: boolean;
    private _channel: ModuleChannel<any, any> | null = null;
    private _programIdents: string[] = [];
    private _subscribersMap: Map<ModuleChannelListenerTopic, Set<() => void>> = new Map();
    private _listeningToAllPrograms: boolean = false;

    constructor(options: {
        broadcaster: ModuleBroadcastService;
        ident: string;
        name: string;
        supportedGenres: Genre[];
        canMultitask?: boolean;
    }) {
        this._broadcaster = options.broadcaster;
        this._ident = options.ident;
        this._name = options.name;
        this._supportedGenres = options.supportedGenres;
        this._canMultitask = options.canMultitask ?? false;
        this.handleChannelRemove = this.handleChannelRemove.bind(this);
        this.handleContentChange = this.handleContentChange.bind(this);
        this.handleProgramsChange = this.handleProgramsChange.bind(this);
    }

    getBroadcaster(): ModuleBroadcastService {
        return this._broadcaster;
    }

    startListeningTo(channel: ModuleChannel<any, any>, programIdents: string[] | "All"): void {
        if (this.isListening()) {
            this.stopListening();
        }

        this._channel = channel;
        if (programIdents === "All") {
            if (this._canMultitask) {
                this._programIdents = channel.getPrograms().map((p) => p.getIdent());
            } else {
                const firstProgram = channel.getPrograms().at(0);
                if (firstProgram) {
                    this._programIdents = [firstProgram.getIdent()];
                } else {
                    this._programIdents = [];
                }
            }
            this._listeningToAllPrograms = true;
            this._channel.subscribe(ModuleChannelTopic.ProgramsChange, this.handleProgramsChange);
        } else {
            this._programIdents = programIdents;
            this._listeningToAllPrograms = false;
            this._channel.unsubscribe(ModuleChannelTopic.ProgramsChange, this.handleProgramsChange);
        }

        this._channel.subscribe(ModuleChannelTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
        this._channel.subscribe(ModuleChannelTopic.ContentChange, this.handleContentChange);
        this._channel.subscribe(ModuleChannelTopic.ProgramsChange, this.handleContentChange);

        this.notifySubscribers(ModuleChannelListenerTopic.ChannelChange);
        this.notifySubscribers(ModuleChannelListenerTopic.ContentChange);
    }

    getChannel(): ModuleChannel<any, any> | null {
        return this._channel;
    }

    getCanMultiTask(): boolean {
        return this._canMultitask;
    }

    getIsListeningToAllPrograms(): boolean {
        return this._listeningToAllPrograms;
    }

    getProgramIdents(): string[] {
        return this._programIdents;
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
        if (this._canMultitask) {
            this._programIdents = this._channel?.getPrograms().map((p) => p.getIdent()) ?? [];
        } else {
            const firstProgram = this._channel?.getPrograms().at(0);
            if (firstProgram) {
                this._programIdents = [firstProgram.getIdent()];
            } else {
                this._programIdents = [];
            }
        }
    }
}

export function useChannelListener<TContentValueType extends Type>(options: {
    channelListener: ModuleChannelListener | null;
    expectedValueType: TContentValueType;
}): {
    ident: string;
    name: string;
    channel: {
        ident: string;
        name: string;
        moduleInstanceId: string;
        programs: { ident: string; name: string; content: Content<TypeToTSTypeMapping[TContentValueType]>[] }[];
    };
    listening: boolean;
} {
    const [programs, setPrograms] = React.useState<
        { ident: string; name: string; content: Content<TypeToTSTypeMapping[TContentValueType]>[] }[]
    >([]);

    React.useEffect(() => {
        function handleContentChange(): void {
            const channel = options.channelListener?.getChannel();
            if (!channel) {
                return;
            }

            const programs = channel
                .getPrograms()
                .filter((program) => {
                    if (options.channelListener?.getProgramIdents().includes(program.getIdent())) {
                        return true;
                    }
                    return false;
                })
                .map((program) => {
                    const content = program.getContent();
                    for (const c of content) {
                        if (!checkValueIsExpectedType(c.value, options.expectedValueType)) {
                            throw new Error(
                                `Value '${c.value}' is not of expected type '${options.expectedValueType}'`
                            );
                        }
                    }
                    return {
                        ident: program.getIdent(),
                        name: program.getName(),
                        content: program.getContent() as Content<TypeToTSTypeMapping[TContentValueType]>[],
                    };
                });

            setPrograms(programs ?? []);
        }

        const unsubscribeFunc = options.channelListener?.subscribe(
            ModuleChannelListenerTopic.ContentChange,
            handleContentChange
        );

        handleContentChange();

        return () => {
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    }, [options.channelListener]);

    return {
        ident: options.channelListener?.getChannel()?.getIdent() ?? "",
        name: options.channelListener?.getName() ?? "",
        channel: {
            ident: options.channelListener?.getChannel()?.getIdent() ?? "",
            name: options.channelListener?.getChannel()?.getName() ?? "",
            moduleInstanceId: options.channelListener?.getBroadcaster().getModuleInstanceId() ?? "",
            programs,
        },
        listening: options.channelListener?.isListening() ?? false,
    };
}

export enum ModuleBroadcasterTopic {
    ChannelsChange = "channels-change",
    ListenersChange = "listeners-change",
}

export class ModuleBroadcastService {
    /**
     * This class holds all channels and listeners of a module.
     * NOTE: Should listeners and channels be separated into different classes?
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
            canMultitask: options.multiTasking,
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

    unregisterAllListeners(): void {
        for (const listener of this._listeners) {
            listener.stopListening();
        }
        this._listeners = [];
        this.notifySubscribers(ModuleBroadcasterTopic.ListenersChange);
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

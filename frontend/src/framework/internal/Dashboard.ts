import React from "react";

import { v4 } from "uuid";

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSet } from "@framework/EnsembleSet";
import { RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import { RealizationFilterSet } from "@framework/RealizationFilterSet";
import type { SerializedRealizationFilterSetState } from "@framework/RealizationFilterSet.schema";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { Template } from "@framework/TemplateRegistry";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import type { AtomStoreMaster } from "../AtomStoreMaster";
import { ModuleInstanceTopic, type ModuleInstance } from "../ModuleInstance";
import { ModuleRegistry } from "../ModuleRegistry";

import type { SerializedDashboardState } from "./Dashboard.schema";

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
    minimized?: boolean;
    maximized?: boolean;
};

export enum DashboardTopic {
    METADATA = "Metadata",
    LAYOUT = "Layout",
    MODULE_INSTANCES = "ModuleInstances",
    ACTIVE_MODULE_INSTANCE_ID = "ActiveModuleInstanceId",
    REALIZATION_FILTER_SET = "RealizationFilterSet",
    SERIALIZED_STATE = "SerializedState",
}

export type DashboardMetadata = {
    name: string;
    description?: string;
};

export type DashboardTopicPayloads = {
    [DashboardTopic.METADATA]: DashboardMetadata;
    [DashboardTopic.LAYOUT]: LayoutElement[];
    [DashboardTopic.MODULE_INSTANCES]: ModuleInstance<any, any>[];
    [DashboardTopic.ACTIVE_MODULE_INSTANCE_ID]: string | null;
    [DashboardTopic.REALIZATION_FILTER_SET]: { filterSet: RealizationFilterSet };
    [DashboardTopic.SERIALIZED_STATE]: void;
};

export class Dashboard implements PublishSubscribe<DashboardTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DashboardTopicPayloads>();
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    private _id: string;
    private _metadata: DashboardMetadata;
    private _layout: LayoutElement[] = [];
    private _moduleInstances: ModuleInstance<any, any>[] = [];
    private _activeModuleInstanceId: string | null = null;
    private _atomStoreMaster: AtomStoreMaster;
    private _realizationFilterSet = new RealizationFilterSet();
    private _wrappedRealizationFilterSet = {
        filterSet: this._realizationFilterSet,
    };
    // Cache of the last serialized filter selections handed to deserializeState()/fromPersistedState(),
    // re-applied every time syncRealizationFilterSetWithEnsembleSet() runs. RealizationFilterSet.deserializeState()
    // only overlays onto filter entries that already exist (created by a prior sync against the EnsembleSet), so
    // without this cache, calling the overlay before the first sync would silently drop the persisted selections.
    // Caching and re-applying makes the two calls commute regardless of which runs first.
    private _pendingSerializedRealizationFilterSet: SerializedRealizationFilterSetState | null = null;

    constructor(atomStoreMaster: AtomStoreMaster, name?: string) {
        this._id = v4();
        this._metadata = { name: name ?? "Dashboard" };

        this._atomStoreMaster = atomStoreMaster;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DashboardTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends DashboardTopic>(topic: T): () => DashboardTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === DashboardTopic.LAYOUT) {
                return this._layout;
            }
            if (topic === DashboardTopic.MODULE_INSTANCES) {
                return this._moduleInstances;
            }
            if (topic === DashboardTopic.ACTIVE_MODULE_INSTANCE_ID) {
                return this._activeModuleInstanceId;
            }
            if (topic === DashboardTopic.REALIZATION_FILTER_SET) {
                return this._wrappedRealizationFilterSet;
            }
            if (topic === DashboardTopic.SERIALIZED_STATE) {
                return;
            }
            if (topic === DashboardTopic.METADATA) {
                return this._metadata;
            }

            throw new Error(`No snapshot getter for topic ${topic}`);
        };

        return snapshotGetter;
    }

    getId(): string {
        return this._id;
    }

    getMetadata(): DashboardMetadata {
        return this._metadata;
    }

    updateMetadata(metadata: Partial<DashboardMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.METADATA);
        this.handleStateChange();
    }

    getLayout(): LayoutElement[] {
        return this._layout;
    }

    setLayout(layout: LayoutElement[]): void {
        this._layout = layout;
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.LAYOUT);
        this.handleStateChange();
    }

    getModuleInstances(): ModuleInstance<any, any>[] {
        return this._moduleInstances;
    }

    getRealizationFilterSet(): RealizationFilterSet {
        return this._realizationFilterSet;
    }

    /**
     * Called by the owning session whenever the (session-global) EnsembleSet changes, and once
     * immediately after this dashboard is registered with the session (covers construction,
     * template application, and deserialization).
     */
    syncRealizationFilterSetWithEnsembleSet(ensembleSet: EnsembleSet): void {
        this._realizationFilterSet.synchronizeWithEnsembleSet(ensembleSet);
        // Re-apply any pending persisted filter selections now that entries exist for every
        // ensemble - covers the case where deserializeState()/fromPersistedState() ran before
        // the first sync (see _pendingSerializedRealizationFilterSet doc comment).
        if (this._pendingSerializedRealizationFilterSet) {
            this._realizationFilterSet.deserializeState(this._pendingSerializedRealizationFilterSet);
        }
        this.pushWrappedRealizationFilterSet();
    }

    /** Called after in-place edits to individual RealizationFilter objects (e.g. from the
     *  realization filter settings panel) where ensemble membership hasn't changed. */
    notifyAboutEnsembleRealizationFilterChange(): void {
        this.pushWrappedRealizationFilterSet();
    }

    private pushWrappedRealizationFilterSet(): void {
        this._wrappedRealizationFilterSet = { filterSet: this._realizationFilterSet };

        // Push directly into this dashboard's own module instances' atom stores. We deliberately
        // do NOT use AtomStoreMaster.setAtomValue() here - that writes into the session-wide
        // AtomStoreMaster's defaults and broadcasts to every module instance in the whole session,
        // regardless of which dashboard it belongs to, which would leak this dashboard's filter
        // set into every other dashboard's module instances.
        for (const moduleInstance of this._moduleInstances) {
            this.pushRealizationFilterSetToModuleInstanceAtomStore(moduleInstance.getId());
        }

        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.REALIZATION_FILTER_SET);
        this.handleStateChange();
    }

    private pushRealizationFilterSetToModuleInstanceAtomStore(moduleInstanceId: string): void {
        const atomStore = this._atomStoreMaster.getAtomStoreForModuleInstance(moduleInstanceId);
        atomStore?.set(RealizationFilterSetAtom, this._wrappedRealizationFilterSet);
    }

    serializeState(): SerializedDashboardState {
        const moduleInstances = this._moduleInstances.map((moduleInstance) => {
            const moduleInstanceState = moduleInstance.serializeState();

            const layoutInfo = this._layout.find((el) => el.moduleInstanceId === moduleInstance.getId());

            if (!layoutInfo) {
                throw new Error(`Layout info for module instance ${moduleInstance.getId()} not found`);
            }

            return {
                moduleInstanceState,
                layoutState: {
                    relX: layoutInfo.relX,
                    relY: layoutInfo.relY,
                    relHeight: layoutInfo.relHeight,
                    relWidth: layoutInfo.relWidth,
                    minimized: layoutInfo.minimized ?? false,
                    maximized: layoutInfo.maximized ?? false,
                },
            };
        });

        return {
            id: this._id,
            name: this._metadata.name,
            description: this._metadata.description,
            activeModuleInstanceId: this._activeModuleInstanceId,
            moduleInstances,
            realizationFilterSet: this._realizationFilterSet.serializeState(),
        };
    }

    deserializeState(serializedDashboard: SerializedDashboardState): void {
        this._id = serializedDashboard.id;
        this._metadata = {
            name: serializedDashboard.name,
            description: serializedDashboard.description,
        };

        // Overlay persisted per-ensemble filter selections onto the filter set. Normally
        // PrivateWorkbenchSession.registerDashboard() has already synchronized the filter set
        // against the session's EnsembleSet by the time this runs, so this takes effect
        // immediately. If it hasn't (call order changed), the value is cached and re-applied
        // by syncRealizationFilterSetWithEnsembleSet() once that sync does happen - see
        // _pendingSerializedRealizationFilterSet doc comment.
        this._pendingSerializedRealizationFilterSet = serializedDashboard.realizationFilterSet;
        this._realizationFilterSet.deserializeState(serializedDashboard.realizationFilterSet);

        this.clearLayout();

        for (const serializedInstance of serializedDashboard.moduleInstances) {
            const { id, name } = serializedInstance.moduleInstanceState;
            this.makeAndRegisterModuleInstance(name, id);
        }

        // Doing this after all module instances have been registered
        // ensures that the module instances are available for data channel initialization.
        for (const serializedInstance of serializedDashboard.moduleInstances) {
            const { moduleInstanceState, layoutState } = serializedInstance;
            const moduleInstance = this.getModuleInstance(moduleInstanceState.id);
            if (!moduleInstance) {
                throw new Error(`Module instance with ID ${moduleInstanceState.id} not found`);
            }

            moduleInstance.initiateDeserialization(moduleInstanceState, this);

            this._layout.push({
                moduleInstanceId: moduleInstanceState.id,
                moduleName: moduleInstanceState.name,
                relX: layoutState.relX,
                relY: layoutState.relY,
                relHeight: layoutState.relHeight,
                relWidth: layoutState.relWidth,
                minimized: layoutState.minimized,
                maximized: layoutState.maximized,
            });
        }

        this.setActiveModuleInstanceId(serializedDashboard.activeModuleInstanceId);

        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.LAYOUT);
    }

    clearLayout(): void {
        for (const moduleInstance of this._moduleInstances) {
            this.removeModuleInstance(moduleInstance.getId());
        }
        this._moduleInstances = [];
        this._layout = [];
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.LAYOUT);
        this.handleStateChange();
    }

    private handleStateChange(): void {
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.SERIALIZED_STATE);
    }

    private makeAndRegisterModuleInstance(moduleName: string, predefinedId?: string): ModuleInstance<any, any> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        const id = predefinedId ?? v4();

        const atomStore = this._atomStoreMaster.makeAtomStoreForModuleInstance(id);
        atomStore.set(RealizationFilterSetAtom, this._wrappedRealizationFilterSet);

        const moduleInstance = module.makeInstance(id, atomStore);

        this._moduleInstances = [...this._moduleInstances, moduleInstance];

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            moduleInstance.getId(),
            moduleInstance.makeSubscriberFunction(ModuleInstanceTopic.SERIALIZED_STATE)(
                this.handleStateChange.bind(this),
            ),
        );

        return moduleInstance;
    }

    private unregisterAndUnloadModuleInstance(moduleInstanceId: string): void {
        const moduleInstance = this.getModuleInstance(moduleInstanceId);

        if (!moduleInstance) {
            throw new Error(`Module instance with ID ${moduleInstanceId} not found`);
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribe(moduleInstanceId);

        moduleInstance.unload();

        this._moduleInstances = this._moduleInstances.filter((el) => el.getId() !== moduleInstanceId);

        this._atomStoreMaster.removeAtomStoreForModuleInstance(moduleInstanceId);
    }

    makeAndAddModuleInstance(moduleName: string): ModuleInstance<any, any> {
        const moduleInstance = this.makeAndRegisterModuleInstance(moduleName);

        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.MODULE_INSTANCES);
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.LAYOUT);

        this.setActiveModuleInstanceId(moduleInstance.getId());

        return moduleInstance;
    }

    removeModuleInstance(moduleInstanceId: string): void {
        this.unregisterAndUnloadModuleInstance(moduleInstanceId);

        const newLayout = this._layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        this.setLayout(newLayout);

        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.MODULE_INSTANCES);
        if (this._activeModuleInstanceId === moduleInstanceId) {
            const lastModuleInstanceId = this._moduleInstances.at(-1)?.getId() ?? null;
            this.setActiveModuleInstanceId(lastModuleInstanceId);
        }
    }

    getModuleInstance(id: string): ModuleInstance<any, any> | null {
        return this._moduleInstances.find((moduleInstance) => moduleInstance.getId() === id) ?? null;
    }

    setActiveModuleInstanceId(moduleInstanceId: string | null): void {
        if (moduleInstanceId !== null && !this.getModuleInstance(moduleInstanceId)) {
            throw new Error(`Module instance with ID ${moduleInstanceId} not found`);
        }
        this._activeModuleInstanceId = moduleInstanceId;
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
        this.handleStateChange();
    }

    getActiveModuleInstanceId(): string | null {
        return this._activeModuleInstanceId;
    }

    static fromPersistedState(
        serializedDashboard: SerializedDashboardState,
        atomStoreMaster: AtomStoreMaster,
    ): Dashboard {
        const dashboard = new Dashboard(atomStoreMaster);
        dashboard._id = serializedDashboard.id;
        dashboard._metadata = {
            name: serializedDashboard.name,
            description: serializedDashboard.description,
        };

        dashboard._activeModuleInstanceId = serializedDashboard.activeModuleInstanceId;

        // See the doc comment on _pendingSerializedRealizationFilterSet / Dashboard.deserializeState()
        // for why this is cached in addition to being applied directly here.
        dashboard._pendingSerializedRealizationFilterSet = serializedDashboard.realizationFilterSet;
        dashboard._realizationFilterSet.deserializeState(serializedDashboard.realizationFilterSet);

        const layout: LayoutElement[] = [];

        for (const serializedInstance of serializedDashboard.moduleInstances) {
            const { id, name } = serializedInstance.moduleInstanceState;
            dashboard.makeAndRegisterModuleInstance(name, id);
        }

        // Doing this after all module instances have been registered
        // ensures that the module instances are available for data channel initialization.
        for (const serializedInstance of serializedDashboard.moduleInstances) {
            const {
                moduleInstanceState: { id, name },
                layoutState,
            } = serializedInstance;
            const moduleInstance = dashboard.getModuleInstance(id);
            if (!moduleInstance) {
                throw new Error(`Module instance with ID ${id} not found`);
            }

            moduleInstance.initiateDeserialization(serializedInstance.moduleInstanceState, dashboard);

            layout.push({
                moduleInstanceId: id,
                moduleName: name,
                relX: layoutState.relX,
                relY: layoutState.relY,
                relHeight: layoutState.relHeight,
                relWidth: layoutState.relWidth,
                minimized: layoutState.minimized,
                maximized: layoutState.maximized,
            });
        }

        dashboard.setLayout(layout);

        return dashboard;
    }

    beforeUnload(): void {
        this.clearLayout();
    }

    // Note: the dashboard created here starts with a fresh, empty RealizationFilterSet (not yet
    // synced against any ensembles), so module instances created below transiently get an empty
    // wrapped filter set pushed into their atom stores at creation time. This is corrected
    // synchronously afterwards by PrivateWorkbenchSession.replaceDashboard()/setDashboards()
    // (called from WorkbenchSessionManager.applyTemplate()), which re-syncs and re-pushes the
    // now-correct filter set into every one of this dashboard's module instances before anything
    // renders. Do not "fix" this method in a way that breaks that ordering.
    static fromTemplate(template: Template, atomStoreMaster: AtomStoreMaster): Dashboard {
        const dashboard = new Dashboard(atomStoreMaster);
        dashboard._id = v4();
        dashboard._metadata = {
            name: template.name,
            description: template.description,
        };

        const layout: LayoutElement[] = [];
        const moduleInstances: ModuleInstance<any, any>[] = [];
        const moduleInstanceRefMap: Record<string, ModuleInstance<any, any>> = {};

        for (const module of template.moduleInstances) {
            const moduleInstance = dashboard.makeAndAddModuleInstance(module.moduleName);
            layout.push({
                moduleInstanceId: moduleInstance.getId(),
                moduleName: module.moduleName,
                relX: module.layout.relX,
                relY: module.layout.relY,
                relHeight: module.layout.relHeight,
                relWidth: module.layout.relWidth,
                minimized: module.layout.minimized,
                maximized: module.layout.maximized,
            });

            if (module.syncedSettings) {
                for (const syncedSetting of module.syncedSettings) {
                    moduleInstance.addSyncedSetting(syncedSetting);
                }
            }

            if (module.instanceRef) {
                moduleInstanceRefMap[module.instanceRef] = moduleInstance;
            }

            if (module.initialState) {
                moduleInstance.initiateTemplateStateApplication(module.initialState);
            }

            moduleInstances.push(moduleInstance);
        }

        for (const [idx, module] of template.moduleInstances.entries()) {
            const moduleInstance = moduleInstances[idx];
            if (!moduleInstance) {
                throw new Error(`Module instance with reference ${module.instanceRef} not found`);
            }

            if (module.dataChannelsToInitialSettingsMapping) {
                for (const [key, dataChannelConfig] of Object.entries(module.dataChannelsToInitialSettingsMapping)) {
                    const listensToModuleInstance = moduleInstanceRefMap[dataChannelConfig.listensToInstanceRef];
                    if (!listensToModuleInstance) {
                        throw new Error(
                            `Module instance with reference ${dataChannelConfig.listensToInstanceRef} not found`,
                        );
                    }

                    const channel = listensToModuleInstance
                        .getChannelManager()
                        .getChannel(dataChannelConfig.channelIdString);

                    if (!channel) {
                        throw new Error(
                            `Channel with ID ${dataChannelConfig.channelIdString} not found in module instance ${moduleInstance.getId()}`,
                        );
                    }

                    const receiver = moduleInstance.getChannelManager().getReceiver(key);
                    if (!receiver) {
                        throw new Error(
                            `Receiver with ID '${key}' not found in module instance '${moduleInstance.getName()} (${moduleInstance.getId()})'`,
                        );
                    }

                    receiver.connectToChannel(channel, "all");
                }
            }
        }

        dashboard.setLayout(layout);

        return dashboard;
    }
}

export function createEnsembleRealizationFilterFuncForDashboard(dashboard: Dashboard) {
    return function ensembleRealizationFilterFunc(
        ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
    ): readonly number[] {
        const realizationFilterSet = dashboard.getRealizationFilterSet();
        return realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent).getFilteredRealizations();
    };
}

export function useEnsembleRealizationFilterFunc(dashboard: Dashboard): EnsembleRealizationFilterFunction {
    const [storedEnsembleRealizationFilterFunc, setStoredEnsembleRealizationFilterFunc] =
        React.useState<EnsembleRealizationFilterFunction>(() =>
            createEnsembleRealizationFilterFuncForDashboard(dashboard),
        );

    React.useEffect(
        function subscribeToEnsembleRealizationFilterSetChanges() {
            // Ensure the returned function always matches the current dashboard, even if the
            // dashboard changes without any filter-set change events.
            setStoredEnsembleRealizationFilterFunc(() => createEnsembleRealizationFilterFuncForDashboard(dashboard));

            function handleEnsembleRealizationFilterSetChanged() {
                setStoredEnsembleRealizationFilterFunc(() =>
                    createEnsembleRealizationFilterFuncForDashboard(dashboard),
                );
            }

            return dashboard
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DashboardTopic.REALIZATION_FILTER_SET)(
                handleEnsembleRealizationFilterSetChanged,
            );
        },
        [dashboard],
    );

    return storedEnsembleRealizationFilterFunc;
}

import { Ajv } from "ajv/dist/jtd";
import { atom, type Atom, type Setter } from "jotai";

import type { AtomStore } from "./AtomStoreMaster";
import { hashJsonString, objectToJsonString } from "./internal/WorkbenchSession/utils";
import {
    hasSerialization,
    type ModuleComponentsStateBase,
    type ModuleStateSchema,
    type ModuleComponentSerializationFunctions,
} from "./Module";
import type { ModuleInstance, PartialSerializedModuleState } from "./ModuleInstance";
import { isPersistableAtom, Source } from "./utils/atomUtils";

type StringifiedSerializedModuleComponentsState = {
    settings?: string;
    view?: string;
};

const ajv = new Ajv();

export class ModuleInstanceSerializer<TSerializedState extends ModuleComponentsStateBase> {
    private _moduleInstance: ModuleInstance<any, TSerializedState>;
    private _atomStore: AtomStore;
    private _serializedStateSchema: ModuleStateSchema<TSerializedState> | null;
    private _serializedState: TSerializedState | null = null;
    private _serializationFunctions: ModuleComponentSerializationFunctions<TSerializedState>;
    private _persistenceAtom: Atom<TSerializedState | undefined>;
    private _lastSerializedHash: string | null = null;
    private _debouncedNotifyChange: () => void;

    constructor(
        moduleInstance: ModuleInstance<any, TSerializedState>,
        atomStore: AtomStore,
        serializedStateSchema: ModuleStateSchema<TSerializedState> | null,
        serializationFunctions: ModuleComponentSerializationFunctions<TSerializedState>,
        onStateChange: () => void,
    ) {
        this._moduleInstance = moduleInstance;
        this._atomStore = atomStore;
        this._serializedStateSchema = serializedStateSchema;
        this._serializationFunctions = serializationFunctions;
        this._debouncedNotifyChange = debounce(() => {
            onStateChange?.();
        }, 200);

        this._persistenceAtom = atom<TSerializedState | undefined>((get) => {
            if (hasSerialization(this._serializationFunctions)) {
                const result = {
                    settings: this._serializationFunctions.serializeStateFunctions.settings?.(get),
                    view: this._serializationFunctions.serializeStateFunctions.view?.(get),
                } as TSerializedState;
                return (result satisfies TSerializedState) ? result : undefined;
            }
            return undefined; // No serialization functions provided
        });

        this._atomStore
            .sub(this._persistenceAtom, () => {
                this.serializeState();
            })
            .bind(this);
    }

    getSerializedState(): TSerializedState | null {
        return this._serializedState;
    }

    getStringifiedSerializedState(): StringifiedSerializedModuleComponentsState | null {
        if (!this._serializedState) {
            return null; // No serialized state available
        }

        const stringifiedSettings = this._serializedState.settings
            ? JSON.stringify(this._serializedState.settings)
            : undefined;

        const stringifiedView = this._serializedState.view ? JSON.stringify(this._serializedState.view) : undefined;

        return {
            settings: stringifiedSettings,
            view: stringifiedView,
        };
    }

    async serializeState() {
        if (!hasSerialization(this._serializationFunctions) || !this._serializedStateSchema) {
            return this._serializedState || {};
        }

        const serializedSettings = this._serializationFunctions.serializeStateFunctions.settings?.(
            this._atomStore.get.bind(this._atomStore),
        );

        const serializedView = this._serializationFunctions.serializeStateFunctions.view?.(
            this._atomStore.get.bind(this._atomStore),
        );

        if (serializedSettings === undefined && serializedView === undefined && this._serializedState === null) {
            return {}; // No state to serialize
        }

        // Validate against schema
        if (this._serializedStateSchema.settings) {
            const validateSettings = ajv.compile(this._serializedStateSchema.settings);
            const isSettingsValid = serializedSettings === undefined || validateSettings(serializedSettings);
            if (!isSettingsValid) {
                console.warn(`Validation failed for ${this._moduleInstance.getName()}`, {
                    settingsErrors: validateSettings.errors,
                });
                this._serializedState = null;
                return; // Invalid state, do not serialize
            }
        }

        if (this._serializedStateSchema.view) {
            const validateView = ajv.compile(this._serializedStateSchema.view);
            const isViewValid = serializedView === undefined || validateView(serializedView);

            if (!isViewValid) {
                console.warn(`Validation failed for ${this._moduleInstance.getName()}`, {
                    viewErrors: validateView.errors,
                });
                this._serializedState = null;
                return; // Invalid state, do not serialize
            }
        }

        const newSerializedState = {
            settings: serializedSettings,
            view: serializedView,
        } as TSerializedState;

        const newHash = await hashJsonString(objectToJsonString(newSerializedState));

        if (newHash !== this._lastSerializedHash) {
            this._serializedState = newSerializedState;
            this._lastSerializedHash = newHash;
            this._debouncedNotifyChange?.();
        }

        this._serializedState = {
            settings: serializedSettings,
            view: serializedView,
        } as TSerializedState;
    }

    deserializeState(raw: StringifiedSerializedModuleComponentsState): void {
        if (!this._serializedStateSchema) {
            console.warn(`No serialized state schema defined for module instance ${this._moduleInstance.getName()}`);
            return; // No schema defined, cannot deserialize
        }

        if (!hasSerialization(this._serializationFunctions)) {
            console.warn(`No serialization functions defined for module instance ${this._moduleInstance.getName()}`);
            this._serializedState = null;
            return; // No serialization functions, cannot deserialize
        }

        let parsedSettings: unknown;
        let parsedView: unknown;
        try {
            parsedSettings = raw.settings ? JSON.parse(raw.settings) : undefined;
            parsedView = raw.view ? JSON.parse(raw.view) : undefined;
        } catch (e) {
            console.warn(`Invalid JSON in module state for instance ${this._moduleInstance.getName()}:`, e);
            this._serializedState = null;
            return;
        }

        if (this._serializedStateSchema.settings) {
            const validateSettings = ajv.compile(this._serializedStateSchema.settings);
            const isSettingsValid = parsedSettings === undefined || validateSettings(parsedSettings);
            if (!isSettingsValid) {
                console.warn(`Validation failed for settings in ${this._moduleInstance.getName()}`, {
                    settingsErrors: validateSettings.errors,
                });
                this._serializedState = null;
                return; // Invalid settings, do not apply state
            }
        }

        if (this._serializedStateSchema.view) {
            const validateView = ajv.compile(this._serializedStateSchema.view);
            const isViewValid = parsedView === undefined || validateView(parsedView);

            if (!isViewValid) {
                console.warn(`Validation failed for view in ${this._moduleInstance.getName()}`, {
                    viewErrors: validateView.errors,
                });
                this._serializedState = null;
                return;
            }
        }

        this._serializedState = {
            settings: parsedSettings as TSerializedState["settings"],
            view: parsedView as TSerializedState["view"],
        } as TSerializedState;

        this.applyStateToAtoms(this._serializedState);
    }

    applyTemplateState(templateState: PartialSerializedModuleState<TSerializedState>): void {
        this.applyStateToAtoms(
            {
                settings: templateState.settings,
                view: templateState.view,
            },
            true,
        );
    }

    private applyStateToAtoms(
        state: PartialSerializedModuleState<TSerializedState>,
        fromTemplate: boolean = false,
    ): void {
        if (!hasSerialization(this._serializationFunctions)) {
            console.warn(`No serialization functions defined for module instance ${this._moduleInstance.getName()}`);
            return; // No serialization functions, cannot apply state
        }

        const atomStore = this._atomStore;

        const persistedSetter: Setter = (atom, ...args) => {
            const [value] = args;
            const isPersistable = isPersistableAtom(atom);

            let finalValue = value;
            if (isPersistable) {
                if (fromTemplate) {
                    finalValue = { value, _source: Source.TEMPLATE };
                } else {
                    finalValue = { value, _source: Source.PERSISTENCE };
                }
            }

            return atomStore.set(atom as any, finalValue);
        };

        if (state.settings) {
            this._serializationFunctions.deserializeStateFunctions.settings?.(state.settings, persistedSetter);
        }

        if (state.view) {
            this._serializationFunctions.deserializeStateFunctions.view?.(state.view, persistedSetter);
        }
    }
}

function debounce(fn: () => void, delay: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(fn, delay);
    };
}

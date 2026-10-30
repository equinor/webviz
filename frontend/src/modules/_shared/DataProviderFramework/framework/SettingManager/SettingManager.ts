import { isEqual } from "lodash-es";
import { v4 } from "uuid";

import {
    ElevatedSettingInstanceTopic,
    type ElevatedSettingConstraintSourceHandle,
    type ElevatedSettingInstance,
} from "@framework/ElevatedSettings/ElevatedSettingInstance";
import {
    ElevatedSettingsServiceTopic,
    type ElevatedSettingsService,
} from "@framework/ElevatedSettings/ElevatedSettingsService";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import type { CustomSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingAttributes } from "../../interfacesAndTypes/customSettingsHandler";
import type { DpfElevatedSettingAdapter } from "../../settings/SettingRegistry/elevatedSettingAdapters";
import type { Setting, SettingTypeDefinitions } from "../../settings/settingsDefinitions";
import type { ExternalSettingController } from "../ExternalSettingController/ExternalSettingController";
import { Group } from "../Group/Group";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export enum SettingTopic {
    INTERNAL_VALUE = "INTERNAL_VALUE",
    VALUE = "VALUE",
    VALUE_ABOUT_TO_BE_CHANGED = "VALUE_ABOUT_TO_BE_CHANGED",
    IS_VALID = "IS_VALID",
    VALUE_CONSTRAINTS = "VALUE_CONSTRAINTS",
    IS_EXTERNALLY_CONTROLLED = "IS_EXTERNALLY_CONTROLLED",
    EXTERNAL_CONTROLLER_PROVIDER = "EXTERNAL_CONTROLLER_PROVIDER",
    IS_LOADING = "IS_LOADING",
    IS_BLOCKED = "IS_BLOCKED",
    BLOCKED_BY = "BLOCKED_BY",
    IS_INITIALIZED = "IS_INITIALIZED",
    IS_PERSISTED = "IS_PERSISTED",
    ATTRIBUTES = "ATTRIBUTES",
    ARE_ATTRIBUTES_RESOLVED = "ARE_ATTRIBUTES_RESOLVED",
    IS_PERSISTED_VALUE_VALID = "IS_PERSISTED_VALUE_VALID",
    IS_ELEVATED = "IS_ELEVATED",
}

export type SettingTopicPayloads<TInternalValue, TExternalValue, TValueConstraints> = {
    [SettingTopic.VALUE]: TExternalValue;
    [SettingTopic.INTERNAL_VALUE]: TInternalValue;
    [SettingTopic.VALUE_ABOUT_TO_BE_CHANGED]: void;
    [SettingTopic.IS_VALID]: boolean;
    [SettingTopic.VALUE_CONSTRAINTS]: TValueConstraints | null;
    [SettingTopic.IS_EXTERNALLY_CONTROLLED]: boolean;
    [SettingTopic.EXTERNAL_CONTROLLER_PROVIDER]: ExternalControllerProviderType | undefined;
    [SettingTopic.IS_LOADING]: boolean;
    [SettingTopic.IS_BLOCKED]: boolean;
    // The labels of the settings it is waiting for - the same reference while unchanged
    [SettingTopic.BLOCKED_BY]: string[];
    [SettingTopic.IS_INITIALIZED]: boolean;
    [SettingTopic.IS_PERSISTED]: boolean;
    [SettingTopic.ATTRIBUTES]: SettingAttributes;
    [SettingTopic.ARE_ATTRIBUTES_RESOLVED]: boolean;
    [SettingTopic.IS_PERSISTED_VALUE_VALID]: boolean;
    [SettingTopic.IS_ELEVATED]: boolean;
};

export type SettingManagerParams<
    TSetting extends Setting,
    TInternalValue extends SettingTypeDefinitions[TSetting]["internalValue"] | null =
        | SettingTypeDefinitions[TSetting]["internalValue"]
        | null,
    TExternalValue extends SettingTypeDefinitions[TSetting]["externalValue"] | null =
        | SettingTypeDefinitions[TSetting]["externalValue"]
        | null,
    TValueConstraints extends SettingTypeDefinitions[TSetting]["valueConstraints"] =
        SettingTypeDefinitions[TSetting]["valueConstraints"],
> = {
    type: TSetting;
    label: string;
    defaultValue: TInternalValue;
    customSettingImplementation: CustomSettingImplementation<TInternalValue, TExternalValue, TValueConstraints>;
    elevatedSettingAdapter?: DpfElevatedSettingAdapter<TInternalValue, TValueConstraints, any, any>;
};

type ElevatedSettingConnection = {
    instance: ElevatedSettingInstance<any, any>;
    handle: ElevatedSettingConstraintSourceHandle<any>;
};

export enum ExternalControllerProviderType {
    GROUP = "GROUP",
    SHARED_SETTING = "SHARED_SETTING",
}

const NO_CACHE = Symbol("NO_CACHE");
type NoCache = typeof NO_CACHE;

/*
 * The SettingManager class is responsible for managing a setting.
 *
 * It provides a method for setting available values, which are used to validate the setting value or applying a fixup if the value is invalid.
 * It provides methods for setting and getting the value and its states, checking if the value is valid, and setting the value as overridden or persisted.
 */
export class SettingManager<
    TSetting extends Setting,
    TInternalValue extends SettingTypeDefinitions[TSetting]["internalValue"] | null =
        | SettingTypeDefinitions[TSetting]["internalValue"]
        | null,
    TExternalValue extends SettingTypeDefinitions[TSetting]["externalValue"] | null =
        | SettingTypeDefinitions[TSetting]["externalValue"]
        | null,
    TValueConstraints extends SettingTypeDefinitions[TSetting]["valueConstraints"] =
        SettingTypeDefinitions[TSetting]["valueConstraints"],
> implements PublishSubscribe<SettingTopicPayloads<TInternalValue, TExternalValue, TValueConstraints>> {
    private _id: string;
    private _type: TSetting;
    private _label: string;
    private _customSettingImplementation: CustomSettingImplementation<
        TInternalValue,
        TExternalValue,
        TValueConstraints
    >;
    private _internalValue: TInternalValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<
        SettingTopicPayloads<TInternalValue, TExternalValue, TValueConstraints>
    >();
    private _valueConstraints: TValueConstraints | null = null;
    private _loading: boolean = false;
    // Blocked: the value constraints can't be resolved, as a setting they are read from is invalid (or blocked itself).
    // The current value and constraints are kept until they can be resolved again.
    private _blocked: boolean = false;
    private _blockedBy: string[] = [];
    private _initialized: boolean = false;
    private _currentValueFromPersistence: TInternalValue | null = null;
    private _currentValueFromPersistenceIsValid: boolean = true;
    private _isStatic: boolean;
    private _attributes: SettingAttributes = {
        enabled: true,
        visible: true,
    };
    private _numUnresolvedAttributeBindings = 0;
    private _externalController: ExternalSettingController<
        TSetting,
        TInternalValue,
        TExternalValue,
        TValueConstraints
    > | null = null;
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _cachedExternalValue: TExternalValue | null | NoCache = NO_CACHE;

    // While the elevated setting is active on the dashboard, its value (mapped by the adapter) replaces
    // this setting's own - which is kept as the local value, and used again once it is no longer active.
    private _elevatedSettingAdapter: DpfElevatedSettingAdapter<TInternalValue, TValueConstraints, any, any> | null;
    private _elevatedSettingsService: ElevatedSettingsService | null = null;
    private _elevatedSettingConnection: ElevatedSettingConnection | null = null;
    private _cachedElevatedInternalValue: TInternalValue | NoCache = NO_CACHE;

    constructor({
        type,
        customSettingImplementation,
        defaultValue,
        label,
        elevatedSettingAdapter,
    }: SettingManagerParams<TSetting, TInternalValue, TExternalValue, TValueConstraints>) {
        this._id = v4();
        this._type = type;
        this._label = label;
        this._customSettingImplementation = customSettingImplementation;
        this._elevatedSettingAdapter = elevatedSettingAdapter ?? null;
        this._internalValue = defaultValue;
        this._isStatic = customSettingImplementation.getIsStatic?.() ?? false;
        if (this._isStatic) {
            this.setValueValid(this.checkIfValueIsValid(this._internalValue));
        }
    }

    getValueConstraintsReducerDefinition() {
        if ("valueConstraintsIntersectionReducerDefinition" in this._customSettingImplementation) {
            return this._customSettingImplementation.valueConstraintsIntersectionReducerDefinition ?? null;
        }
        return null;
    }

    registerExternalSettingController(
        externalController: ExternalSettingController<TSetting, TInternalValue, TExternalValue, TValueConstraints>,
    ): void {
        this._externalController = externalController;

        // The controlling setting is the elevated setting's consumer now - this one follows it.
        this.updateElevatedSettingConnection();

        // Mirrors the controller's local value (not an elevated one), so this setting keeps a sensible
        // value of its own once it is no longer controlled.
        this.setInternalValueAndInvalidateCache(externalController.getSetting().getLocalInternalValue());

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.INTERNAL_VALUE)(() => {
                this.setInternalValueAndInvalidateCache(externalController.getSetting().getLocalInternalValue());
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.INTERNAL_VALUE);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController.getSetting().getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE)(
                () => {
                    this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
                },
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController.getSetting().getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.IS_VALID)(
                () => {
                    this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_VALID);
                },
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_LOADING)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_LOADING);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_BLOCKED)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_BLOCKED);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.BLOCKED_BY)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.BLOCKED_BY);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.ATTRIBUTES)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.ATTRIBUTES);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_INITIALIZED)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_INITIALIZED);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_PERSISTED)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.VALUE_CONSTRAINTS)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_CONSTRAINTS);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_PERSISTED_VALUE_VALID)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED_VALUE_VALID);
            }),
        );

        this.notifySnapshotSourceChange();
    }

    unregisterExternalSettingController(): void {
        const newInternalValue =
            this._externalController?.getSetting().getLocalInternalValue() ?? this._internalValue;
        this.setInternalValueAndInvalidateCache(newInternalValue);
        this._externalController = null;
        this._unsubscribeFunctionsManagerDelegate.unsubscribe("external-setting-controller");
        this.updateElevatedSettingConnection();
        this.applyValueConstraints();
        this.notifySnapshotSourceChange();
    }

    beforeDestroy(): void {
        this.disconnectElevatedSetting();
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    /**
     * Lets this setting follow the elevated setting its type is registered with (if any), whenever that
     * is active on the dashboard - see `DpfElevatedSettingAdapter`.
     */
    connectElevatedSettingsService(elevatedSettingsService: ElevatedSettingsService): void {
        if (!this._elevatedSettingAdapter || this._elevatedSettingsService === elevatedSettingsService) {
            return;
        }

        this._elevatedSettingsService = elevatedSettingsService;

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("elevated-settings-service");
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "elevated-settings-service",
            elevatedSettingsService
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(ElevatedSettingsServiceTopic.ACTIVE_SETTINGS)(() => {
                this.updateElevatedSettingConnection();
            }),
        );

        this.updateElevatedSettingConnection();
    }

    // Whether the setting is currently controlled by its elevated setting - connected, and following it.
    isElevated(): boolean {
        return this.getFollowedElevatedSettingConnection() !== null;
    }

    getElevatedSettingLabel(): string | null {
        return this._elevatedSettingConnection?.instance.getDefinition().label ?? null;
    }

    keepsComponentEditableWhileElevated(): boolean {
        return this._elevatedSettingAdapter?.keepsComponentEditableWhileControlled ?? false;
    }

    getId(): string {
        return this._id;
    }

    getType(): Setting {
        return this._type;
    }

    getLabel(): string {
        return this._label;
    }

    getAttributes(): SettingAttributes {
        return this._attributes;
    }

    /*
     * Registers a binding that resolves the attributes. Until every registered binding has resolved once, the attributes
     * are only defaults - e.g. a setting would be shown before its binding hides it.
     * Returns the function to call once the binding has resolved - calling it again has no effect.
     */
    registerAttributesBinding(): () => void {
        this._numUnresolvedAttributeBindings++;
        if (this._numUnresolvedAttributeBindings === 1) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.ARE_ATTRIBUTES_RESOLVED);
        }

        let resolved = false;
        return () => {
            if (resolved) {
                return;
            }
            resolved = true;
            this._numUnresolvedAttributeBindings--;
            if (this._numUnresolvedAttributeBindings === 0) {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.ARE_ATTRIBUTES_RESOLVED);
            }
        };
    }

    areAttributesResolved(): boolean {
        return this._numUnresolvedAttributeBindings === 0;
    }

    // Returns whether the attributes changed (and ATTRIBUTES was published)
    updateAttributes(attributes: Partial<SettingAttributes>): boolean {
        const newAttributes = {
            ...this._attributes,
            ...attributes,
        };
        if (isEqual(this._attributes, newAttributes)) {
            return false;
        }

        this._attributes = newAttributes;

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.ATTRIBUTES);
        return true;
    }

    // The value in effect - the elevated one while the setting is elevated.
    getInternalValue(): TInternalValue {
        if (this._externalController) {
            return this._externalController.getSetting().getInternalValue();
        }

        const followedConnection = this.getFollowedElevatedSettingConnection();
        if (followedConnection) {
            return this.getElevatedInternalValue(followedConnection);
        }

        return this.getLocalInternalValue();
    }

    // The setting's own value, regardless of any elevated setting - this is what is persisted.
    getLocalInternalValue(): TInternalValue {
        if (this._externalController) {
            return this._externalController.getSetting().getLocalInternalValue();
        }

        if (this._currentValueFromPersistence !== null) {
            return this._currentValueFromPersistence;
        }

        return this._internalValue;
    }

    getValue(): TExternalValue | null {
        if (this._externalController) {
            return this._externalController.getSetting().getValue();
        }

        if (!this._isStatic && this._valueConstraints === null) {
            return null;
        }

        const value = this.getInternalValue();

        // Return cached value if available
        if (this._cachedExternalValue !== NO_CACHE) {
            return this._cachedExternalValue;
        }

        const mappingFunc = this._customSettingImplementation.mapInternalToExternalValue;
        // Type assertion needed because:
        // - Static settings accept `any` for valueConstraints (which can be null)
        // - Dynamic settings require non-null valueConstraints, but we've already guarded against null above
        // - TypeScript can't infer that the guard ensures non-null for dynamic settings at this point
        const externalValue = mappingFunc.bind(this._customSettingImplementation)(value, this._valueConstraints as any);

        // Cache the computed external value
        this._cachedExternalValue = externalValue;

        return externalValue;
    }

    isStatic(): boolean {
        return this._isStatic;
    }

    serializeValue(): string {
        if (this._customSettingImplementation.serializeValue) {
            return this._customSettingImplementation.serializeValue.bind(this._customSettingImplementation)(
                this.getLocalInternalValue(),
            );
        }

        return JSON.stringify(this.getLocalInternalValue());
    }

    deserializeValue(serializedValue: string): void {
        // Invalidate cache since _currentValueFromPersistence affects the value returned by getValue()
        // (and the local value an elevated value is mapped against)
        this.invalidateValueCaches();

        try {
            const deserializedValue = this._customSettingImplementation.deserializeValue.bind(
                this._customSettingImplementation,
            )(serializedValue);

            this._currentValueFromPersistence = deserializedValue;
            this.setPersistedValueIsValid(true);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
        } catch (error) {
            console.error(`Failed to deserialize value for setting "${this._label}":`, error);
            this._currentValueFromPersistence = null;
            this.setPersistedValueIsValid(false);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
        }
    }

    isExternallyControlled(): boolean {
        return this._externalController !== null;
    }

    isValueValid(): boolean {
        if (this._externalController) {
            return this._externalController.getSetting().isValueValid();
        }
        return this._isValueValid;
    }

    isPersistedValue(): boolean {
        if (this._externalController) {
            return this._externalController.getSetting().isPersistedValue();
        }

        // Persisted value is not valid
        if (!this._currentValueFromPersistenceIsValid) {
            return true;
        }
        return this._currentValueFromPersistence !== null;
    }

    private setPersistedValueIsValid(isValid: boolean): void {
        if (this._currentValueFromPersistenceIsValid === isValid) {
            return;
        }

        this._currentValueFromPersistenceIsValid = isValid;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED_VALUE_VALID);
    }

    /*
     * This method is used to set the value of the setting.
     * It should only be called when a user is changing a setting.
     */
    setValue(value: TInternalValue): void {
        if (isEqual(this._internalValue, value)) {
            return;
        }
        this._currentValueFromPersistence = null;
        this.setPersistedValueIsValid(true);

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED);

        this.setInternalValueAndInvalidateCache(value);

        this.setValueValid(this.checkIfValueIsValid(this.getInternalValue()));
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.INTERNAL_VALUE);
        if (this._elevatedSettingConnection) {
            // A changed local value may change whether the setting follows its elevated setting
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_ELEVATED);
        }
    }

    setValueValid(isValueValid: boolean): void {
        if (this._isValueValid === isValueValid) {
            return;
        }
        this._isValueValid = isValueValid;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_VALID);
    }

    setLoading(loading: boolean): void {
        // An external controller derives the shared setting's loading state from its visible controlled settings
        // via the IS_LOADING topic, so a single (possibly hidden) setting must not set it directly
        if (this._loading !== loading) {
            this._loading = loading;
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_LOADING);
            // Pending while loading, settled (with the current constraints) again once done.
            this.contributeElevatedSettingConstraints();
        }

        // Resolving again ends being blocked - only after the loading state is published, so nothing that reacts to
        // the setting no longer being blocked resolves against its current, outdated value
        if (loading) {
            this.setBlocked(false);
        }
    }

    /*
     * A setting is blocked when its value constraints can't be resolved, as a shown setting they are read from is invalid
     * or blocked itself - see Dependency. It keeps its value and constraints, and is no longer blocked as soon as it
     * resolves again: when it starts loading or gets value constraints.
     */
    setBlocked(blocked: boolean, blockedBy: string[] = []): void {
        const newBlockedBy = blocked ? blockedBy : [];
        const isBlockedByChanged = !isEqual(this._blockedBy, newBlockedBy);
        if (this._blocked === blocked && !isBlockedByChanged) {
            return;
        }

        this._blocked = blocked;
        // Only replaced when changed, so the BLOCKED_BY snapshot keeps its reference otherwise
        if (isBlockedByChanged) {
            this._blockedBy = newBlockedBy;
        }

        // Also notified when only the labels change, as ExternalSettingController combines them on this topic
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_BLOCKED);
        if (isBlockedByChanged) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.BLOCKED_BY);
        }
    }

    initialize(): void {
        if (this._initialized) {
            return;
        }
        this._initialized = true;

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_INITIALIZED);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
    }

    isInitialized(itself: boolean = false): boolean {
        if (this._externalController && !itself) {
            return this._externalController.getSetting().isInitialized();
        }
        return this._initialized || this._isStatic;
    }

    isLoading(itself: boolean = false): boolean {
        if (this._externalController && !itself) {
            return this._externalController.getSetting().isLoading();
        }
        return this._loading;
    }

    isBlocked(itself: boolean = false): boolean {
        if (this._externalController && !itself) {
            return this._externalController.getSetting().isBlocked();
        }
        return this._blocked;
    }

    // The labels of the settings it is waiting for
    getBlockedBy(itself: boolean = false): string[] {
        if (this._externalController && !itself) {
            return this._externalController.getSetting().getBlockedBy();
        }
        return this._blockedBy;
    }

    valueToRepresentation(
        value: TInternalValue,
        workbenchSession: WorkbenchSession,
        workbenchSettings: WorkbenchSettings,
    ): React.ReactNode {
        if (this._externalController) {
            return this._externalController
                .getSetting()
                .valueToRepresentation(value, workbenchSession, workbenchSettings);
        }

        if (this._customSettingImplementation.overriddenValueRepresentation) {
            return this._customSettingImplementation.overriddenValueRepresentation.bind(
                this._customSettingImplementation,
            )({
                value,
                workbenchSession,
                workbenchSettings,
            });
        }

        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }

        if (typeof value === "string") {
            return value;
        }

        if (typeof value === "number") {
            return value.toString();
        }

        return "Value has no string representation";
    }

    makeSnapshotGetter<T extends SettingTopic>(
        topic: T,
    ): () => SettingTopicPayloads<TInternalValue, TExternalValue, TValueConstraints>[T] {
        // The snapshot getter must always read this._externalController at snapshot time, not at
        // makeSnapshotGetter call time. useSyncExternalStore captures the returned function once
        // at mount, so branching on this._externalController here would permanently lock the
        // snapshot to the state at mount — e.g. EXTERNAL_CONTROLLER_PROVIDER would always return
        // undefined for settings that mount without a controller.
        return (): any => {
            if (this._externalController) {
                if (topic === SettingTopic.IS_EXTERNALLY_CONTROLLED) {
                    return true;
                }
                if (topic === SettingTopic.EXTERNAL_CONTROLLER_PROVIDER) {
                    const controllerParentItem = this._externalController.getParentItem();
                    if (controllerParentItem instanceof Group) {
                        return ExternalControllerProviderType.GROUP;
                    }
                    if (controllerParentItem instanceof SharedSetting) {
                        return ExternalControllerProviderType.SHARED_SETTING;
                    }
                    throw new Error("Unknown external controller provider type");
                }
                if (topic === SettingTopic.ATTRIBUTES) {
                    return this._attributes;
                }
                if (topic === SettingTopic.ARE_ATTRIBUTES_RESOLVED) {
                    return this.areAttributesResolved();
                }
                return this._externalController.getSetting().makeSnapshotGetter(topic)();
            }

            switch (topic) {
                case SettingTopic.VALUE:
                    return this.getValue();
                case SettingTopic.INTERNAL_VALUE:
                    return this.getInternalValue();
                case SettingTopic.VALUE_ABOUT_TO_BE_CHANGED:
                    return;
                case SettingTopic.IS_VALID:
                    return this._isValueValid;
                case SettingTopic.VALUE_CONSTRAINTS:
                    return this._valueConstraints;
                case SettingTopic.IS_EXTERNALLY_CONTROLLED:
                    return false;
                case SettingTopic.EXTERNAL_CONTROLLER_PROVIDER:
                    return undefined;
                case SettingTopic.IS_LOADING:
                    return this.isLoading();
                case SettingTopic.IS_BLOCKED:
                    return this.isBlocked();
                case SettingTopic.BLOCKED_BY:
                    return this.getBlockedBy();
                case SettingTopic.IS_PERSISTED:
                    return this.isPersistedValue();
                case SettingTopic.IS_PERSISTED_VALUE_VALID:
                    return this._currentValueFromPersistenceIsValid;
                case SettingTopic.IS_INITIALIZED:
                    return this.isInitialized();
                case SettingTopic.ATTRIBUTES:
                    return this._attributes;
                case SettingTopic.IS_ELEVATED:
                    return this.isElevated();
                case SettingTopic.ARE_ATTRIBUTES_RESOLVED:
                    return this.areAttributesResolved();
                default:
                    throw new Error(`Unknown topic: ${topic}`);
            }
        };
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    getValueConstraints(): TValueConstraints | null {
        if (this._externalController) {
            return this._externalController.getSetting().getValueConstraints();
        }
        return this._valueConstraints;
    }

    maybeResetPersistedValue(): boolean {
        if (this._isStatic) {
            if (this._currentValueFromPersistence !== null && this._currentValueFromPersistenceIsValid) {
                this.setInternalValueAndInvalidateCache(this._currentValueFromPersistence);
                this._currentValueFromPersistence = null;
                this.setValueValid(true);
            }
            return true;
        }
        if (this._currentValueFromPersistence === null || this._valueConstraints === null) {
            return false;
        }

        const customIsValueValidFunction = this._customSettingImplementation.isValueValid;

        const isPersistedValueValid = customIsValueValidFunction
            ? customIsValueValidFunction.bind(this._customSettingImplementation)(
                  this._currentValueFromPersistence,
                  this._valueConstraints as any,
              )
            : true;

        if (isPersistedValueValid && this._currentValueFromPersistenceIsValid) {
            this.setInternalValueAndInvalidateCache(this._currentValueFromPersistence);
            this._currentValueFromPersistence = null;
            this.setValueValid(true);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
            return true;
        }

        return false;
    }

    private applyValueConstraints(): boolean {
        let valueChanged = false;
        const localInternalValue = this.getLocalInternalValue();
        // Preserve initialized, non-empty local values for the user to resolve, but still fix up the local value while elevated.
        const isValueFixedUp =
            (!this._initialized || localInternalValue === null) &&
            !this.checkIfValueIsValid(localInternalValue) &&
            this.maybeFixupValue();
        const isPersistedValueReset = this.maybeResetPersistedValue();
        if (isValueFixedUp || isPersistedValueReset) {
            valueChanged = true;
        }
        const prevIsValid = this._isValueValid;
        this.setValueValid(this.checkIfValueIsValid(this.getInternalValue()));
        this.setLoading(false);

        const shouldNotifyValueChanged =
            valueChanged || this._isValueValid !== prevIsValid || this._internalValue === null;
        return shouldNotifyValueChanged;
    }

    /*
     * Getting value constraints ends being blocked. Usually it isn't blocked anymore already, as it started loading before
     * they were resolved - otherwise, it ends once the validity is up to date, so that nothing reacting to it no longer
     * being blocked judges it by the outdated constraints.
     */
    setValueConstraints(valueConstraints: TValueConstraints | null): void {
        if (this._externalController) {
            this.setValueConstraintsAndInvalidateCache(valueConstraints);
            this.maybeResetPersistedValue();
            this._loading = false;
            this.initialize();
            this._externalController.setValueConstraints(this.getId(), valueConstraints);
            // Only now - the controller would otherwise make the intersection from the outdated constraints first
            this.setBlocked(false);
            return;
        }

        if (isEqual(this._valueConstraints, valueConstraints) && this._initialized) {
            this.setLoading(false);
            this.setBlocked(false);
            return;
        }

        // The external value may depend on the constraints alone (e.g. "all" mapping to every available item),
        // so it can change even though the internal value and its validity stay the same
        const prevExternalValue = this.getValue();
        this.setValueConstraintsAndInvalidateCache(valueConstraints);

        const shouldNotifyValueChanged =
            this.applyValueConstraints() || !isEqual(prevExternalValue, this.getValue());
        this.setBlocked(false);
        this.initialize();
        if (shouldNotifyValueChanged) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        }
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_CONSTRAINTS);

        this.contributeElevatedSettingConstraints();
    }

    makeComponent() {
        return this._customSettingImplementation.makeComponent();
    }

    private maybeFixupValue(): boolean {
        if (this.checkIfValueIsValid(this._internalValue)) {
            return false;
        }

        if (this.isPersistedValue()) {
            return false;
        }

        if (this._valueConstraints === null) {
            return false;
        }

        const customFixupFunction = this._customSettingImplementation.fixupValue;

        const candidate = customFixupFunction
            ? customFixupFunction.bind(this._customSettingImplementation)(
                  this._internalValue,
                  this._valueConstraints as any,
              )
            : this._internalValue;

        if (isEqual(candidate, this._internalValue)) {
            return false;
        }
        this.setInternalValueAndInvalidateCache(candidate);
        return true;
    }

    private checkIfValueIsValid(value: TInternalValue): boolean {
        if (this._isStatic) {
            return true;
        }
        if (this._valueConstraints === null) {
            return false;
        }

        const customIsValueValidFunction = this._customSettingImplementation.isValueValid;

        if (!customIsValueValidFunction) {
            return true;
        }

        return customIsValueValidFunction.bind(this._customSettingImplementation)(value, this._valueConstraints as any);
    }

    /**
     * Notifies all relevant topics whose snapshot source changes when switching to or from an external controller.
     * These are all topics that delegate to the external controller's setting in makeSnapshotGetter.
     */
    private notifySnapshotSourceChange(): void {
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_EXTERNALLY_CONTROLLED);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.EXTERNAL_CONTROLLER_PROVIDER);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.INTERNAL_VALUE);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_VALID);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_LOADING);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_BLOCKED);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.BLOCKED_BY);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_INITIALIZED);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_CONSTRAINTS);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED_VALUE_VALID);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_ELEVATED);
    }

    /**
     * Sets the internal value and invalidates the value caches.
     * Use this instead of directly assigning to this._internalValue.
     */
    private setInternalValueAndInvalidateCache(value: TInternalValue): void {
        this._internalValue = value;
        this.invalidateValueCaches();
    }

    /**
     * Sets the value constraints and invalidates the value caches.
     * Use this instead of directly assigning to this._valueConstraints.
     */
    private setValueConstraintsAndInvalidateCache(valueConstraints: TValueConstraints | null): void {
        this._valueConstraints = valueConstraints;
        this.invalidateValueCaches();
    }

    private invalidateValueCaches(): void {
        this._cachedExternalValue = NO_CACHE;
        this._cachedElevatedInternalValue = NO_CACHE;
    }

    // Connects to the elevated setting while it is active on the dashboard - unless this setting is
    // externally controlled, in which case the controlling setting is the one connected.
    private updateElevatedSettingConnection(): void {
        if (!this._elevatedSettingAdapter || !this._elevatedSettingsService) {
            return;
        }

        const instance = this._externalController
            ? null
            : this._elevatedSettingsService.getSetting(this._elevatedSettingAdapter.definition);

        if (instance === (this._elevatedSettingConnection?.instance ?? null)) {
            return;
        }

        this.disconnectElevatedSetting();
        if (instance) {
            this.connectElevatedSetting(instance);
        }

        this.handleEffectiveValueChange();
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_ELEVATED);
    }

    private connectElevatedSetting(instance: ElevatedSettingInstance<any, any>): void {
        if (!this._elevatedSettingAdapter) {
            return;
        }

        const handle = instance.registerConstraintSource(this._id);
        this._elevatedSettingConnection = { instance, handle };

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "elevated-setting-instance",
            instance.getPublishSubscribeDelegate().makeSubscriberFunction(ElevatedSettingInstanceTopic.VALUE)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED);
                this.handleEffectiveValueChange();
            }),
        );

        this.contributeElevatedSettingConstraints();
    }

    private disconnectElevatedSetting(): void {
        if (!this._elevatedSettingConnection) {
            return;
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("elevated-setting-instance");
        this._elevatedSettingConnection.handle.unregister();
        this._elevatedSettingConnection = null;
    }

    private contributeElevatedSettingConstraints(): void {
        const connection = this._elevatedSettingConnection;
        if (!connection || !this._elevatedSettingAdapter || this._isStatic) {
            return;
        }

        if (this._loading) {
            connection.handle.markPending();
            return;
        }

        const elevatedConstraints =
            this._valueConstraints === null
                ? null
                : this._elevatedSettingAdapter.mapValueConstraintsToElevatedConstraints(this._valueConstraints);

        if (elevatedConstraints === null) {
            connection.handle.clearConstraints();
            return;
        }

        connection.handle.updateConstraints(elevatedConstraints);
    }

    // Cached like the external value: snapshot getters need a stable reference, and an adapter may build
    // a new object on every call.
    private getElevatedInternalValue(connection: ElevatedSettingConnection): TInternalValue {
        if (this._cachedElevatedInternalValue !== NO_CACHE) {
            return this._cachedElevatedInternalValue;
        }

        // Dynamic settings can only map the elevated value once their own constraints are known.
        if (!this._elevatedSettingAdapter || (!this._isStatic && this._valueConstraints === null)) {
            return null as TInternalValue;
        }

        const elevatedInternalValue = this._elevatedSettingAdapter.mapElevatedValueToInternalValue(
            connection.instance.getValue(),
            this._valueConstraints as TValueConstraints,
            this.getLocalInternalValue(),
        );
        this._cachedElevatedInternalValue = elevatedInternalValue;

        return elevatedInternalValue;
    }

    // The connection, if this setting currently follows the elevated value - see
    // `DpfElevatedSettingAdapter.followsElevatedValue`.
    private getFollowedElevatedSettingConnection(): ElevatedSettingConnection | null {
        const connection = this._elevatedSettingConnection;
        if (!connection || !this._elevatedSettingAdapter) {
            return null;
        }

        const follows =
            this._elevatedSettingAdapter.followsElevatedValue?.(
                connection.instance.getValue(),
                this.getLocalInternalValue(),
            ) ?? true;

        return follows ? connection : null;
    }

    private handleEffectiveValueChange(): void {
        this.invalidateValueCaches();
        this.setValueValid(this.checkIfValueIsValid(this.getInternalValue()));
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.INTERNAL_VALUE);
        // A changed elevated value may change whether the setting follows it
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_ELEVATED);
    }
}

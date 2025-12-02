import { isEqual } from "lodash";
import { v4 } from "uuid";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import type { CustomSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingAttributes } from "../../interfacesAndTypes/customSettingsHandler";
import type { Setting, SettingTypeDefinitions } from "../../settings/settingsDefinitions";
import type { ExternalSettingController } from "../ExternalSettingController/ExternalSettingController";
import { Group } from "../Group/Group";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export enum SettingTopic {
    INTERNAL_VALUE = "INTERNAL_VALUE",
    VALUE = "VALUE",
    VALUE_ABOUT_TO_BE_CHANGED = "VALUE_ABOUT_TO_BE_CHANGED",
    IS_VALID = "IS_VALID",
    VALUE_RANGE = "VALUE_RANGE",
    IS_EXTERNALLY_CONTROLLED = "IS_EXTERNALLY_CONTROLLED",
    EXTERNAL_CONTROLLER_PROVIDER = "EXTERNAL_CONTROLLER_PROVIDER",
    IS_LOADING = "IS_LOADING",
    IS_INITIALIZED = "IS_INITIALIZED",
    IS_PERSISTED = "IS_PERSISTED",
    ATTRIBUTES = "ATTRIBUTES",
}

export type SettingTopicPayloads<TInternalValue, TExternalValue, TValueRange> = {
    [SettingTopic.VALUE]: TExternalValue;
    [SettingTopic.INTERNAL_VALUE]: TInternalValue;
    [SettingTopic.VALUE_ABOUT_TO_BE_CHANGED]: void;
    [SettingTopic.IS_VALID]: boolean;
    [SettingTopic.VALUE_RANGE]: TValueRange | null;
    [SettingTopic.IS_EXTERNALLY_CONTROLLED]: boolean;
    [SettingTopic.EXTERNAL_CONTROLLER_PROVIDER]: ExternalControllerProviderType | undefined;
    [SettingTopic.IS_LOADING]: boolean;
    [SettingTopic.IS_INITIALIZED]: boolean;
    [SettingTopic.IS_PERSISTED]: boolean;
    [SettingTopic.ATTRIBUTES]: SettingAttributes;
};

export type SettingManagerParams<
    TSetting extends Setting,
    TInternalValue extends SettingTypeDefinitions[TSetting]["internalValue"] | null =
        | SettingTypeDefinitions[TSetting]["internalValue"]
        | null,
    TExternalValue extends SettingTypeDefinitions[TSetting]["externalValue"] | null =
        | SettingTypeDefinitions[TSetting]["externalValue"]
        | null,
    TValueRange extends SettingTypeDefinitions[TSetting]["valueRange"] = SettingTypeDefinitions[TSetting]["valueRange"],
> = {
    type: TSetting;
    label: string;
    defaultValue: TInternalValue;
    customSettingImplementation: CustomSettingImplementation<TInternalValue, TExternalValue, TValueRange>;
};

export enum ExternalControllerProviderType {
    GROUP = "GROUP",
    SHARED_SETTING = "SHARED_SETTING",
}

const NO_CACHE = Symbol("NO_CACHE");

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
    TValueRange extends SettingTypeDefinitions[TSetting]["valueRange"] = SettingTypeDefinitions[TSetting]["valueRange"],
> implements PublishSubscribe<SettingTopicPayloads<TInternalValue, TExternalValue, TValueRange>>
{
    private _id: string;
    private _type: TSetting;
    private _label: string;
    private _customSettingImplementation: CustomSettingImplementation<TInternalValue, TExternalValue, TValueRange>;
    private _internalValue: TInternalValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<
        SettingTopicPayloads<TInternalValue, TExternalValue, TValueRange>
    >();
    private _valueRange: TValueRange | null = null;
    private _loading: boolean = false;
    private _initialized: boolean = false;
    private _currentValueFromPersistence: TInternalValue | null = null;
    private _isStatic: boolean;
    private _attributes: SettingAttributes = {
        enabled: true,
        visible: true,
    };
    private _externalController: ExternalSettingController<
        TSetting,
        TInternalValue,
        TExternalValue,
        TValueRange
    > | null = null;
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _cachedExternalValue: TExternalValue | null | typeof NO_CACHE = NO_CACHE;

    constructor({
        type,
        customSettingImplementation,
        defaultValue,
        label,
    }: SettingManagerParams<TSetting, TInternalValue, TExternalValue, TValueRange>) {
        this._id = v4();
        this._type = type;
        this._label = label;
        this._customSettingImplementation = customSettingImplementation;
        this._internalValue = defaultValue;
        this._isStatic = customSettingImplementation.getIsStatic?.() ?? false;
        if (this._isStatic) {
            this.setValueValid(this.checkIfValueIsValid(this._internalValue));
        }
    }

    getValueRangeReducerDefinition() {
        if ("valueRangeIntersectionReducerDefinition" in this._customSettingImplementation) {
            return this._customSettingImplementation.valueRangeIntersectionReducerDefinition ?? null;
        }
        return null;
    }

    registerExternalSettingController(
        externalController: ExternalSettingController<TSetting, TInternalValue, TExternalValue, TValueRange>,
    ): void {
        this._externalController = externalController;
        this.setInternalValueAndInvalidateCache(externalController.getSetting().getInternalValue());
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController.getSetting().getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE)(
                () => {
                    this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
                    this.setInternalValueAndInvalidateCache(externalController.getSetting().getInternalValue());
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
                .makeSubscriberFunction(SettingTopic.VALUE_RANGE)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_RANGE);
            }),
        );
    }

    unregisterExternalSettingController(): void {
        const newInternalValue = this._externalController?.getSetting().getInternalValue() ?? this._internalValue;
        this.setInternalValueAndInvalidateCache(newInternalValue);
        this._externalController = null;
        this._unsubscribeFunctionsManagerDelegate.unsubscribe("external-setting-controller");
        const shouldNotifyValueChanged = this.applyValueRange();
        if (shouldNotifyValueChanged) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        }
    }

    beforeDestroy(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
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

    updateAttributes(attributes: Partial<SettingAttributes>): void {
        if (isEqual(this._attributes, attributes)) {
            return;
        }

        this._attributes = {
            ...this._attributes,
            ...attributes,
        };

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.ATTRIBUTES);
    }

    getInternalValue(): TInternalValue {
        if (this._externalController) {
            return this._externalController.getSetting().getInternalValue();
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

        let value = this._internalValue;
        if (this._currentValueFromPersistence !== null) {
            value = this._currentValueFromPersistence;
        }

        if (!this._isStatic && this._valueRange === null) {
            return null;
        }

        // Return cached value if available
        if (this._cachedExternalValue !== NO_CACHE) {
            return this._cachedExternalValue;
        }

        const mappingFunc = this._customSettingImplementation.mapInternalToExternalValue;
        // Type assertion needed because:
        // - Static settings accept `any` for valueRange (which can be null)
        // - Dynamic settings require non-null valueRange, but we've already guarded against null above
        // - TypeScript can't infer that the guard ensures non-null for dynamic settings at this point
        const externalValue = mappingFunc(value, this._valueRange as any);

        // Cache the computed external value
        this._cachedExternalValue = externalValue;

        return externalValue;
    }

    isStatic(): boolean {
        return this._isStatic;
    }

    serializeValue(): string {
        if (this._customSettingImplementation.serializeValue) {
            return this._customSettingImplementation.serializeValue(this.getInternalValue());
        }

        return JSON.stringify(this.getInternalValue());
    }

    deserializeValue(serializedValue: string): void {
        // Invalidate cache since _currentValueFromPersistence affects the value returned by getValue()
        this._cachedExternalValue = NO_CACHE;

        try {
            let deserializedValue = JSON.parse(serializedValue);
            if (this._customSettingImplementation.deserializeValue) {
                deserializedValue = this._customSettingImplementation.deserializeValue(serializedValue);
            }

            // Validate parsed value has correct structure
            if (!this.isDeserializedValueValidStructure(deserializedValue)) {
                console.warn(
                    `Deserialized value for setting "${this._label}" has invalid structure, resetting to null`,
                );
                this._currentValueFromPersistence = null;
                return;
            }

            this._currentValueFromPersistence = deserializedValue;
        } catch (error) {
            console.error(`Failed to deserialize value for setting "${this._label}":`, error);
            this._currentValueFromPersistence = null;
        }
    }

    /**
     * Validates that a deserialized value has the correct structure/type.
     * This is a basic structural validation before the value is used.
     * Uses the required isValueValidStructure method from the custom implementation.
     */
    private isDeserializedValueValidStructure(value: unknown): value is TInternalValue {
        return this._customSettingImplementation.isValueValidStructure(value);
    }

    isExternallyControlled(): boolean {
        if (this._externalController) {
            return this._externalController.getSetting().isExternallyControlled();
        }
        return false;
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
        return this._currentValueFromPersistence !== null;
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

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED);

        this.setInternalValueAndInvalidateCache(value);

        this.setValueValid(this.checkIfValueIsValid(this._internalValue));
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
    }

    setValueValid(isValueValid: boolean): void {
        if (this._isValueValid === isValueValid) {
            return;
        }
        this._isValueValid = isValueValid;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_VALID);
    }

    setLoading(loading: boolean): void {
        if (this._externalController) {
            this._externalController.getSetting().setLoading(loading);
        }

        if (this._loading === loading) {
            return;
        }

        this._loading = loading;

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_LOADING);
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
            return this._customSettingImplementation.overriddenValueRepresentation({
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
    ): () => SettingTopicPayloads<TInternalValue, TExternalValue, TValueRange>[T] {
        const externalController = this._externalController;
        if (externalController) {
            return (): any => {
                if (topic === SettingTopic.IS_EXTERNALLY_CONTROLLED) {
                    return true;
                }
                if (topic === SettingTopic.EXTERNAL_CONTROLLER_PROVIDER) {
                    const controllerParentItem = externalController.getParentItem();
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
                return externalController.getSetting().makeSnapshotGetter(topic)();
            };
        }

        const snapshotGetter = (): any => {
            switch (topic) {
                case SettingTopic.VALUE:
                    return this.getValue();
                case SettingTopic.INTERNAL_VALUE:
                    return this.getInternalValue();
                case SettingTopic.VALUE_ABOUT_TO_BE_CHANGED:
                    return;
                case SettingTopic.IS_VALID:
                    return this._isValueValid;
                case SettingTopic.VALUE_RANGE:
                    return this._valueRange;
                case SettingTopic.IS_EXTERNALLY_CONTROLLED:
                    return this._externalController !== null;
                case SettingTopic.EXTERNAL_CONTROLLER_PROVIDER:
                    return undefined;
                case SettingTopic.IS_LOADING:
                    return this.isLoading();
                case SettingTopic.IS_PERSISTED:
                    return this.isPersistedValue();
                case SettingTopic.IS_INITIALIZED:
                    return this.isInitialized();
                case SettingTopic.ATTRIBUTES:
                    return this._attributes;
                default:
                    throw new Error(`Unknown topic: ${topic}`);
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    getValueRange(): TValueRange | null {
        if (this._externalController) {
            return this._externalController.getSetting().getValueRange();
        }
        return this._valueRange;
    }

    maybeResetPersistedValue(): boolean {
        if (this._isStatic) {
            if (this._currentValueFromPersistence !== null) {
                this.setInternalValueAndInvalidateCache(this._currentValueFromPersistence);
                this._currentValueFromPersistence = null;
                this.setValueValid(true);
            }
            return true;
        }
        if (this._currentValueFromPersistence === null || this._valueRange === null) {
            return false;
        }

        const customIsValueValidFunction = this._customSettingImplementation.isValueValid;

        const isPersistedValueValid = customIsValueValidFunction
            ? customIsValueValidFunction(this._currentValueFromPersistence, this._valueRange as any)
            : true;

        if (isPersistedValueValid) {
            this.setInternalValueAndInvalidateCache(this._currentValueFromPersistence);
            this._currentValueFromPersistence = null;
            this.setValueValid(true);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
            return true;
        }

        return false;
    }

    private applyValueRange(): boolean {
        let valueChanged = false;
        const valueFixedUp = !this.checkIfValueIsValid(this.getInternalValue()) && this.maybeFixupValue();
        const persistedValueReset = this.maybeResetPersistedValue();
        if (valueFixedUp || persistedValueReset) {
            valueChanged = true;
        }
        const prevIsValid = this._isValueValid;
        this.setValueValid(this.checkIfValueIsValid(this.getInternalValue()));
        this.setLoading(false);

        const shouldNotifyValueChanged =
            valueChanged || this._isValueValid !== prevIsValid || this._internalValue === null;
        return shouldNotifyValueChanged;
    }

    setValueRange(valueRange: TValueRange | null): void {
        if (this._externalController) {
            this.setValueRangeAndInvalidateCache(valueRange);
            this.maybeResetPersistedValue();
            this._loading = false;
            this.initialize();
            this._externalController.setAvailableValues(this.getId(), valueRange);
            return;
        }

        if (isEqual(this._valueRange, valueRange) && this._initialized) {
            this.setLoading(false);
            return;
        }

        this.setValueRangeAndInvalidateCache(valueRange);

        const shouldNotifyValueChanged = this.applyValueRange();
        this.initialize();
        if (shouldNotifyValueChanged) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        }
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_RANGE);
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

        if (this._valueRange === null) {
            return false;
        }

        const customFixupFunction = this._customSettingImplementation.fixupValue;

        const candidate = customFixupFunction
            ? customFixupFunction(this._internalValue, this._valueRange as any)
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
        if (this._valueRange === null) {
            return false;
        }

        const customIsValueValidFunction = this._customSettingImplementation.isValueValid;

        if (!customIsValueValidFunction) {
            return true;
        }

        return customIsValueValidFunction(value, this._valueRange as any);
    }

    /**
     * Sets the internal value and invalidates the external value cache.
     * Use this instead of directly assigning to this._internalValue.
     */
    private setInternalValueAndInvalidateCache(value: TInternalValue): void {
        this._internalValue = value;
        this._cachedExternalValue = NO_CACHE;
    }

    /**
     * Sets the value range and invalidates the external value cache.
     * Use this instead of directly assigning to this._valueRange.
     */
    private setValueRangeAndInvalidateCache(valueRange: TValueRange | null): void {
        this._valueRange = valueRange;
        this._cachedExternalValue = NO_CACHE;
    }
}

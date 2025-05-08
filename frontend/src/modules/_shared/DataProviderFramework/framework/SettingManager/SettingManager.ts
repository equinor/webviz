import { isEqual } from "lodash";
import { v4 } from "uuid";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { PublishSubscribe } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import type { CustomSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingAttributes } from "../../interfacesAndTypes/customSettingsHandler";
import type { AvailableValuesType, MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { Setting, SettingCategories, SettingCategory, SettingTypes } from "../../settings/settingsDefinitions";
import { settingCategoryFixupMap, settingCategoryIsValueValidMap } from "../../settings/settingsDefinitions";
import type { ExternalSettingController } from "../ExternalSettingController/ExternalSettingController";
import { Group } from "../Group/Group";

export enum SettingTopic {
    VALUE = "VALUE",
    VALUE_ABOUT_TO_BE_CHANGED = "VALUE_ABOUT_TO_BE_CHANGED",
    IS_VALID = "IS_VALID",
    AVAILABLE_VALUES = "AVAILABLE_VALUES",
    IS_EXTERNALLY_CONTROLLED = "IS_EXTERNALLY_CONTROLLED",
    EXTERNAL_CONTROLLER_PROVIDER = "EXTERNAL_CONTROLLER_PROVIDER",
    IS_LOADING = "IS_LOADING",
    IS_INITIALIZED = "IS_INITIALIZED",
    IS_PERSISTED = "IS_PERSISTED",
    ATTRIBUTES = "ATTRIBUTES",
}

export type SettingTopicPayloads<TValue, TCategory extends SettingCategory> = {
    [SettingTopic.VALUE]: TValue;
    [SettingTopic.VALUE_ABOUT_TO_BE_CHANGED]: void;
    [SettingTopic.IS_VALID]: boolean;
    [SettingTopic.AVAILABLE_VALUES]: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory> | null;
    [SettingTopic.IS_EXTERNALLY_CONTROLLED]: boolean;
    [SettingTopic.EXTERNAL_CONTROLLER_PROVIDER]: OverriddenValueProviderType | undefined;
    [SettingTopic.IS_LOADING]: boolean;
    [SettingTopic.IS_INITIALIZED]: boolean;
    [SettingTopic.IS_PERSISTED]: boolean;
    [SettingTopic.ATTRIBUTES]: SettingAttributes;
};

export type SettingManagerParams<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting] | null,
    TCategory extends SettingCategories[TSetting],
> = {
    type: TSetting;
    category: TCategory;
    label: string;
    defaultValue: TValue;
    customSettingImplementation: CustomSettingImplementation<TValue, TCategory>;
};

export enum OverriddenValueProviderType {
    GROUP = "GROUP",
    SHARED_SETTING = "SHARED_SETTING",
}

/*
 * The SettingManager class is responsible for managing a setting.
 *
 * It provides a method for setting available values, which are used to validate the setting value or applying a fixup if the value is invalid.
 * It provides methods for setting and getting the value and its states, checking if the value is valid, and setting the value as overridden or persisted.
 */
export class SettingManager<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting] | null = SettingTypes[TSetting] | null,
    TCategory extends SettingCategories[TSetting] = SettingCategories[TSetting],
> implements PublishSubscribe<SettingTopicPayloads<TValue, TCategory>>
{
    private _id: string;
    private _type: TSetting;
    private _category: TCategory;
    private _label: string;
    private _customSettingImplementation: CustomSettingImplementation<TValue, TCategory>;
    private _value: TValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingTopicPayloads<TValue, TCategory>>();
    private _availableValues: AvailableValuesType<TSetting> | null = null;
    private _loading: boolean = false;
    private _initialized: boolean = false;
    private _currentValueFromPersistence: TValue | null = null;
    private _isStatic: boolean;
    private _attributes: SettingAttributes = {
        enabled: true,
        visible: true,
    };
    private _externalController: ExternalSettingController<TSetting, TValue, TCategory> | null = null;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();

    constructor({
        type,
        category,
        customSettingImplementation,
        defaultValue,
        label,
    }: SettingManagerParams<TSetting, TValue, TCategory>) {
        this._id = v4();
        this._type = type;
        this._category = category;
        this._label = label;
        this._customSettingImplementation = customSettingImplementation;
        this._value = defaultValue;
        this._isStatic = customSettingImplementation.getIsStatic?.() ?? false;
        if (this._isStatic) {
            this.setValueValid(this.checkIfValueIsValid(this._value));
        }
    }

    registerExternalSettingController(
        externalController: ExternalSettingController<TSetting, TValue, TCategory>,
    ): void {
        this._externalController = externalController;
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController.getSetting().getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE)(
                () => {
                    this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
                    this._value = externalController.getSetting().getValue();
                },
            ),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController.getSetting().getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.IS_VALID)(
                () => {
                    this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_VALID);
                },
            ),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_LOADING)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_LOADING);
            }),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.ATTRIBUTES)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.ATTRIBUTES);
            }),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED);
            }),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_INITIALIZED)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_INITIALIZED);
            }),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.IS_PERSISTED)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
            }),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "external-setting-controller",
            externalController
                .getSetting()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.AVAILABLE_VALUES)(() => {
                this._publishSubscribeDelegate.notifySubscribers(SettingTopic.AVAILABLE_VALUES);
            }),
        );
    }

    unregisterExternalSettingController(): void {
        this._externalController = null;
        this._unsubscribeHandler.unsubscribe("external-setting-controller");
        this.applyAvailableValues();
    }

    beforeDestroy(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }

    getId(): string {
        return this._id;
    }

    getType(): Setting {
        return this._type;
    }

    getCategory(): TCategory {
        return this._category;
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

    getValue(): TValue {
        if (this._externalController) {
            return this._externalController.getSetting().getValue();
        }

        if (this._currentValueFromPersistence !== null) {
            return this._currentValueFromPersistence;
        }

        return this._value;
    }

    isStatic(): boolean {
        return this._isStatic;
    }

    serializeValue(): string {
        if (this._customSettingImplementation.serializeValue) {
            return this._customSettingImplementation.serializeValue(this.getValue());
        }

        return JSON.stringify(this.getValue());
    }

    deserializeValue(serializedValue: string): void {
        if (this._customSettingImplementation.deserializeValue) {
            this._currentValueFromPersistence = this._customSettingImplementation.deserializeValue(serializedValue);
            return;
        }

        this._currentValueFromPersistence = JSON.parse(serializedValue);
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
    setValue(value: TValue): void {
        if (isEqual(this._value, value)) {
            return;
        }
        this._currentValueFromPersistence = null;

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED);

        this._value = value;

        this.setValueValid(this.checkIfValueIsValid(this._value));
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
        if (this._loading === loading) {
            return;
        }

        if (this._externalController) {
            this._externalController.getSetting().setLoading(loading);
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
    }

    isInitialized(): boolean {
        if (this._externalController) {
            return this._externalController.getSetting().isInitialized();
        }
        return this._initialized || this._isStatic;
    }

    isLoading(): boolean {
        if (this._externalController) {
            return this._externalController.getSetting().isLoading();
        }
        return this._loading;
    }

    valueToRepresentation(
        value: TValue,
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

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<TValue, TCategory>[T] {
        const externalController = this._externalController;
        if (externalController) {
            return (): any => {
                if (topic === SettingTopic.IS_EXTERNALLY_CONTROLLED) {
                    return true;
                }
                if (topic === SettingTopic.EXTERNAL_CONTROLLER_PROVIDER) {
                    return externalController.getParentItem() instanceof Group
                        ? OverriddenValueProviderType.GROUP
                        : OverriddenValueProviderType.SHARED_SETTING;
                }
                return externalController.getSetting().makeSnapshotGetter(topic)();
            };
        }

        const snapshotGetter = (): any => {
            switch (topic) {
                case SettingTopic.VALUE:
                    return this.getValue();
                case SettingTopic.VALUE_ABOUT_TO_BE_CHANGED:
                    return;
                case SettingTopic.IS_VALID:
                    return this._isValueValid;
                case SettingTopic.AVAILABLE_VALUES:
                    return this._availableValues;
                case SettingTopic.IS_EXTERNALLY_CONTROLLED:
                    return this._externalController !== null;
                case SettingTopic.EXTERNAL_CONTROLLER_PROVIDER:
                    return this._externalController?.getParentItem() instanceof Group
                        ? OverriddenValueProviderType.GROUP
                        : OverriddenValueProviderType.SHARED_SETTING;
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

    getAvailableValues(): AvailableValuesType<TSetting> | null {
        if (this._externalController) {
            return this._externalController.getSetting().getAvailableValues();
        }
        return this._availableValues as AvailableValuesType<TSetting> | null;
    }

    maybeResetPersistedValue(): boolean {
        if (this._isStatic) {
            if (this._currentValueFromPersistence !== null) {
                this._value = this._currentValueFromPersistence;
                this._currentValueFromPersistence = null;
                this.setValueValid(true);
            }
            return true;
        }
        if (this._currentValueFromPersistence === null || this._availableValues === null) {
            return false;
        }

        let isPersistedValueValid = false;

        const customIsValueValidFunction = this._customSettingImplementation.isValueValid;
        if (customIsValueValidFunction) {
            isPersistedValueValid = customIsValueValidFunction(
                this._currentValueFromPersistence,
                this._availableValues as any,
            );
        } else {
            isPersistedValueValid = settingCategoryIsValueValidMap[this._category](
                this._currentValueFromPersistence as any,
                this._availableValues as any,
            );
        }

        if (isPersistedValueValid) {
            this._value = this._currentValueFromPersistence;
            this._currentValueFromPersistence = null;
            this.setValueValid(true);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
            return true;
        }

        return false;
    }

    private applyAvailableValues() {
        let valueChanged = false;
        const valueFixedUp = !this.checkIfValueIsValid(this.getValue()) && this.maybeFixupValue();
        const persistedValueReset = this.maybeResetPersistedValue();
        if (valueFixedUp || persistedValueReset) {
            valueChanged = true;
        }
        const prevIsValid = this._isValueValid;
        this.setValueValid(this.checkIfValueIsValid(this.getValue()));
        this.initialize();
        this.setLoading(false);
        if (valueChanged || this._isValueValid !== prevIsValid || this._value === null) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        }
    }

    setAvailableValues(availableValues: AvailableValuesType<TSetting> | null): void {
        if (this._externalController) {
            this.initialize();
            this._externalController.setAvailableValues(this.getId(), availableValues);
            this._availableValues = availableValues;
            return;
        }

        if (isEqual(this._availableValues, availableValues) && this._initialized) {
            this.setLoading(false);
            return;
        }

        this._availableValues = availableValues;

        this.applyAvailableValues();
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.AVAILABLE_VALUES);
    }

    makeComponent() {
        return this._customSettingImplementation.makeComponent();
    }

    private maybeFixupValue(): boolean {
        if (this.checkIfValueIsValid(this._value)) {
            return false;
        }

        if (this.isPersistedValue()) {
            return false;
        }

        if (this._availableValues === null) {
            return false;
        }

        let candidate: TValue;
        if (this._customSettingImplementation.fixupValue) {
            candidate = this._customSettingImplementation.fixupValue(this._value, this._availableValues as any);
        } else {
            candidate = settingCategoryFixupMap[this._category](
                this._value as any,
                this._availableValues as any,
            ) as TValue;
        }

        if (isEqual(candidate, this._value)) {
            return false;
        }
        this._value = candidate;
        return true;
    }

    private checkIfValueIsValid(value: TValue): boolean {
        if (this._isStatic) {
            return true;
        }
        if (this._availableValues === null) {
            return false;
        }
        if (this._customSettingImplementation.isValueValid) {
            return this._customSettingImplementation.isValueValid(value, this._availableValues as any);
        } else {
            return settingCategoryIsValueValidMap[this._category](value as any, this._availableValues as any);
        }
    }
}

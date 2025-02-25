import React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Select, SelectOption } from "@lib/components/Select";
import { Deselect, SelectAll } from "@mui/icons-material";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType<T> = T[] | null;

/**
 * ! Currently unsure if this one is keepable. Might be too complicated compared to what's offered
 */
export class ObjectSelectionSetting<T> implements Setting<ValueType<T>> {
    private _delegate: SettingDelegate<ValueType<T>>;
    private _label: string;
    private _settingType: SettingType;
    private _optValKey: keyof T;
    private _optLabelKey: keyof T;
    private _multiple: boolean;

    constructor(
        label: string,
        settingType: SettingType,
        optValKey: keyof T,
        optLabelKey: keyof T,
        multiple: boolean = false
    ) {
        this._delegate = new SettingDelegate<ValueType<T>>(null, this);
        this._settingType = settingType;
        this._optValKey = optValKey;
        this._optLabelKey = optLabelKey;
        this._multiple = multiple;
        this._label = label;
    }

    getConstructorParams() {
        return [this._settingType, this._label, this._optValKey, this._optLabelKey, this._multiple];
    }

    getType(): SettingType {
        return this._settingType;
    }

    getLabel(): string {
        return this._label;
    }

    getDelegate(): SettingDelegate<ValueType<T>> {
        return this._delegate;
    }

    transformValueToOption(object: T): SelectOption {
        return {
            value: this.getOptionValue(object),
            label: this.getOptionLabel(object),
        };
    }

    getOptionValue(object: T): string {
        const value = object[this._optValKey];

        if (typeof value !== "string") throw new Error(`Expected object value to be a string, but got ${typeof value}`);

        return value;
    }

    getOptionLabel(object: T): string {
        const value = object[this._optLabelKey];

        if (typeof value !== "string") throw new Error(`Expected object value to be a string, but got ${typeof value}`);

        return value;
    }

    fixupValue(availableValues: AvailableValuesType<ValueType<T>>, currentValue: ValueType<T>): ValueType<T> {
        if (!currentValue) {
            return availableValues;
        }

        const matchingValues = currentValue.filter((value) =>
            availableValues.some((availableValue) => this.getOptionValue(availableValue) === this.getOptionValue(value))
        );
        if (matchingValues.length === 0) {
            return availableValues;
        }
        return matchingValues;
    }

    makeComponent(): (props: SettingComponentProps<ValueType<T>>) => React.ReactNode {
        // ! Bind class methods to ensure stable refs
        const transformObjectToOption = this.transformValueToOption.bind(this);
        const getObjectValue = this.getOptionValue.bind(this);

        return function DrilledWellbores(props: SettingComponentProps<ValueType<T>>) {
            const options: SelectOption[] = React.useMemo(
                () => props.availableValues.map(transformObjectToOption),
                [props.availableValues]
            );

            function handleChange(selectedIdents: string[]) {
                const selectedObjects = props.availableValues.filter((obj) =>
                    selectedIdents.includes(getObjectValue(obj))
                );
                props.onValueChange(selectedObjects);
            }

            function selectAll() {
                const allIdents = props.availableValues.map((obj) => getObjectValue(obj));
                handleChange(allIdents);
            }

            function selectNone() {
                handleChange([]);
            }

            const selectedValues = React.useMemo(
                () => props.value?.map((obj) => getObjectValue(obj)) ?? [],
                [props.value]
            );

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-2">
                        <DenseIconButton onClick={selectAll} title="Select all">
                            <SelectAll fontSize="inherit" />
                            Select all
                        </DenseIconButton>
                        <DenseIconButton onClick={selectNone} title="Clear selection">
                            <Deselect fontSize="inherit" />
                            Clear selection
                        </DenseIconButton>
                    </div>
                    <Select
                        filter
                        options={options}
                        value={selectedValues}
                        onChange={handleChange}
                        disabled={props.isOverridden}
                        multiple={true}
                        size={5}
                    />
                </div>
            );
        };
    }
}

// ! Cast needed since typescript cant handle the "key of T" constructor params
SettingRegistry.registerSetting(ObjectSelectionSetting as { new (...params: any[]): Setting<any> });

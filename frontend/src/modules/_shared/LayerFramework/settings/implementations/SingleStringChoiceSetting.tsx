import React from "react";

import { Dropdown } from "@lib/components/Dropdown";
import { SelectOption } from "@lib/components/Select";

import _ from "lodash";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = string | null;

export class SingleStringChoiceSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;
    private _label: string;
    private _settingType: SettingType;

    constructor(label: string, settingType: SettingType) {
        this._label = label;
        this._settingType = settingType;
        this._delegate = new SettingDelegate<ValueType>(null, this);
    }

    getLabel(): string {
        return this._label;
    }

    getType(): SettingType {
        return this._settingType;
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function StringSelectComp(props: SettingComponentProps<ValueType>) {
            const options: SelectOption[] = React.useMemo(() => {
                return props.availableValues.map((stringVals) => ({
                    value: stringVals,
                    label: _.upperFirst(stringVals),
                }));
            }, [props.availableValues]);

            function handleChange(selected: string) {
                props.onValueChange(selected);
            }

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Dropdown
                        filter
                        options={options}
                        value={props.value ?? undefined}
                        onChange={handleChange}
                        disabled={props.isOverridden}
                    />
                </div>
            );
        };
    }

    getConstructorParams?: (() => any[]) | undefined;

    // fixupValue?: ((availableValues: any[], currentValue: ValueType) => ValueType) | undefined;
    // isValueValid?: ((availableValues: any[], value: ValueType) => boolean) | undefined;
    // serializeValue?: ((value: ValueType) => string) | undefined;
    // deserializeValue?: ((serializedValue: string) => ValueType) | undefined;
    // valueToString?: ((args: ValueToStringArgs<ValueType>) => string) | undefined;
    // getConstructorParams?: (() => any[]) | undefined;
}

SettingRegistry.registerSetting(SingleStringChoiceSetting);

import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { CustomSettingImplementation, SettingComponentProps } from "../../interfaces";
import { SettingCategory } from "../settingsTypes";

type ValueType = SurfaceStatisticFunction_api;

export class StatisticFunctionSetting implements CustomSettingImplementation<ValueType, SettingCategory.OPTION> {
    isValueValid(): boolean {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.OPTION>) => React.ReactNode {
        const itemArr: DropdownOption[] = [
            { value: SurfaceStatisticFunction_api.MEAN, label: "Mean" },
            { value: SurfaceStatisticFunction_api.STD, label: "Std" },
            { value: SurfaceStatisticFunction_api.MIN, label: "Min" },
            { value: SurfaceStatisticFunction_api.MAX, label: "Max" },
            { value: SurfaceStatisticFunction_api.P10, label: "P10" },
            { value: SurfaceStatisticFunction_api.P90, label: "P90" },
            { value: SurfaceStatisticFunction_api.P50, label: "P50" },
        ];

        return function StatisticFunction(props: SettingComponentProps<ValueType, SettingCategory.OPTION>) {
            return (
                <Dropdown
                    options={itemArr}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={(newVal: string) => props.onValueChange(newVal as ValueType)}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}

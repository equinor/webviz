import type React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    SettingComponentProps,
    StaticSettingImplementation,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = SurfaceStatisticFunction_api;

export class StatisticFunctionSetting implements StaticSettingImplementation<ValueType, ValueType> {
    getIsStatic(): boolean {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        const itemArr: DropdownOption[] = [
            { value: SurfaceStatisticFunction_api.MEAN, label: "Mean" },
            { value: SurfaceStatisticFunction_api.STD, label: "Std" },
            { value: SurfaceStatisticFunction_api.MIN, label: "Min" },
            { value: SurfaceStatisticFunction_api.MAX, label: "Max" },
            { value: SurfaceStatisticFunction_api.P10, label: "P10" },
            { value: SurfaceStatisticFunction_api.P90, label: "P90" },
            { value: SurfaceStatisticFunction_api.P50, label: "P50" },
        ];

        return function StatisticFunction(props: SettingComponentProps<ValueType>) {
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

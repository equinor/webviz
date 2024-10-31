import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

export class StatisticFunction implements Setting<SurfaceStatisticFunction_api> {
    private _delegate: SettingDelegate<SurfaceStatisticFunction_api>;

    constructor() {
        this._delegate = new SettingDelegate<SurfaceStatisticFunction_api>(SurfaceStatisticFunction_api.MEAN, this);
    }

    getType(): SettingType {
        return SettingType.STATISTIC_FUNCTION;
    }

    getLabel(): string {
        return "Statistic function";
    }

    getDelegate(): SettingDelegate<SurfaceStatisticFunction_api> {
        return this._delegate;
    }

    isValueValid(): boolean {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<SurfaceStatisticFunction_api>) => React.ReactNode {
        const itemArr: DropdownOption[] = [
            { value: SurfaceStatisticFunction_api.MEAN, label: "Mean" },
            { value: SurfaceStatisticFunction_api.STD, label: "Std" },
            { value: SurfaceStatisticFunction_api.MIN, label: "Min" },
            { value: SurfaceStatisticFunction_api.MAX, label: "Max" },
            { value: SurfaceStatisticFunction_api.P10, label: "P10" },
            { value: SurfaceStatisticFunction_api.P90, label: "P90" },
            { value: SurfaceStatisticFunction_api.P50, label: "P50" },
        ];

        return function StatisticFunction(props: SettingComponentProps<SurfaceStatisticFunction_api>) {
            return (
                <Dropdown
                    options={itemArr}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={(newVal: string) => props.onValueChange(newVal as SurfaceStatisticFunction_api)}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}

import type React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { ComboboxCompositions } from "@lib/newComponents/Combobox/compositions";
import type { ComboboxItem } from "@lib/newComponents/Combobox/types";

import type {
    SettingComponentProps,
    StaticSettingImplementation,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = SurfaceStatisticFunction_api;

export class StatisticFunctionSetting implements StaticSettingImplementation<ValueType, ValueType> {
    getIsStatic(): boolean {
        return true;
    }

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        if (typeof parsed !== "string") {
            throw new Error("Expected string");
        }
        return parsed as ValueType;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        const itemArr: ComboboxItem<string>[] = [
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
                <ComboboxCompositions.WithBrowseButtons
                    items={itemArr}
                    value={props.value?.toString()}
                    onValueChange={(newVal: string) => props.onValueChange(newVal as ValueType)}
                    disabled={props.disabled}
                />
            );
        };
    }
}

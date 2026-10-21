import type React from "react";

import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringOrNull } from "../utils/structureValidation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";

export enum TimeType {
    NO_TIME = "noTime",
    TIME_POINT = "timePoint",
    INTERVAL = "interval",
    COMPUTED_INTERVAL = "computedInterval",
}

export const TIME_TYPE_TO_LABEL: Record<TimeType, string> = {
    [TimeType.NO_TIME]: "Static",
    [TimeType.TIME_POINT]: "Time step",
    [TimeType.INTERVAL]: "Interval",
    [TimeType.COMPUTED_INTERVAL]: "Computed interval",
};

type ValueType = TimeType | null;
type ValueConstraintsType = TimeType[];

export class TimeTypeSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    defaultValue: ValueType = null;

    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        assertStringOrNull(parsed);

        if (parsed !== null && !Object.values(TimeType).includes(parsed as TimeType)) {
            throw new Error(`Expected a valid time type, got ${parsed}`);
        }

        return parsed as ValueType;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<TimeType, TimeType>(value, valueConstraints, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<TimeType, TimeType>(currentValue, valueConstraints, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function TimeTypeSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const options: ComboboxItem<ValueType>[] = (props.valueConstraints ?? []).map((value) => ({
                value,
                label: TIME_TYPE_TO_LABEL[value],
            }));

            return (
                <Combobox
                    items={options}
                    value={props.value}
                    onValueChange={props.onValueChange}
                    disabled={props.disabled}
                />
            );
        };
    }

    overriddenValueRepresentation(args: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (args.value === null) {
            return "-";
        }
        return TIME_TYPE_TO_LABEL[args.value];
    }
}

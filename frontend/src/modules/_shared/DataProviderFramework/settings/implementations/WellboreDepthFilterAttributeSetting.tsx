import { DropdownStringSetting } from "./DropdownStringSetting";

type ValueType = string | null;
type ValueConstraintsType = string[];

export class WellboreDepthFilterAttributeSetting extends DropdownStringSetting {
    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        if (valueConstraints.length === 0) {
            return value === null;
        }

        return super.isValueValid(value, valueConstraints);
    }

    fixupValue(value: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        if (valueConstraints.length === 0) {
            return null;
        }

        return super.fixupValue(value, valueConstraints);
    }
}

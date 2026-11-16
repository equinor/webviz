import type { SurfaceAttribute } from "@modules/_shared/Surface";

import { SurfaceAttributeSetting } from "./SurfaceAttributeSetting";

type ValueType = SurfaceAttribute | null;
type ValueConstraintsType = SurfaceAttribute[];

export class WellboreDepthFilterAttributeSetting extends SurfaceAttributeSetting {
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

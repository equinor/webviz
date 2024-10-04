import React from "react";

import _ from "lodash";

/**
 * Deeply compares a variable with it's previous state, and returns a stable refference if the object is equivalent.
 * Useful for ensuring stable refferences when effects or memos depends on objects/arrays from props.
 * @param value Any variable, though this helper is only relevant for objects and arrays.
 * @returns A stable referrence to the object, and a boolean flag showing if the ref actually changed
 */
export function useStableProp<T>(value: T): [prop: T, propDidChange: boolean] {
    const [prevInternalValue, setPrevInternalValue] = React.useState<T>(value);

    if (_.isEqual(value, prevInternalValue)) {
        return [prevInternalValue, false];
    }

    setPrevInternalValue(value);
    return [value, true];
}

import React from "react";

import { isEqual } from "lodash-es";

import { useOptInControlledValue } from "@lib/hooks/useOptInControlledValue";

import { isDualSliderValue } from "./_utils";
import type { SliderChangeEventDetails } from "./types";

export function useLockState(props: {
    isDualSlider: boolean;
    showMinLock: boolean;
    showMaxLock: boolean;
    minLocked?: boolean;
    maxLocked?: boolean;
    defaultMinLocked?: boolean;
    defaultMaxLocked?: boolean;
    onMinLockedChange?: (locked: boolean) => void;
    onMaxLockedChange?: (locked: boolean) => void;
}) {
    const [internalMinLocked, internalSetMinLocked] = useOptInControlledValue(
        props.defaultMinLocked ?? false,
        props.minLocked,
        props.onMinLockedChange,
    );
    const [internalMaxLocked, internalSetMaxLocked] = useOptInControlledValue(
        props.defaultMaxLocked ?? false,
        props.maxLocked,
        props.onMaxLockedChange,
    );

    const setMinLocked = React.useCallback(
        function setMinLockedFunc(locked: boolean) {
            if (!props.showMinLock && locked) return;

            internalSetMinLocked(locked);
            if (locked && !props.isDualSlider) {
                internalSetMaxLocked(false);
            }
        },
        [internalSetMaxLocked, internalSetMinLocked, props.isDualSlider, props.showMinLock],
    );

    const setMaxLocked = React.useCallback(
        function setMaxLockedFunc(locked: boolean) {
            if (!props.showMaxLock && locked) return;

            internalSetMaxLocked(locked);
            if (locked && !props.isDualSlider) {
                internalSetMinLocked(false);
            }
        },
        [internalSetMaxLocked, internalSetMinLocked, props.isDualSlider, props.showMaxLock],
    );

    return {
        minLocked: internalMinLocked,
        maxLocked: internalMaxLocked,
        setMinLocked,
        setMaxLocked,
    };
}

export function useLockedValueUpdate(props: {
    value: number | number[];
    min: number;
    max: number;
    minLocked: boolean;
    maxLocked: boolean;
    onValueChange?: (value: number | number[], eventDetails: SliderChangeEventDetails, commit: boolean) => void;
}) {
    const prevMinLocked = React.useRef(false);
    const prevMaxLocked = React.useRef(false);

    const { onValueChange } = props;

    React.useEffect(
        function clampToToggledLocksEffec() {
            const value = props.value as number | number[];
            const isDualValue = isDualSliderValue(value);
            let newValue: number | number[] | null = null;

            // Min lock was just enabled
            if (props.minLocked && !prevMinLocked.current) {
                if (isDualValue) {
                    newValue = [props.min, value[1]];
                } else {
                    newValue = props.min;
                }
            }

            // Max lock was just enabled
            if (props.maxLocked && !prevMaxLocked.current) {
                if (isDualValue && newValue !== null) {
                    newValue = [(newValue as number[])[0], props.max];
                } else if (isDualValue) {
                    newValue = [value[0], props.max];
                } else {
                    newValue = props.max;
                }
            }

            prevMinLocked.current = props.minLocked;
            prevMaxLocked.current = props.maxLocked;

            if (newValue !== null) {
                onValueChange?.(newValue, { reason: "range-locked" }, true);
            }
        },
        [props.minLocked, props.maxLocked, props.min, props.max, props.value, onValueChange],
    );
}

export function useUnlockOnValueChange(props: {
    value: number | readonly number[];
    min: number;
    max: number;
    minLocked: boolean;
    maxLocked: boolean;

    setMinLocked: (locked: boolean) => void;
    setMaxLocked: (locked: boolean) => void;
}) {
    const { setMinLocked, setMaxLocked } = props;
    const prevValue = React.useRef(props.value);

    React.useEffect(
        function unlockSliderLocksEffect() {
            // Only check if value actually changed
            if (isEqual(prevValue.current, props.value)) return;

            const lowerValue = isDualSliderValue(props.value) ? props.value[0] : props.value;
            const upperValue = isDualSliderValue(props.value) ? props.value[1] : props.value;

            if (props.minLocked && lowerValue > props.min) {
                setMinLocked(false);
            }

            if (props.maxLocked && upperValue < props.max) {
                setMaxLocked(false);
            }

            prevValue.current = props.value;
        },
        [props.max, props.maxLocked, props.min, props.minLocked, props.value, setMaxLocked, setMinLocked],
    );
}

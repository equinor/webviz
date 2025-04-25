import React from "react";

import _ from "lodash";

export type ValueField<TValue> = {
    value?: TValue;
    onValueChange?: (newValue: TValue) => void;
    onBlur?: () => void;
};

export type DebouncedFieldProps<TValue> = {
    value: TValue;
    flushOnBlur?: boolean;
    onValueChange: (newValue: TValue) => void;
    onImmediateValueChange?: (newValue: TValue) => void;
    debounceTimeMs: number;
    children: React.ReactElement<ValueField<TValue>>;
};

export function DebouncedField<TValue>(props: DebouncedFieldProps<TValue>): React.ReactNode {
    const { onValueChange, onImmediateValueChange } = props;

    //
    const [internalValue, setInternalValue] = React.useState<TValue>(props.value);
    const [prevExternalValue, setPrevExternalValue] = React.useState<TValue>(props.value);

    // External updates should propagate downwards immediately
    if (prevExternalValue !== props.value) {
        setPrevExternalValue(props.value);
        setInternalValue(props.value);
    }

    // Implements lodash's debounce method
    const debouncedCallback = React.useMemo(() => {
        return _.debounce((v: TValue) => onValueChange?.(v), props.debounceTimeMs);
    }, [onValueChange, props.debounceTimeMs]);

    // Whenever the debounce changes, we need to cancel any potentially going debounces
    React.useEffect(() => {
        const refCallback = debouncedCallback;
        return () => {
            refCallback.cancel();
        };
    }, [debouncedCallback]);

    const onInternalValueChange = React.useCallback(
        (value: TValue) => {
            setInternalValue(value);

            onImmediateValueChange?.(value);
            debouncedCallback(value);
        },
        [debouncedCallback, onImmediateValueChange],
    );

    // Immediately apply the interal value if the user moves away from the input field
    const onFieldBlur = React.useCallback(() => {
        if (props.flushOnBlur) debouncedCallback.flush();
        props.children.props.onBlur?.();
    }, [debouncedCallback, props.children.props, props.flushOnBlur]);

    return (
        <div>
            {React.cloneElement(props.children, {
                // Inject the standard input fields the the child components
                value: internalValue,
                onValueChange: onInternalValueChange,
                onBlur: onFieldBlur,
            })}
        </div>
    );
}

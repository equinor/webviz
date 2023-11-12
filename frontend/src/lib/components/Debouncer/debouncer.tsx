import React from "react";

export type DebouncerProps = {
    children: React.ReactElement;
    delayMs: number;
};

export const Debouncer: React.FC<DebouncerProps> = (props) => {
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const onChange = props.children.props.onChange;

    if (!onChange) {
        throw new Error("Debouncer must wrap a component with an 'onChange' prop");
    }

    React.useEffect(() => {
        () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const debounceChange = React.useCallback(
        (...args: Parameters<typeof onChange>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                onChange(...args);
            }, props.delayMs);
        },
        [onChange, props.delayMs]
    );

    return React.cloneElement(props.children, {
        onChange: debounceChange,
    });
};

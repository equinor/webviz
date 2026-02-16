import React from "react";

import type { InputProps as InputUnstyledProps } from "@mui/base";
import { Input as InputUnstyled } from "@mui/base";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { BaseComponent } from "../BaseComponent";

export type InputProps = InputUnstyledProps & {
    wrapperStyle?: React.CSSProperties;
    wrapperClassName?: string;
    min?: number;
    max?: number;
    step?: number;
    rounded?: "all" | "left" | "right" | "none";
    debounceTimeMs?: number;
    onValueChange?: (value: string) => void;
    uirevision?: number;
};

function InputComponent(props: InputProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const {
        startAdornment,
        endAdornment,
        wrapperClassName,
        wrapperStyle,
        value: propsValue,
        onValueChange,
        debounceTimeMs,
        inputRef,
        ...other
    } = props;

    const [value, setValue] = React.useState<unknown>(propsValue);
    const [prevValue, setPrevValue] = React.useState<unknown>(propsValue);
    const [uirevision, setUirevision] = React.useState<number | undefined>(props.uirevision);

    // Track if user is actively typing (vs using spinner/wheel)
    const isTypingRef = React.useRef<boolean>(false);

    if (propsValue !== prevValue || props.uirevision !== uirevision) {
        setValue(propsValue);
        setPrevValue(propsValue);
        setUirevision(props.uirevision);
    }

    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle<
        HTMLInputElement | HTMLTextAreaElement | null,
        HTMLInputElement | HTMLTextAreaElement | null
    >(inputRef, () => internalRef.current);

    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(function handleMount() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleAdornmentClick = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (internalRef.current) {
            internalRef.current.focus();
        }
        event.stopPropagation();
    }, []);

    const clampNumberValue = React.useCallback(
        function clampNumberValue(val: unknown): number {
            let newValue = 0;
            if (!isNaN(parseFloat(val as string))) {
                newValue = parseFloat((val as string) || "0");
                if (props.min !== undefined) {
                    newValue = Math.max(props.min, newValue);
                }
                if (props.max !== undefined) {
                    newValue = Math.min(props.max, newValue);
                }
            }
            return newValue;
        },
        [props.min, props.max],
    );

    const commitValue = React.useCallback(
        function commitValue(val: unknown) {
            if (!onValueChange) {
                return;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            if (!debounceTimeMs) {
                onValueChange(`${val}`);
                return;
            }

            debounceTimerRef.current = setTimeout(() => {
                onValueChange(`${val}`);
            }, debounceTimeMs);
        },
        [debounceTimeMs, onValueChange],
    );

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        // For number inputs: Arrow up/down should trigger immediate update like spinner buttons
        if (props.type === "number" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            isTypingRef.current = false;
        } else {
            isTypingRef.current = true;
        }
    }

    const handleInputEditingDone = React.useCallback(
        function handleInputEditingDone() {
            let adjustedValue: unknown = value;
            if (props.type === "number") {
                const newValue = clampNumberValue(value);
                adjustedValue = newValue.toString();
                setValue(adjustedValue);
            }

            commitValue(adjustedValue);
        },
        [value, props.type, clampNumberValue, commitValue],
    );

    const handleKeyUp = React.useCallback(
        function handleKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
            if (event.key === "Enter") {
                isTypingRef.current = false;
                handleInputEditingDone();
            }
        },
        [handleInputEditingDone],
    );

    const handleInputBlur = React.useCallback(
        function handleInputBlur(evt: React.FocusEvent<HTMLInputElement>) {
            isTypingRef.current = false;
            handleInputEditingDone();
            props.onBlur?.(evt);
        },
        [handleInputEditingDone, props],
    );

    const handleInputChange = React.useCallback(
        function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
            const newRawValue = event.target.value;

            if (props.type === "number" && !isTypingRef.current) {
                // Spinner button or wheel: apply min/max immediately and commit
                const clampedValue = clampNumberValue(newRawValue);
                setValue(clampedValue.toString());
                commitValue(clampedValue.toString());
            } else {
                // Typing: just update local state, don't clamp or commit yet
                setValue(newRawValue);
            }

            if (props.onChange) {
                props.onChange(event);
            }
        },
        [props, clampNumberValue, commitValue],
    );

    return (
        <BaseComponent
            disabled={props.disabled}
            ref={ref}
            className={resolveClassNames(
                wrapperClassName,
                "flex",
                "justify-center",
                "gap-2",
                "bg-white",
                "shadow-xs",
                "focus-within:border-indigo-500",
                "w-full",
                "h-full",
                "sm:text-sm",
                "px-2",
                "py-1.5",
                "outline-hidden",
                "cursor-text",
                "border border-gray-300",
                {
                    "outline-hidden": !props.error,
                    "outline-2 outline-red-300": props.error,
                    "rounded-l": props.rounded === "left",
                    "rounded-r": props.rounded === "right",
                    rounded: props.rounded === "all" || !props.rounded,
                },
            )}
            style={wrapperStyle}
        >
            {startAdornment && (
                <div className="flex items-center h-full" onClick={handleAdornmentClick}>
                    {startAdornment}
                </div>
            )}
            <InputUnstyled
                {...other}
                value={value}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                slotProps={{
                    root: {
                        className: "grow",
                    },
                    input: {
                        step: props.step,
                        className: resolveClassNames("h-full block w-full sm:text-sm outline-none truncate"),
                        ref: internalRef,
                    },
                }}
            />
            {endAdornment && (
                <div className="flex items-center h-full" onClick={handleAdornmentClick}>
                    {endAdornment}
                </div>
            )}
        </BaseComponent>
    );
}

export const Input = React.forwardRef(InputComponent);

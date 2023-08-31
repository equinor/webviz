import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Input as InputUnstyled, InputProps as InputUnstyledProps } from "@mui/base";

import { BaseComponent } from "../BaseComponent";

export type InputProps = InputUnstyledProps & {
    wrapperStyle?: React.CSSProperties;
    min?: number;
    max?: number;
};

export const Input = React.forwardRef((props: InputProps, ref: React.ForwardedRef<HTMLInputElement>) => {
    const { startAdornment, endAdornment, wrapperStyle, value: propsValue, onChange, ...other } = props;

    const [value, setValue] = React.useState<unknown>(propsValue);
    const [prevValue, setPrevValue] = React.useState<unknown>(propsValue);

    if (propsValue !== prevValue) {
        setValue(propsValue);
        setPrevValue(propsValue);
    }

    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle<
        HTMLInputElement | HTMLTextAreaElement | null,
        HTMLInputElement | HTMLTextAreaElement | null
    >(props.inputRef, () => internalRef.current);

    const handleAdornmentClick = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (internalRef.current) {
            internalRef.current.focus();
            internalRef.current.getElementsByTagName("input")[0].focus();
        }
        event.stopPropagation();
    }, []);

    const handleInputChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (props.type === "number") {
                let newValue = parseFloat(event.target.value || "0");
                if (props.min !== undefined) {
                    newValue = Math.max(props.min, newValue);
                }

                if (props.max !== undefined) {
                    newValue = Math.min(props.max, newValue);
                }

                if (newValue !== prevValue) {
                    setValue(newValue);
                    setPrevValue(newValue);
                }

                event.target.value = newValue.toString();
            }
            if (onChange) {
                onChange(event);
            }
        },
        [props.min, props.max, onChange, props.type, prevValue]
    );

    return (
        <BaseComponent disabled={props.disabled}>
            <div
                ref={ref}
                className={resolveClassNames(
                    "flex",
                    "gap-2",
                    "bg-white",
                    "border",
                    "border-gray-300",
                    "rounded",
                    "shadow-sm",
                    "focus:border-indigo-500",
                    "w-full",
                    "sm:text-sm",
                    "p-2",
                    "outline-none",
                    "cursor-text",
                    {
                        "border-red-300": props.error,
                        "border-2": props.error,
                    }
                )}
                style={wrapperStyle}
            >
                {startAdornment && (
                    <div className="flex items-center" onClick={handleAdornmentClick}>
                        {startAdornment}
                    </div>
                )}
                <InputUnstyled
                    {...other}
                    value={value}
                    onChange={handleInputChange}
                    ref={internalRef}
                    slotProps={{
                        root: {
                            className: "grow",
                        },
                        input: {
                            className:
                                "h-full focus:border-indigo-500 block w-full sm:text-sm border-gray-300 outline-none",
                        },
                    }}
                />
                {endAdornment && (
                    <div className="flex items-center" onClick={handleAdornmentClick}>
                        {endAdornment}
                    </div>
                )}
            </div>
        </BaseComponent>
    );
});

Input.displayName = "Input";

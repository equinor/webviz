import React from "react";

import * as Base from "@base-ui-components/react/field";

import { buildBaseUiClassName } from "../utils/buildBaseUiClassName";

export type InputProps = Base.Field.Control.Props & {
    inputClassName?: Base.Field.Control.Props["className"];
    wrapperProps?: Omit<Base.Field.Root.Props, "className">;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;

    // Exposing these as a QoL for developers
    validate?: Base.Field.Root.Props["validate"];
    invalid?: Base.Field.Root.Props["invalid"];
    validationMode?: Base.Field.Root.Props["validationMode"];
    validationDebounceTime?: Base.Field.Root.Props["validationDebounceTime"];
};

function InputComp(props: InputProps, ref: React.ForwardedRef<HTMLInputElement>): React.ReactNode {
    const {
        className,
        inputClassName,
        wrapperProps,
        startAdornment,
        endAdornment,
        validate,
        invalid,
        validationMode,
        validationDebounceTime,
        ...baseProps
    } = props;

    return (
        <Base.Field.Root
            disabled={props.disabled}
            className={(state) => buildBaseUiClassName(state, "--wv-input", className)}
            {...{ invalid, validate, validationMode, validationDebounceTime }}
            {...wrapperProps}
        >
            {startAdornment && <Base.Field.Label aria-hidden>{startAdornment}</Base.Field.Label>}
            <Base.Field.Control
                ref={ref}
                className={(state) => buildBaseUiClassName(state, "--control", inputClassName)}
                {...baseProps}
            />
            {endAdornment && <Base.Field.Label aria-hidden>{endAdornment}</Base.Field.Label>}
        </Base.Field.Root>
    );
}

export const Input = React.forwardRef(InputComp);

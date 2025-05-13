import React from "react";

import * as Base from "@base-ui-components/react/field";

import { buildBaseUiClassName } from "../utils/buildBaseUiClassName";

export type InputProps = Base.Field.Control.Props & {
    inputClassName?: Base.Field.Control.Props["className"];
    wrapperProps?: Omit<Base.Field.Root.Props, "className">;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;

    noAdornmentWrapper?: boolean;

    // Exposing these as a QoL for developers
    validate?: Base.Field.Root.Props["validate"];
    invalid?: Base.Field.Root.Props["invalid"];
    validationMode?: Base.Field.Root.Props["validationMode"];
    validationDebounceTime?: Base.Field.Root.Props["validationDebounceTime"];
};

function makeAdornment(adornment?: React.ReactNode, noAdornmentWrapper?: boolean): React.ReactNode {
    if (!adornment) return null;
    if (noAdornmentWrapper) return adornment;
    return <Base.Field.Label aria-hidden>{adornment}</Base.Field.Label>;
}

function InputComp(props: InputProps, ref: React.ForwardedRef<HTMLInputElement>): React.ReactNode {
    const {
        className,
        inputClassName,
        wrapperProps,
        startAdornment,
        endAdornment,
        noAdornmentWrapper,
        validate,
        invalid,
        validationMode,
        validationDebounceTime,
        ...baseProps
    } = props;

    return (
        <Base.Field.Root
            disabled={props.disabled}
            className={(state) => buildBaseUiClassName(state, "--wv-form-comp --wv-input", className)}
            {...{ invalid, validate, validationMode, validationDebounceTime }}
            {...wrapperProps}
        >
            {makeAdornment(startAdornment, noAdornmentWrapper)}
            <Base.Field.Control
                ref={ref}
                className={(state) => buildBaseUiClassName(state, "--control", inputClassName)}
                {...baseProps}
            />
            {makeAdornment(endAdornment, noAdornmentWrapper)}
        </Base.Field.Root>
    );
}

export const Input = React.forwardRef(InputComp);

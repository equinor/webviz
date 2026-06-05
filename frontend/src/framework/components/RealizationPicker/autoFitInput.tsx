import React from "react";

import type { InputProps as InputBaseProps } from "@base-ui/react";
import { Input as InputBase } from "@base-ui/react";
import { defaults } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type AutoFitInputProps = InputBaseProps & {
    value?: string | number;
    wrapperClassName?: string;
    className?: string;
    minCharacterWidth?: number;
};

const DEFAULT_PROPS = {
    minCharacterWidth: 1,
} satisfies AutoFitInputProps;

function AutoFitInputComponent(props: AutoFitInputProps, ref: React.ForwardedRef<HTMLInputElement>): React.ReactNode {
    const defaultedProps = defaults({}, props, DEFAULT_PROPS);

    let fitterValue = String(props.value);
    if (fitterValue.length < defaultedProps.minCharacterWidth) {
        fitterValue = "0".repeat(defaultedProps.minCharacterWidth);
    }

    return (
        <div className={resolveClassNames("relative flex", props.wrapperClassName)}>
            <span
                className={resolveClassNames(
                    "pointer-events-none invisible max-w-full grow select-none",
                    props.className,
                )}
            >
                {fitterValue}
            </span>
            <InputBase
                {...props}
                ref={ref}
                className={resolveClassNames("absolute inset-0 min-w-0 outline-none", props.className)}
                value={props.value}
            />
        </div>
    );
}

export const AutoFitInput = React.forwardRef<HTMLInputElement, AutoFitInputProps>(AutoFitInputComponent);

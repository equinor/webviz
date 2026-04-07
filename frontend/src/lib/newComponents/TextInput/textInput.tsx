import { Input, type InputProps as InputBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TextInputProps = Omit<InputBaseProps, "className">;

export function TextInput(props: TextInputProps) {
    return (
        <Input
            {...props}
            className={resolveClassNames(
                "bg-fill-canvas py-space-xs px-space-sm text-body-lg data-invalid:outline-stroke-danger data-invalid:bg-fill-danger-subtle",
                {
                    "form-element outline-stroke-neutral text-text-neutral outline -outline-offset-2": !props.disabled,
                    "text-text-disabled cursor-not-allowed outline-transparent": props.disabled,
                },
            )}
            disabled={props.disabled}
        />
    );
}

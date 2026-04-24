import { Switch as SwitchBase, SwitchRootProps } from "@base-ui/react";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import React from "react";

export type SwitchProps = Omit<SwitchRootProps, "className" | "style"> & {
    size?: "small" | "default";
};

const DEFAULT_PROPS = {
    size: "default",
} satisfies Partial<SwitchProps>;

const ROOT_SIZE_CLASSNAMES: Record<Required<SwitchProps>["size"], string> = {
    small: "h-selectable-sm",
    default: "h-selectable-md",
};

const TRACK_SIZE_CLASSNAMES: Record<Required<SwitchProps>["size"], string> = {
    small: "bg-neutral-strong group-data-checked:bg-accent-strong h-3 border-neutral-strong border-2 group-data-checked:border-accent-strong group-data-disabled:border-disabled",
    default: "bg-neutral group-data-checked:bg-accent h-1.5",
};

const THUMB_SIZE_CLASSNAMES: Record<Required<SwitchProps>["size"], string> = {
    small: "h-2 bg-surface data-checked:left-[calc(100%-0.5rem)]",
    default:
        "h-3 data-checked:left-[calc(100%-0.75rem)] bg-neutral-strong group-hover:bg-accent-strong-hover group-data-checked:bg-accent-strong group-data-disabled:bg-disabled",
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(props, ref) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    return (
        <SwitchBase.Root
            {...defaultedProps}
            ref={ref}
            className={resolveClassNames(
                "group p-selectable-y selectable relative box-border flex aspect-square appearance-none rounded-full border-0",
            )}
        >
            <span className={resolveClassNames("flex aspect-square", ROOT_SIZE_CLASSNAMES[defaultedProps.size])}>
                <span
                    className={resolveClassNames(
                        "group-data-checked:bg-accent group-data-disabled:bg-disabled group-data-disabled:hover:bg-disabled relative top-1/2 flex grow -translate-y-1/2 rounded-full",
                        TRACK_SIZE_CLASSNAMES[defaultedProps.size],
                    )}
                >
                    <SwitchBase.Thumb
                        className={resolveClassNames(
                            "time shadow-elevation-raised group-data-disabled:shadow-elevation-floating absolute top-1/2 left-0 aspect-square -translate-y-1/2 rounded-full transition-all duration-200 ease-linear",
                            THUMB_SIZE_CLASSNAMES[defaultedProps.size],
                        )}
                    />
                </span>
            </span>
        </SwitchBase.Root>
    );
});

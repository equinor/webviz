import { Collapsible } from "@base-ui/react";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ExpandMore } from "@mui/icons-material";
import React from "react";

export type GroupProps = {
    title: string;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
    tone?: "default" | "warning" | "danger" | "success" | "info";
    adornment?: React.ReactNode;
    children?: React.ReactNode;
};

const TONE_TO_CLASSNAMES: Record<NonNullable<GroupProps["tone"] | "disabled">, string> = {
    default: "bg-neutral hover:bg-neutral-hover border-neutral ",
    warning: "bg-warning hover:bg-warning-hover border-warning ",
    danger: "bg-danger hover:bg-danger-hover border-danger ",
    success: "bg-success hover:bg-success-hover border-success ",
    info: "bg-info hover:bg-info-hover border-info",
    disabled: "bg-disabled hover:bg-disabled border-disabled",
};

const DEFAULT_PROPS = {
    tone: "default",
    disabled: false,
} satisfies Partial<GroupProps>;

export function Group(props: GroupProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    return (
        <Collapsible.Root
            className="group flex flex-col"
            defaultOpen={defaultedProps.defaultOpen}
            open={defaultedProps.open}
            onOpenChange={defaultedProps.onOpenChange}
            disabled={defaultedProps.disabled}
        >
            <div
                className={resolveClassNames(
                    "group-data-collapsible-scroll-area:z-sticky gap-vertical-md shadow-elevation-raised flex items-center justify-between border-b group-data-collapsible-scroll-area:sticky group-data-collapsible-scroll-area:top-0",
                    TONE_TO_CLASSNAMES[defaultedProps.disabled ? "disabled" : defaultedProps.tone],
                    { "pointer-events-none cursor-not-allowed": defaultedProps.disabled },
                )}
            >
                <Collapsible.Trigger className="gap-vertical-xs px-selectable-x py-selectable-y flex grow cursor-pointer items-center">
                    <ExpandMore className="transition-transform group-data-closed:-rotate-90" fontSize="inherit" />
                    <Typography family="body" as="span" size="sm" weight="bolder">
                        {defaultedProps.title}
                    </Typography>
                </Collapsible.Trigger>
                <span className="px-selectable-x py-selectable-y">{defaultedProps.adornment}</span>
            </div>
            <Collapsible.Panel className="flex h-(--collapsible-panel-height) flex-col justify-end overflow-hidden transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 [[hidden]:not([hidden='until-found'])]:hidden">
                {defaultedProps.children}
            </Collapsible.Panel>
        </Collapsible.Root>
    );
}

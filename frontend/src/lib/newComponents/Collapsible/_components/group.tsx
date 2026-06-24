import type React from "react";

import { Collapsible } from "@base-ui/react";
import type { CollapsibleRootProps } from "@base-ui/react";
import { ExpandMore } from "@mui/icons-material";

import type { Tone } from "@lib/newComponents/_shared/types/tones";
import { withDefaults } from "@lib/newComponents/_shared/utils/defaultProps";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type GroupProps = ComponentWrapperProps<CollapsibleRootProps> & {
    /** The label shown in the collapsible header. */
    title: string;
    /** Controls the background color tone of the header. @default "neutral" */
    tone?: Tone;
    /** Optional element rendered at the trailing end of the header row. */
    adornment?: React.ReactNode;
};

const TONE_TO_CLASSNAMES: Record<NonNullable<GroupProps["tone"] | "disabled">, string> = {
    neutral: "bg-neutral hover:bg-neutral-hover border-neutral ",
    accent: "bg-accent hover:bg-accent-hover border-accent ",
    warning: "bg-warning hover:bg-warning-hover border-warning ",
    danger: "bg-danger hover:bg-danger-hover border-danger ",
    success: "bg-success hover:bg-success-hover border-success ",
    info: "bg-info hover:bg-info-hover border-info",
    disabled: "bg-disabled hover:bg-disabled border-disabled",
};

const DEFAULT_PROPS = {
    tone: "neutral",
    disabled: false,
} satisfies Partial<GroupProps>;

export function Group(props: GroupProps) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(defaultedProps, "title", "adornment", "tone", "children");

    return (
        <Collapsible.Root
            {...baseProps}
            className={resolveClassNames(baseProps.className, "group/scrollareaGroup flex flex-col")}
        >
            <div
                className={resolveClassNames(
                    "group-data-collapsible-scroll-area/scrollarea:z-sticky gap-y-md shadow-elevation-raised flex items-center justify-between border-b group-data-collapsible-scroll-area/scrollarea:sticky group-data-collapsible-scroll-area/scrollarea:top-0",
                    TONE_TO_CLASSNAMES[defaultedProps.disabled ? "disabled" : defaultedProps.tone],
                    { "pointer-events-none cursor-not-allowed": defaultedProps.disabled },
                )}
            >
                <Collapsible.Trigger className="focusable gap-x-3xs px-selectable py-selectable flex grow cursor-pointer items-center">
                    <ExpandMore className="transition-transform! group-data-closed/scrollareaGroup:-rotate-90" />
                    <Typography family="body" as="span" size="sm" weight="bolder">
                        {defaultedProps.title}
                    </Typography>
                </Collapsible.Trigger>
                {defaultedProps.adornment && <span className="px-selectable py-selectable">{defaultedProps.adornment}</span>}
            </div>
            <Collapsible.Panel className="flex h-(--collapsible-panel-height) flex-col justify-end overflow-hidden transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 [[hidden]:not([hidden='until-found'])]:hidden">
                {defaultedProps.children}
            </Collapsible.Panel>
        </Collapsible.Root>
    );
}

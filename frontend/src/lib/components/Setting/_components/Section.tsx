import type React from "react";

import { Collapsible } from "@base-ui/react";
import { ExpandMore } from "@mui/icons-material";

import type { Tone } from "@lib/components/_shared/types/tones";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SectionProps = {
    /** The label shown in the collapsible section header. */
    title: string;
    /** Controls the background color tone of the header. @default "neutral" */
    tone?: Tone;
    /** Optional element rendered at the trailing end of the header row. */
    adornment?: React.ReactNode;
    /** When true, the section starts in the open state. */
    defaultOpen?: boolean;
    /** When true, prevents the section from being opened or closed. */
    disabled?: boolean;
    /** The settings content rendered inside the collapsible panel. */
    children?: React.ReactNode;
};

const TONE_TO_CLASSNAMES: Record<NonNullable<SectionProps["tone"] | "disabled">, string> = {
    neutral: "bg-neutral hover:bg-neutral-hover border-neutral",
    accent: "bg-accent hover:bg-accent-hover border-accent",
    warning: "bg-warning hover:bg-warning-hover border-warning",
    danger: "bg-danger hover:bg-danger-hover border-danger",
    success: "bg-success hover:bg-success-hover border-success",
    info: "bg-info hover:bg-info-hover border-info",
    disabled: "bg-disabled hover:bg-disabled border-disabled",
};

export function Section(props: SectionProps) {
    const { tone = "neutral", disabled = false } = props;

    return (
        <Collapsible.Root
            defaultOpen={props.defaultOpen}
            disabled={disabled}
            className="group/settingsSection contents"
        >
            <div
                className={resolveClassNames(
                    "gap-y-md shadow-elevation-raised col-span-3 flex items-center justify-between border-b",
                    "group-data-collapsible-scroll-area/scrollarea:z-sticky group-data-collapsible-scroll-area/scrollarea:sticky group-data-collapsible-scroll-area/scrollarea:top-0",
                    TONE_TO_CLASSNAMES[disabled ? "disabled" : tone],
                    { "pointer-events-none cursor-not-allowed": disabled },
                )}
            >
                <Collapsible.Trigger className="focusable gap-x-3xs px-selectable py-selectable flex grow cursor-pointer items-center">
                    <ExpandMore className="transition-transform! group-data-closed/settingsSection:-rotate-90" />
                    <Typography family="body" as="span" size="sm" weight="bolder">
                        {props.title}
                    </Typography>
                </Collapsible.Trigger>
                {props.adornment && <span className="px-selectable py-selectable">{props.adornment}</span>}
            </div>
            <Collapsible.Panel
                keepMounted
                data-in-section
                className="setting-section-panel [&>.setting-row:nth-child(odd_of_.setting-row)]:bg-neutral/20 [&>.contents>.setting-row:nth-child(odd_of_.setting-row)]:bg-neutral/20 col-span-3 grid h-(--collapsible-panel-height) grid-cols-subgrid overflow-hidden transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 [&>[data-hidden]>.setting-row]:invisible [&>[data-hidden]>.setting-row]:h-0 [&>[data-hidden]>.setting-row]:min-h-0 [&>[data-hidden]>.setting-row]:overflow-hidden [&>[data-hidden]>.setting-row]:py-0"
            >
                {props.children}
            </Collapsible.Panel>
        </Collapsible.Root>
    );
}

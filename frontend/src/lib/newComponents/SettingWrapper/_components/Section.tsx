import React from "react";

import { Collapsible } from "@base-ui/react";
import { ExpandMore } from "@mui/icons-material";

import type { Tone } from "@lib/newComponents/_shared/types/tones";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SectionProps = {
    title: string;
    tone?: Tone;
    adornment?: React.ReactNode;
    defaultOpen?: boolean;
    disabled?: boolean;
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
            className="contents group/settingsSection"
        >
            <div
                className={resolveClassNames(
                    "col-span-3 gap-y-md shadow-elevation-raised flex items-center justify-between border-b",
                    "group-data-collapsible-scroll-area/scrollarea:sticky group-data-collapsible-scroll-area/scrollarea:top-0 group-data-collapsible-scroll-area/scrollarea:z-sticky",
                    TONE_TO_CLASSNAMES[disabled ? "disabled" : tone],
                    { "pointer-events-none cursor-not-allowed": disabled },
                )}
            >
                <Collapsible.Trigger className="focusable gap-y-xs px-selectable py-selectable flex grow cursor-pointer items-center">
                    <ExpandMore
                        className="transition-transform group-data-closed/settingsSection:-rotate-90"
                        fontSize="inherit"
                    />
                    <Typography family="body" as="span" size="sm" weight="bolder">
                        {props.title}
                    </Typography>
                </Collapsible.Trigger>
                {props.adornment && <span className="px-selectable py-selectable">{props.adornment}</span>}
            </div>
            <Collapsible.Panel
                keepMounted
                data-in-section
                className="setting-section-panel col-span-3 grid grid-cols-subgrid overflow-hidden h-(--collapsible-panel-height) transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 [&>.setting-row:nth-child(odd_of_.setting-row)]:bg-canvas [&>.contents>.setting-row:nth-child(odd_of_.setting-row)]:bg-canvas [&>[data-hidden]>.setting-row]:invisible [&>[data-hidden]>.setting-row]:h-0 [&>[data-hidden]>.setting-row]:min-h-0 [&>[data-hidden]>.setting-row]:py-0 [&>[data-hidden]>.setting-row]:overflow-hidden"
            >
                {props.children}
            </Collapsible.Panel>
        </Collapsible.Root>
    );
}

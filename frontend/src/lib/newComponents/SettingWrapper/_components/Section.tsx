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

    const children = React.Children.map(props.children, (child, index) => (
        <div
            key={index}
            className="px-xs py-2xs col-span-3 grid grid-cols-subgrid empty:hidden [&:nth-child(odd_of_:not(:empty))]:bg-canvas"
        >
            {child}
        </div>
    ));

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
                className="setting-section-panel col-span-3 grid grid-cols-subgrid overflow-hidden h-(--collapsible-panel-height) transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"
            >
                {children}
            </Collapsible.Panel>
        </Collapsible.Root>
    );
}

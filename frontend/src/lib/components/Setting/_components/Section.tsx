import React from "react";

import { Collapsible } from "@base-ui/react";
import { Error, ExpandMore, Warning } from "@mui/icons-material";

import type { Tone } from "@lib/components/_shared/types/tones";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { FieldAnnotationSummary } from "./SectionAnnotationsContext";
import { SectionAnnotationsContext } from "./SectionAnnotationsContext";

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

    const [fieldAnnotations, setFieldAnnotations] = React.useState<Map<string, FieldAnnotationSummary>>(
        () => new Map(),
    );

    const contextValue = React.useMemo(
        () => ({
            reportField: (id: string, summary: FieldAnnotationSummary) => {
                setFieldAnnotations((prev) => {
                    const existing = prev.get(id);
                    if (
                        existing &&
                        existing.hasError === summary.hasError &&
                        existing.hasWarning === summary.hasWarning
                    ) {
                        return prev;
                    }
                    const next = new Map(prev);
                    next.set(id, summary);
                    return next;
                });
            },
            unregisterField: (id: string) => {
                setFieldAnnotations((prev) => {
                    if (!prev.has(id)) {
                        return prev;
                    }
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            },
        }),
        [],
    );

    let errorCount = 0;
    let warningCount = 0;
    for (const summary of fieldAnnotations.values()) {
        if (summary.hasError) errorCount++;
        if (summary.hasWarning) warningCount++;
    }

    let toneOverride: "danger" | "warning" | undefined;
    if (errorCount > 0) {
        toneOverride = "danger";
    } else if (warningCount > 0) {
        toneOverride = "warning";
    }

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
                    TONE_TO_CLASSNAMES[disabled ? "disabled" : (toneOverride ?? tone)],
                    { "pointer-events-none cursor-not-allowed": disabled },
                )}
            >
                <Collapsible.Trigger className="focusable gap-x-3xs px-selectable py-selectable flex grow cursor-pointer items-center">
                    <ExpandMore className="transition-transform! group-data-closed/settingsSection:-rotate-90" />
                    <Typography family="body" as="span" size="sm" weight="bolder">
                        {props.title}
                    </Typography>
                </Collapsible.Trigger>
                {(errorCount > 0 || warningCount > 0) && (
                    <div className="gap-x-2xs px-selectable flex items-center">
                        {errorCount > 0 && (
                            <span
                                className="gap-x-2xs text-body-sm text-danger-subtle flex items-center"
                                title={`${errorCount} setting${errorCount === 1 ? "" : "s"} with an error`}
                            >
                                <Error />
                                {errorCount}
                            </span>
                        )}
                        {warningCount > 0 && (
                            <span
                                className="gap-x-4xs text-body-sm text-warning-subtle flex items-center"
                                title={`${warningCount} setting${warningCount === 1 ? "" : "s"} with a warning`}
                            >
                                <Warning />
                                {warningCount}
                            </span>
                        )}
                    </div>
                )}
                {props.adornment && <span className="px-selectable py-selectable">{props.adornment}</span>}
            </div>
            <Collapsible.Panel
                keepMounted
                data-in-section
                className="setting-section-panel [&>.setting-row:nth-child(even_of_.setting-row)]:bg-neutral/20 [&>.contents>.setting-row:nth-child(even_of_.setting-row)]:bg-neutral/20 col-span-3 grid h-(--collapsible-panel-height) grid-cols-subgrid overflow-hidden transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 [&>[data-hidden]>.setting-row]:invisible [&>[data-hidden]>.setting-row]:h-0 [&>[data-hidden]>.setting-row]:min-h-0 [&>[data-hidden]>.setting-row]:overflow-hidden [&>[data-hidden]>.setting-row]:py-0"
            >
                <SectionAnnotationsContext.Provider value={contextValue}>
                    {props.children}
                </SectionAnnotationsContext.Provider>
            </Collapsible.Panel>
        </Collapsible.Root>
    );
}

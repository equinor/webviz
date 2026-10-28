import React from "react";

import { Collapsible } from "@base-ui/react";
import { Block, Error, ExpandMore, InfoOutlined, Warning } from "@mui/icons-material";

import type { Tone } from "@lib/components/_shared/types/tones";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { FieldStatusSummary } from "./SectionStatusContext";
import { SectionStatusContext } from "./SectionStatusContext";

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

    const [isOpen, setIsOpen] = React.useState(props.defaultOpen ?? false);
    const [fieldAnnotations, setFieldAnnotations] = React.useState<Map<string, FieldStatusSummary>>(() => new Map());

    const contextValue = React.useMemo(
        () => ({
            reportField: (id: string, summary: FieldStatusSummary) => {
                setFieldAnnotations((prev) => {
                    const existing = prev.get(id);
                    if (
                        existing &&
                        existing.hasInvalidValue === summary.hasInvalidValue &&
                        existing.hasError === summary.hasError &&
                        existing.hasWarning === summary.hasWarning &&
                        existing.hasInfo === summary.hasInfo
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

    let blockCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    for (const summary of fieldAnnotations.values()) {
        if (summary.hasInvalidValue) blockCount++;
        if (summary.hasError) errorCount++;
        if (summary.hasWarning) warningCount++;
        if (summary.hasInfo) infoCount++;
    }

    // Only errors recolor the header; warning/info are conveyed by the header icons and counts
    const toneOverride: "danger" | undefined = blockCount > 0 || errorCount > 0 ? "danger" : undefined;

    return (
        <Collapsible.Root
            open={isOpen}
            onOpenChange={setIsOpen}
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
                <EndActions
                    numInvalid={blockCount}
                    numErrors={errorCount}
                    numWarnings={warningCount}
                    numInfos={infoCount}
                    onShowSection={() => setIsOpen(true)}
                />
                {props.adornment && <span className="px-selectable py-selectable">{props.adornment}</span>}
            </div>
            <Collapsible.Panel
                keepMounted
                data-in-section
                className="setting-section-panel [&>.setting-row:nth-child(even_of_.setting-row)]:bg-neutral/20 [&>.contents>.setting-row:nth-child(even_of_.setting-row)]:bg-neutral/20 [&>.setting-row:nth-child(even_of_.setting-row)+.setting-banner]:bg-neutral/20 col-span-3 grid h-(--collapsible-panel-height) grid-cols-subgrid overflow-hidden transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 [&>[data-hidden]>.setting-row]:invisible [&>[data-hidden]>.setting-row]:h-0 [&>[data-hidden]>.setting-row]:min-h-0 [&>[data-hidden]>.setting-row]:overflow-hidden [&>[data-hidden]>.setting-row]:py-0"
            >
                <SectionStatusContext.Provider value={contextValue}>{props.children}</SectionStatusContext.Provider>
            </Collapsible.Panel>
        </Collapsible.Root>
    );
}

type EndActionsProps = {
    numInvalid: number;
    numErrors: number;
    numWarnings: number;
    numInfos: number;
    onShowSection: () => void;
};

function EndActions(props: EndActionsProps) {
    const { numInvalid, numErrors, numWarnings, numInfos, onShowSection } = props;

    if (numInvalid === 0 && numErrors === 0 && numWarnings === 0 && numInfos === 0) {
        return null;
    }

    return (
        <div className="gap-x-2xs px-selectable flex items-center">
            {numInfos > 0 && (
                <Tooltip
                    content={`${numInfos} setting${numInfos === 1 ? "" : "s"} waiting for another setting - click to show`}
                    side="bottom"
                >
                    <Button
                        onClick={onShowSection}
                        variant="ghost"
                        tone="accent"
                        size="small"
                        iconOnly
                        icon={<InfoOutlined style={{ fontSize: 16 }} />}
                        aria-label="Settings waiting for another setting - show the section"
                    />
                </Tooltip>
            )}
            {numWarnings > 0 && (
                <Tooltip
                    content={`${numWarnings} warning${numWarnings === 1 ? "" : "s"} - click to show`}
                    side="bottom"
                >
                    <Button
                        onClick={onShowSection}
                        variant="ghost"
                        tone="warning"
                        size="small"
                        iconOnly
                        icon={<Warning style={{ fontSize: 16 }} />}
                        aria-label="Settings with warnings - show the section"
                    />
                </Tooltip>
            )}
            {numErrors > 0 && (
                <Tooltip
                    content={`${numErrors} setting${numErrors === 1 ? "" : "s"} with an error - click to show`}
                    side="bottom"
                >
                    <Button
                        onClick={onShowSection}
                        variant="ghost"
                        tone="danger"
                        size="small"
                        iconOnly
                        icon={<Error style={{ fontSize: 16 }} />}
                        aria-label="Settings with errors - show the section"
                    />
                </Tooltip>
            )}
            {numInvalid > 0 && (
                <Tooltip
                    content={`${numInvalid} setting${numInvalid === 1 ? "" : "s"} with an invalid value - click to show`}
                    side="bottom"
                >
                    <Button
                        onClick={onShowSection}
                        variant="ghost"
                        tone="danger"
                        size="small"
                        iconOnly
                        icon={<Block style={{ fontSize: 16 }} />}
                        aria-label="Invalid settings - show the section"
                    />
                </Tooltip>
            )}
        </div>
    );
}

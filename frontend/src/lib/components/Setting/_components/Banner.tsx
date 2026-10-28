import React from "react";

import { Collapsible } from "@base-ui/react";
import { ExpandMore } from "@mui/icons-material";

import { Banner as BaseBanner } from "@lib/components/Banner";
import { Typography } from "@lib/components/Typography";

import { SectionStatusContext, type FieldStatusSummary } from "./SectionStatusContext";
import { useReportBannerMessage } from "./useReportBannerMessage";

export type BannerType = "info" | "warning" | "error";

export type BannerProps = {
    /** Severity of the banner. Controls the color and what is reported when `report` is set. */
    type: BannerType;
    /** Short headline, always visible. Also the message reported when `report` is set. */
    title: string;
    /** Whether the content starts expanded. @default true */
    defaultOpen?: boolean;
    /**
     * Opt in to reporting the banner to the enclosing `Setting.Section` (header status by `type`) and
     * `Setting.Panel` (`{ type, message: title }` via `onBannerMessagesChange`).
     * @default false
     */
    report?: boolean;
    /**
     * Details shown below the title. When provided, the banner can be collapsed to show only the title.
     */
    children?: React.ReactNode;
};

const BASE_BANNER_TONES = { info: "info", warning: "warning", error: "danger" } as const;

const SECTION_STATUS_BY_TYPE: Record<BannerType, FieldStatusSummary> = {
    error: { hasInvalidValue: false, hasError: true, hasWarning: false, hasInfo: false },
    warning: { hasInvalidValue: false, hasError: false, hasWarning: true, hasInfo: false },
    info: { hasInvalidValue: false, hasError: false, hasWarning: false, hasInfo: true },
};

/**
 * Collapsible info/warning/error banner for use inside a `Setting.Section`. Place it directly below the
 * `Setting.Field` it relates to; it continues that field's row color. Render it conditionally; when unmounted,
 * nothing is reported. Children are optional details shown below the title.
 */
export function Banner(props: BannerProps) {
    const { type, title, defaultOpen = true, report = false, children } = props;

    const id = React.useId();
    const sectionStatusContext = React.useContext(SectionStatusContext);

    React.useEffect(
        function reportToSection() {
            if (!report || !sectionStatusContext) {
                return;
            }
            sectionStatusContext.reportField(id, SECTION_STATUS_BY_TYPE[type]);
            return function unregisterFromSection() {
                sectionStatusContext.unregisterField(id);
            };
        },
        [report, type, sectionStatusContext, id],
    );

    useReportBannerMessage(report ? { type, message: title } : null);

    const titleElement = (
        <Typography family="body" as="span" size="sm" weight="bolder">
            {title}
        </Typography>
    );

    return (
        // Continues the stripe of the field above it (see the Section's `.setting-banner` rule)
        <div className="setting-banner px-xs py-2xs col-span-3">
            <BaseBanner tone={BASE_BANNER_TONES[type]}>
                {children ? (
                    <Collapsible.Root defaultOpen={defaultOpen} className="group/settingBanner">
                        <Collapsible.Trigger className="focusable gap-x-xs flex w-full cursor-pointer items-center justify-between text-left">
                            {titleElement}
                            <ExpandMore className="transition-transform! group-data-closed/settingBanner:-rotate-90" />
                        </Collapsible.Trigger>
                        <Collapsible.Panel className="mt-xs">{children}</Collapsible.Panel>
                    </Collapsible.Root>
                ) : (
                    titleElement
                )}
            </BaseBanner>
        </div>
    );
}

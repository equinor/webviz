import React from "react";

import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";

import { DashboardPreview } from "@framework/internal/components/DashboardPreview/dashboardPreview";
import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { PortalContainerContext } from "@lib/components/_shared/contexts/portalContainerContext";
import { Typography } from "@lib/components/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

// How long the pointer has to rest on a tab before its preview opens.
const HOVER_OPEN_DELAY_MS = 600;

// How long the preview lingers after the pointer leaves the tab (and popup), so brushing past a
// neighbouring tab or a small gap doesn't make it flicker.
const HOVER_CLOSE_DELAY_MS = 300;

const PREVIEW_WIDTH = 300;
const PREVIEW_HEIGHT = 170;

export type DashboardTabPreviewProps = {
    dashboard: Dashboard;
    /** Suppresses the preview, e.g. while a tab drag-reorder is in progress. */
    disabled?: boolean;
    /** The tab element the preview anchors to and opens on hover of. */
    children: React.ReactElement;
};

/**
 * Wraps a dashboard tab so that hovering it for a moment reveals a popover with the dashboard's
 * name, description and a static preview of its layout. Built on a tooltip (hover/focus only) so
 * clicking a tab to select it never opens the preview.
 */
export function DashboardTabPreview(props: DashboardTabPreviewProps): React.ReactNode {
    const { dashboard, disabled } = props;
    const portalContainer = React.useContext(PortalContainerContext);

    const metadata = usePublishSubscribeTopicValue(dashboard, DashboardTopic.METADATA);
    // Re-render on layout changes so an open preview of the active dashboard stays current.
    usePublishSubscribeTopicValue(dashboard, DashboardTopic.LAYOUT);

    return (
        <TooltipBase.Root disabled={disabled}>
            <TooltipBase.Trigger
                delay={HOVER_OPEN_DELAY_MS}
                closeDelay={HOVER_CLOSE_DELAY_MS}
                render={props.children}
            />
            <TooltipBase.Portal container={portalContainer}>
                <TooltipBase.Positioner className="z-tooltip" side="top" align="center" sideOffset={8}>
                    <TooltipBase.Popup className="bg-floating border-neutral gap-y-xs p-sm flex flex-col rounded-sm border shadow-md">
                        <div className="gap-y-3xs flex flex-col" style={{ maxWidth: PREVIEW_WIDTH }}>
                            <Typography size="md" weight="bolder" layoutClassName="break-words">
                                {metadata.name}
                            </Typography>
                            {metadata.description && (
                                <Typography size="sm" tone="neutral" layoutClassName="break-words">
                                    {metadata.description}
                                </Typography>
                            )}
                        </div>
                        <DashboardPreview
                            layout={dashboard.getLayoutForPreview()}
                            width={PREVIEW_WIDTH}
                            height={PREVIEW_HEIGHT}
                        />
                    </TooltipBase.Popup>
                </TooltipBase.Positioner>
            </TooltipBase.Portal>
        </TooltipBase.Root>
    );
}

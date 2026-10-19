import type React from "react";

import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";

import { DashboardPreview } from "@framework/internal/components/DashboardPreview/dashboardPreview";
import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { Typography } from "@lib/components/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

// How long the pointer has to rest on a tab before its preview opens. Shared across all dashboard
// tab previews via a `TooltipBase.Provider` (see DashboardsPanel) so that, once one preview is
// open, hovering a neighbouring tab opens its preview instantly instead of re-running the delay.
export const DASHBOARD_TAB_PREVIEW_OPEN_DELAY_MS = 600;

// How long the preview lingers after the pointer leaves the tab (and popup), so brushing past a
// neighbouring tab or a small gap doesn't make it flicker.
export const DASHBOARD_TAB_PREVIEW_CLOSE_DELAY_MS = 300;

const PREVIEW_WIDTH = 200;
const PREVIEW_HEIGHT = 120;

export type DashboardTabPreviewProps = {
    dashboard: Dashboard;
    /** Suppresses the preview, e.g. while a tab drag-reorder is in progress. */
    disabled?: boolean;
    /** The tab element the preview anchors to and opens on hover of. */
    children: React.ReactElement;
    /**
     * The tab element's id. Must be passed here too, not only set on the element: base-ui tracks which
     * trigger opened the preview by this id, and never shows it if the element's id differs.
     */
    triggerId: string;
};

/**
 * Shows the dashboard's name, description and layout preview when hovering or focusing its tab. A
 * tooltip, so clicking the tab never opens it. The delays come from a `TooltipBase.Provider` in
 * DashboardsPanel.
 */
export function DashboardTabPreview(props: DashboardTabPreviewProps): React.ReactNode {
    const { dashboard, disabled } = props;

    const metadata = usePublishSubscribeTopicValue(dashboard, DashboardTopic.METADATA);
    // Re-render on layout changes so an open preview of the active dashboard stays current.
    usePublishSubscribeTopicValue(dashboard, DashboardTopic.LAYOUT);

    return (
        <TooltipBase.Root disabled={disabled}>
            <TooltipBase.Trigger id={props.triggerId} render={props.children} />
            <TooltipBase.Portal>
                <TooltipBase.Positioner className="z-tooltip" side="top" align="center" sideOffset={8}>
                    <TooltipBase.Popup className="bg-floating border-neutral gap-y-xs p-sm flex flex-col rounded-sm border shadow-md">
                        <div className="gap-y-3xs flex flex-col" style={{ maxWidth: PREVIEW_WIDTH }}>
                            <Typography size="md" weight="bolder" layoutClassName="wrap-break-word">
                                {metadata.name}
                            </Typography>
                            {metadata.description && (
                                <Typography size="sm" tone="neutral" layoutClassName="wrap-break-word">
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

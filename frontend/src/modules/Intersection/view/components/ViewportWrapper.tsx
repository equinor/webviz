import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { isEqual } from "lodash";

import type { HoverService } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { Bounds, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { FitInViewStatus, Toolbar } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";
import { isValidViewport } from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import { ViewportLabel } from "@modules/_shared/components/ViewportLabel";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import type { Interfaces } from "@modules/Intersection/interfaces";

import { useViewportState } from "../hooks/useViewportState";

import { ReadoutWrapper } from "./ReadoutWrapper";
import { useViewLinkResult } from "./ViewLinkManager";

export type ViewportWrapperProps = {
    viewId: string;
    name: string;
    color: string | null;
    intersectionSource: IntersectionSettingValue | null;
    referenceSystem?: IntersectionReferenceSystem;
    layerItems: LayerItem[];
    layerItemIdToNameMap: Record<string, string>;
    layerItemsBounds: Bounds;
    focusBounds: Bounds | null;
    doRefocus: boolean;
    colorScales: ColorScaleWithId[];
    workbenchServices: WorkbenchServices;
    hoverService: HoverService;
    viewContext: ViewContext<Interfaces>;
    onViewportRefocused?: () => void;
};

export function ViewportWrapper(props: ViewportWrapperProps): React.ReactNode {
    const { viewId } = props;

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);

    // View link state and handlers
    const viewLinkResult = useViewLinkResult(viewId);
    const { isHoverHighlighted, highlightColor, onToggleViewLink, onHoverViewLink } = viewLinkResult;

    // Viewport, bounds, vertical scale, and all related handlers
    const {
        viewport,
        effectiveVerticalScale,
        effectiveLayerItemsBounds,
        fitInViewStatus,
        showGrid,
        updateViewport,
        updateVerticalScale,
        setFitInViewStatus,
        setShowGrid,
        handleFitInViewToggle,
    } = useViewportState({
        viewId,
        viewLinkResult,
        layerItemsBounds: props.layerItemsBounds,
        focusBounds: props.focusBounds,
        doRefocus: props.doRefocus,
        containerSize: mainDivSize,
        workbenchServices: props.workbenchServices,
        viewContext: props.viewContext,
        onViewportRefocused: props.onViewportRefocused,
    });

    const handleViewportChange = React.useCallback(
        function handleViewportChange(newViewport: Viewport) {
            if (!isValidViewport(newViewport)) {
                throw new Error("Got invalid viewport: " + newViewport);
            }
            if (!isEqual(newViewport, viewport)) {
                setFitInViewStatus(FitInViewStatus.OFF);
                updateViewport(newViewport);
            }
        },
        [viewport, setFitInViewStatus, updateViewport],
    );

    const handleVerticalScaleIncrease = React.useCallback(
        function handleVerticalScaleIncrease() {
            updateVerticalScale(Math.floor(effectiveVerticalScale + 1.0));
        },
        [effectiveVerticalScale, updateVerticalScale],
    );

    const handleVerticalScaleDecrease = React.useCallback(
        function handleVerticalScaleDecrease() {
            updateVerticalScale(Math.max(1.0, Math.ceil(effectiveVerticalScale - 1.0)));
        },
        [effectiveVerticalScale, updateVerticalScale],
    );

    const handleShowGridToggle = React.useCallback(
        function handleShowGridToggle(active: boolean) {
            setShowGrid(active);
        },
        [setShowGrid],
    );

    return (
        <div
            ref={mainDivRef}
            className={resolveClassNames("relative w-full h-full flex flex-col", {
                "outline-2 -outline-offset-2 rounded": isHoverHighlighted,
                "outline-gray-400": isHoverHighlighted && !highlightColor,
            })}
            style={isHoverHighlighted && highlightColor ? { outlineColor: highlightColor } : undefined}
        >
            <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none pt-1">
                    <ViewportLabel name={props.name} color={props.color} />
                </div>
                <ReadoutWrapper
                    intersectionSource={props.intersectionSource}
                    showGrid={showGrid}
                    verticalScale={effectiveVerticalScale}
                    referenceSystem={props.referenceSystem ?? undefined}
                    layers={props.layerItems}
                    layerIdToNameMap={props.layerItemIdToNameMap}
                    bounds={effectiveLayerItemsBounds}
                    viewport={viewport ?? undefined}
                    onViewportChange={handleViewportChange}
                    hoverService={props.hoverService}
                    viewContext={props.viewContext}
                />
                <Toolbar
                    visible
                    zFactor={effectiveVerticalScale}
                    gridVisible={showGrid}
                    fitInViewStatus={fitInViewStatus}
                    onFitInViewStatusToggle={handleFitInViewToggle}
                    onGridLinesToggle={handleShowGridToggle}
                    onVerticalScaleIncrease={handleVerticalScaleIncrease}
                    onVerticalScaleDecrease={handleVerticalScaleDecrease}
                    viewLinks={viewLinkResult.availableViewLinks.map((link) => {
                        const views = link.viewIds
                            .map((id) => viewLinkResult.intersectionViews.find((v) => v.id === id))
                            .filter((v): v is NonNullable<typeof v> => v != null)
                            .map((v) => ({ id: v.id, name: v.name, color: v.color }));
                        return {
                            id: link.id,
                            color: link.color,
                            views,
                            containsThisView: link.viewIds.includes(viewId),
                        };
                    })}
                    unlinkedViews={viewLinkResult.unlinkedViews}
                    onToggleViewLink={(otherViewId) => onToggleViewLink(otherViewId, viewport)}
                    onHoverViewLink={onHoverViewLink}
                />
                <ColorLegendsContainer colorScales={props.colorScales} height={mainDivSize.height / 2 - 50} />
            </div>
        </div>
    );
}

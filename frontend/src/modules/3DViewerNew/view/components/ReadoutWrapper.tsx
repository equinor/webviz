import React from "react";

import type { Layer as DeckGlLayer, Layer, PickingInfo } from "@deck.gl/core";
import { View as DeckGlView } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import type { LayerPickInfo, MapMouseEvent } from "@webviz/subsurface-viewer";
import { useMultiViewCursorTracking } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewCursorTracking";
import { useMultiViewPicking } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewPicking";
import { WellLabelLayer } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { WellsPickInfo } from "@webviz/subsurface-viewer/dist/layers/wells/types";
import type { Feature } from "geojson";
import { isEqual } from "lodash";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import { PolylinesLayer } from "@modules/3DViewerNew/customDeckGlLayers/PolylinesLayer";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import {
    SubsurfaceViewerWithCameraState,
    type SubsurfaceViewerWithCameraStateProps,
} from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { ViewportLabel } from "@modules/_shared/components/ViewportLabel";
import type { ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { DeckGlInstanceManagerTopic, type DeckGlInstanceManager } from "../utils/DeckGlInstanceManager";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";

export type ReadoutWrapperProps = {
    views: ViewsTypeExtended;
    layers: DeckGlLayer[];
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    deckGlManager: DeckGlInstanceManager;
    verticalScale: number;
    triggerHome: number;
    deckGlRef: React.RefObject<DeckGLRef | null>;
    children?: React.ReactNode;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const id = React.useId();
    const [hideReadout, setHideReadout] = React.useState<boolean>(false);
    const [storedDeckGlViews, setStoredDeckGlViews] =
        React.useState<SubsurfaceViewerWithCameraStateProps["views"]>(undefined);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const deckGlRef = React.useRef<DeckGLRef | null>(null);

    React.useImperativeHandle(props.deckGlRef, () => deckGlRef.current);
    usePublishSubscribeTopicValue(props.deckGlManager, DeckGlInstanceManagerTopic.REDRAW);

    const [numRows] = props.views.layout;

    const viewports = props.views?.viewports ?? [];
    const layers = props.layers ?? [];

    const { pickingInfoPerView, activeViewportId, getPickingInfo } = useMultiViewPicking({
        deckGlRef,
        pickDepth: 3,
        multiPicking: true,
    });

    const { viewports: adjustedViewports, layers: adjustedLayers } = useMultiViewCursorTracking({
        activeViewportId,
        viewports,
        layers,
        worldCoordinates: pickingInfoPerView[activeViewportId]?.coordinates ?? null,
        crosshairProps: {
            // ! We hide the crosshair by opacity since toggling "visible" causes a full asset load/unload
            color: [255, 255, 255, hideReadout ? 0 : 255],
            sizePx: 32,
        },
    });

    function handleMouseHover(event: MapMouseEvent): void {
        getPickingInfo(event);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            handleMouseHover(event);
        }
    }

    function tooltip(info: PickingInfo): string {
        if (
            (info.layer?.constructor === WellLabelLayer || info.sourceLayer?.constructor === WellLabelLayer) &&
            info.object?.wellLabels
        ) {
            return info.object.wellLabels?.join("\n");
        } else if ((info as WellsPickInfo)?.logName) {
            return (info as WellsPickInfo)?.logName;
        } else if (info.layer?.id === "drawing-layer") {
            return (info as LayerPickInfo).propertyValue?.toFixed(2) ?? "";
        } else if (info.layer?.constructor === PolylinesLayer) {
            return info?.object?.name;
        }
        const feat = info.object as Feature;
        return feat?.properties?.["name"];
    }

    const deckGlProps = props.deckGlManager.makeDeckGlComponentProps({
        deckGlRef,
        id: `subsurface-viewer-${id}`,
        views: { ...props.views, viewports: adjustedViewports },
        verticalScale: props.verticalScale,
        scale: {
            visible: true,
            incrementValue: 100,
            widthPerUnit: 100,
            cssStyle: {
                right: 10,
                top: 10,
            },
        },
        coords: {
            visible: false,
            multiPicking: true,
            pickDepth: 2,
        },
        triggerHome: props.triggerHome,
        pickingRadius: 5,
        layers: adjustedLayers,
        onMouseEvent: handleMouseEvent,
        getTooltip: tooltip,
    });

    let filteredLayers = deckGlProps.layers as Layer<any>[];
    if (filteredLayers.filter((layer) => layer.id.includes("polylines-layer") && layer.props.visible).length >= 2) {
        filteredLayers = filteredLayers.filter(
            (layer) => !layer.id.includes("polylines-layer") || layer.id === "polylines-layer",
        );
    }

    if (!isEqual(deckGlProps.views, storedDeckGlViews)) {
        setStoredDeckGlViews(deckGlProps.views);
    }

    const handleMainDivLeave = React.useCallback(() => setHideReadout(true), []);
    const handleMainDivEnter = React.useCallback(() => setHideReadout(false), []);

    return (
        <div
            ref={mainDivRef}
            className="h-full w-full relative"
            onMouseEnter={handleMainDivEnter}
            onMouseLeave={handleMainDivLeave}
        >
            {props.children}
            <SubsurfaceViewerWithCameraState {...deckGlProps} layers={filteredLayers} views={storedDeckGlViews}>
                {props.views.viewports.map((viewport) => (
                    // @ts-expect-error -- This class is marked as abstract, but seems to just work as is
                    // ? Should we do a proper implementation of the class??
                    <DeckGlView key={viewport.id} id={viewport.id}>
                        <ViewportLabel viewport={viewport} />

                        <ColorLegendsContainer
                            colorScales={viewport.colorScales}
                            height={((mainDivSize.height / 3) * 2) / numRows - 20}
                            position="left"
                        />

                        <ReadoutBoxWrapper
                            compact={props.views.viewports.length > 1}
                            viewportPickInfo={pickingInfoPerView[viewport.id]}
                            visible={!hideReadout && !!pickingInfoPerView[viewport.id]}
                        />
                    </DeckGlView>
                ))}
            </SubsurfaceViewerWithCameraState>
            {props.views.viewports.length === 0 && (
                <div className="absolute left-1/2 top-1/2 w-64 h-10 -ml-32 -mt-5 text-center">
                    Please add views and layers in the settings panel.
                </div>
            )}
        </div>
    );
}

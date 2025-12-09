import React from "react";

import type { Layer as DeckGlLayer, PickingInfo } from "@deck.gl/core";
import { View as DeckGlView } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import type { LayerPickInfo, LightsType, MapMouseEvent, ViewportType } from "@webviz/subsurface-viewer";
import { WellLabelLayer } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { WellsPickInfo } from "@webviz/subsurface-viewer/dist/layers/wells/types";
import type { Feature } from "geojson";
import { isEqual, uniqBy } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ViewportLabel } from "@modules/_shared/components/ViewportLabel";
import { PolylinesLayer } from "@modules/_shared/customDeckGlLayers/PolylinesLayer";
import type { ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import {
    DeckGlInstanceManagerTopic,
    type DeckGlInstanceManager,
} from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

import { PositionReadout } from "./PositionReadout";
import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import {
    SubsurfaceViewerWithCameraState,
    type SubsurfaceViewerWithCameraStateProps,
} from "./SubsurfaceViewerWithCameraState";

export type ReadoutWrapperProps = {
    // moduleInstanceId: string;
    views: ViewsTypeExtended;
    layers: DeckGlLayer[];
    deckGlManager: DeckGlInstanceManager;
    verticalScale: number;
    triggerHome: number;
    deckGlRef: React.RefObject<DeckGLRef | null>;
    children?: React.ReactNode;
    onViewerHover?: (mouseEvent: MapMouseEvent) => void;
    onViewportHover?: (viewport: ViewportType | null) => void;
};

const PICKING_RADIUS = 5;

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const ctx = useDpfSubsurfaceViewerContext();
    const id = React.useId();
    const [hideReadout, setHideReadout] = React.useState<boolean>(false);
    const [pickingInfoPerView, setPickingInfoPerView] = React.useState<Record<string, PickingInfo[]>>({});
    const [activeViewportId, setActiveViewportId] = React.useState<string | null>(null);

    const [storedDeckGlViews, setStoredDeckGlViews] =
        React.useState<SubsurfaceViewerWithCameraStateProps["views"]>(undefined);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const deckGlRef = React.useRef<DeckGLRef | null>(null);

    React.useImperativeHandle(props.deckGlRef, () => deckGlRef.current);
    usePublishSubscribeTopicValue(props.deckGlManager, DeckGlInstanceManagerTopic.REDRAW);

    const [numRows] = props.views.layout;

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            const hoveredViewPort = event.infos[0]?.viewport;

            const pickWithCoordinates = event.infos.find((pick) => pick.coordinate?.length);

            if (pickWithCoordinates) {
                const newPickInfoDict = pickAtWorldPosition(
                    pickWithCoordinates.coordinate![0],
                    pickWithCoordinates.coordinate![1],
                );

                if (newPickInfoDict) {
                    event.infos = Object.values(newPickInfoDict).flat();
                }
            }

            setActiveViewportId(hoveredViewPort?.id ?? null);
            props.onViewerHover?.(event);
            props.onViewportHover?.(hoveredViewPort ?? null);
        }
    }

    function getTooltip(info: PickingInfo): string {
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

    const pickAtWorldPosition = React.useCallback(function pickAtWorldPosition(x?: number, y?: number) {
        if (!deckGlRef.current?.deck?.isInitialized) return;

        const deck = deckGlRef.current?.deck;
        const deckViewports = deck?.getViewports();

        if (!deck || !deckViewports?.length || !x || !y) return;

        const pickInfoDict: Record<string, PickingInfo[]> = {};

        for (const viewport of deckViewports) {
            const [screenX, screenY] = viewport.project([x, y]);

            const picks = deck.pickMultipleObjects({
                x: screenX + viewport.x,
                y: screenY + viewport.y,
                radius: PICKING_RADIUS,
                depth: 6,
            });

            // For some reason, the map layers gets picked multiple times, so we need to filter out duplicates.
            // See issue #webviz-subsurface-components/2320
            const uniquePicks = uniqBy(picks, (pick) => pick.sourceLayer?.id);

            pickInfoDict[viewport.id] = uniquePicks;
        }

        setPickingInfoPerView(pickInfoDict);
        return pickInfoDict;
    }, []);

    const deckGlProps = props.deckGlManager.makeDeckGlComponentProps({
        deckGlRef,
        id: `subsurface-viewer-${id}`,
        bounds: ctx.bounds,
        views: {
            ...props.views,
            viewports: props.views.viewports,
            layout: props.views?.layout ?? [1, 1],
        },
        lights: {
            ...(ctx.visualizationMode === "2D" ? LIGHTS_2D : LIGHTS_3D),
        },
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
        showReadout: false,
        triggerHome: props.triggerHome,
        pickingRadius: PICKING_RADIUS,
        layers: props.layers,
        onMouseEvent: handleMouseEvent,
        getTooltip: getTooltip,
    });

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
            <PositionReadout
                viewportPickInfo={pickingInfoPerView[activeViewportId ?? -1]?.[0]}
                verticalScale={props.verticalScale}
                visible={!hideReadout}
            />
            <SubsurfaceViewerWithCameraState
                {...deckGlProps}
                views={storedDeckGlViews}
                getCameraPosition={ctx.onViewStateChange}
                initialCameraPosition={ctx.viewState ?? undefined}
            >
                {props.views.viewports.map((viewport) => (
                    // @ts-expect-error -- This class is marked as abstract, but seems to just work as is
                    <DeckGlView key={viewport.id} id={viewport.id}>
                        <ViewportLabel viewport={viewport} />
                        <ColorLegendsContainer
                            colorScales={viewport.colorScales}
                            height={((mainDivSize.height / 3) * 2) / numRows - 20}
                            position="left"
                        />

                        <ReadoutBoxWrapper
                            compact={props.views.viewports.length > 1}
                            viewportPicks={pickingInfoPerView[viewport.id]}
                            visible={!hideReadout && !!pickingInfoPerView[viewport.id]}
                            verticalScale={props.verticalScale}
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

const LIGHTS_2D: LightsType = {
    pointLights: [
        {
            position: [0, 0, 1],
            intensity: 0.0,
        },
    ],
    headLight: {
        intensity: 0.0,
        color: [255, 255, 255],
    },
    ambientLight: { intensity: 2.9, color: [255, 255, 255] },
} as const;

const LIGHTS_3D: LightsType = {
    pointLights: [
        {
            position: [0, 0, 1],
            intensity: 0.0,
        },
    ],
    headLight: {
        intensity: 1.0,
        color: [255, 255, 255],
    },
    ambientLight: { intensity: 1.5, color: [255, 255, 255] },
} as const;

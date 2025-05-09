import React from "react";

import { Layer as DeckGlLayer } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { BoundingBox3D, LayerPickInfo, MapMouseEvent, ViewsType } from "@webviz/subsurface-viewer";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";

import { DeckGlInstanceManager } from "../utils/DeckGlInstanceManager";

export type ReadoutWrapperProps = {
    views: ViewsType;
    viewportAnnotations: React.ReactNode[];
    layers: DeckGlLayer[];
    bounds?: BoundingBox3D;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    deckGlManager: DeckGlInstanceManager;
    verticalScale: number;
    triggerHome: number;
    deckGlRef: React.RefObject<DeckGLRef | null>;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const id = React.useId();
    const deckGlRef = React.useRef<DeckGLRef>(null);

    React.useImperativeHandle(props.deckGlRef, () => deckGlRef.current);

    const [layerPickingInfo, setLayerPickingInfo] = React.useState<LayerPickInfo[]>([]);

    function handleMouseEvent(event: MapMouseEvent) {
        const pickingInfo = event.infos;
        setLayerPickingInfo(pickingInfo);
    }

    return (
        <>
            <ReadoutBoxWrapper layerPickInfo={layerPickingInfo} visible />
            <SubsurfaceViewerWithCameraState
                {...props.deckGlManager.makeDeckGlComponentProps({
                    deckGlRef: deckGlRef,
                    id: `subsurface-viewer-${id}`,
                    views: props.views,
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
                    layers: props.layers,
                    onMouseEvent: handleMouseEvent,
                })}
            >
                {props.viewportAnnotations}
            </SubsurfaceViewerWithCameraState>
            {props.views.viewports.length === 0 && (
                <div className="absolute left-1/2 top-1/2 w-64 h-10 -ml-32 -mt-5 text-center">
                    Please add views and layers in the settings panel.
                </div>
            )}
        </>
    );
}

import React from "react";

import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ViewContext } from "@framework/ModuleContext";
import { GlobalTopicDefinitions, WorkbenchServices, useSubscribedValue } from "@framework/WorkbenchServices";

import { isEqual } from "lodash";

import { SubsurfaceViewerWrapper, SubsurfaceViewerWrapperProps } from "./SubsurfaceViewerWrapper";

export type HoverUpdateWrapperProps = {
    wellboreUuid: string | null;
    intersectionReferenceSystem?: IntersectionReferenceSystem;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<any>;
} & SubsurfaceViewerWrapperProps;

export function HoverUpdateWrapper(props: HoverUpdateWrapperProps): React.ReactNode {
    const [mdLayer, setMdLayer] = React.useState<GeoJsonLayer[]>([]);

    const [prevHoveredMd, setPrevHoveredMd] = React.useState<GlobalTopicDefinitions["global.hoverMd"] | null>(null);
    const syncedHoveredMd = useSubscribedValue(
        "global.hoverMd",
        props.workbenchServices,
        props.viewContext.getInstanceIdString()
    );

    if (!isEqual(syncedHoveredMd, prevHoveredMd)) {
        setPrevHoveredMd(syncedHoveredMd);
        if (syncedHoveredMd && props.intersectionReferenceSystem) {
            const [x, y] = props.intersectionReferenceSystem.getPosition(syncedHoveredMd.md);
            const [, z] = props.intersectionReferenceSystem.project(syncedHoveredMd.md);
            const hoveredMdPoint3d = [x, y, -z];
            setMdLayer([
                new GeoJsonLayer({
                    id: "hovered-md-point",
                    data: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                geometry: {
                                    type: "Point",
                                    coordinates: hoveredMdPoint3d,
                                },
                                properties: {
                                    color: [255, 0, 0], // Custom property to use in styling (optional)
                                },
                            },
                        ],
                    },
                    pickable: false,
                    getPosition: (d: number[]) => d,
                    getRadius: 10,
                    pointRadiusUnits: "pixels",
                    getFillColor: [255, 0, 0],
                    getLineColor: [255, 0, 0],
                    getLineWidth: 2,
                }),
            ]);
        } else {
            setMdLayer([]);
        }
    }

    return <SubsurfaceViewerWrapper {...props} layers={[...props.layers, ...mdLayer]} />;
}

import React from "react";

import { OrbitView, OrthographicView, type Layer } from "@deck.gl/core";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { AssemblerProduct } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { VisualizationItemType } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewportTypeExtended, ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import type { BoundingBox2D, BoundingBox3D, ViewStateType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { PlaceholderLayer } from "../../customDeckGlLayers/PlaceholderLayer";

import { InteractionWrapper } from "./_components/InteractionWrapper";
import { PreferredViewLayout } from "./typesAndEnums";

export type DpfSubsurfaceViewerContextType = {
    visualizationMode: "2D" | "3D";
    viewState?: ViewStateType;
    onViewStateChange?: (viewState: ViewStateType) => void;
    visualizationAssemblerProduct: AssemblerProduct<any>;
    preferredViewLayout: PreferredViewLayout;
    bounds: BoundingBox2D | undefined;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    workbenchServices: WorkbenchServices;
};

export const DpfSubsurfaceViewerContext = React.createContext<DpfSubsurfaceViewerContextType | null>(null);

export function useDpfSubsurfaceViewerContext() {
    const context = React.useContext(DpfSubsurfaceViewerContext);
    if (!context) {
        throw new Error("useDpfSubsurfaceViewerContext must be used within a DpfSubsurfaceViewerContext.Provider");
    }
    return context;
}

export type DpfSubsurfaceViewerWrapperProps = {
    visualizationMode: "2D" | "3D";
    viewState?: ViewStateType;
    onViewStateChange?: (viewState: ViewStateType) => void;
    fieldId: string;
    visualizationAssemblerProduct: AssemblerProduct<any, any, any>;
    viewContext: ViewContext<any>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    workbenchServices: WorkbenchServices;
    preferredViewLayout: PreferredViewLayout;
};

export function DpfSubsurfaceViewerWrapper(props: DpfSubsurfaceViewerWrapperProps): React.ReactNode {
    const [changingFields, setChangingFields] = React.useState<boolean>(false);
    const [prevFieldId, setPrevFieldId] = React.useState<string | null>(null);
    const statusWriter = useViewStatusWriter(props.viewContext);

    const viewports: ViewportTypeExtended[] = [];
    const deckGlLayers: Layer<any>[] = [];
    const globalAnnotations = props.visualizationAssemblerProduct.annotations;
    const globalColorScales = globalAnnotations.filter((el) => "colorScale" in el);
    const globalLayerIds: string[] = ["placeholder", "axes"];
    const usedPolylineIds = props.visualizationAssemblerProduct.accumulatedData.polylineIds;

    for (const item of props.visualizationAssemblerProduct.children) {
        if (item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW) {
            const colorScales = item.annotations.filter((el) => "colorScale" in el);
            const layerIds: string[] = [];

            for (const child of item.children) {
                if (child.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
                    const layer = child.visualization;
                    layerIds.push(layer.id);
                    deckGlLayers.push(layer);
                }
            }
            viewports.push({
                id: item.id,
                name: item.name,
                color: item.color,
                isSync: true,
                viewType: props.visualizationMode === "3D" ? OrbitView : OrthographicView,
                layerIds,
                colorScales,
            });
        } else if (item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
            deckGlLayers.push(item.visualization);
            globalLayerIds.push(item.visualization.id);
        }
    }

    const views: ViewsTypeExtended = {
        layout: [0, 0],
        showLabel: false,
        viewports: viewports.map((viewport) => ({
            ...viewport,
            layerIds: [...globalLayerIds, ...viewport.layerIds!],
            colorScales: [...globalColorScales, ...viewport.colorScales!],
        })),
    };

    const numViews = props.visualizationAssemblerProduct.children.filter(
        (item) => item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW,
    ).length;

    if (numViews) {
        const numCols = Math.ceil(Math.sqrt(numViews));
        const numRows = Math.ceil(numViews / numCols);
        views.layout = [numCols, numRows];
    }

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        views.layout = [views.layout[1], views.layout[0]];
    }

    statusWriter.setLoading(props.visualizationAssemblerProduct.numLoadingDataProviders > 0);

    for (const message of props.visualizationAssemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(message);
    }

    let bounds3D: BoundingBox3D | undefined = undefined;
    let bounds2D: BoundingBox2D | undefined = undefined;
    if (props.visualizationAssemblerProduct.combinedBoundingBox) {
        bounds3D = [
            props.visualizationAssemblerProduct.combinedBoundingBox.min.x,
            props.visualizationAssemblerProduct.combinedBoundingBox.min.y,
            props.visualizationAssemblerProduct.combinedBoundingBox.min.z,
            props.visualizationAssemblerProduct.combinedBoundingBox.max.x,
            props.visualizationAssemblerProduct.combinedBoundingBox.max.y,
            props.visualizationAssemblerProduct.combinedBoundingBox.max.z,
        ];
        bounds2D = [
            props.visualizationAssemblerProduct.combinedBoundingBox.min.x,
            props.visualizationAssemblerProduct.combinedBoundingBox.min.y,
            props.visualizationAssemblerProduct.combinedBoundingBox.max.x,
            props.visualizationAssemblerProduct.combinedBoundingBox.max.y,
        ];
    }

    deckGlLayers.push(
        new PlaceholderLayer({ id: "placeholder" }),
        new AxesLayer({ id: "axes", bounds: bounds3D, ZIncreasingDownwards: true }),
    );

    deckGlLayers.reverse();

    // We are using this pattern (emptying the layers list + setting a new key for the InteractionWrapper)
    // as a workaround due to subsurface-viewer's bounding box model not respecting the removal of layers.
    // In case of a field change, the total accumulated bounding box would become very large and homing wouldn't work properly.
    //
    // This is a temporary solution until the subsurface-viewer is updated to handle
    // bounding boxes more correctly.
    //
    // See: https://github.com/equinor/webviz-subsurface-components/pull/2573
    if (prevFieldId !== props.fieldId) {
        setChangingFields(true);
        setPrevFieldId(props.fieldId);
    }

    const finalLayers: Layer<any>[] = [];
    if (changingFields && props.visualizationAssemblerProduct.numLoadingDataProviders === 0) {
        setChangingFields(false);
    }

    if (!changingFields) {
        finalLayers.push(...deckGlLayers);
    }

    // -----------------------------------------------------------------------------

    return (
        <DpfSubsurfaceViewerContext.Provider
            value={{
                ...props,
                bounds: props.visualizationMode === "2D" ? bounds2D : undefined,
            }}
        >
            <InteractionWrapper
                key={`interaction-wrapper-${props.fieldId}`}
                views={views}
                fieldId={props.fieldId}
                layers={finalLayers}
                usedPolylineIds={usedPolylineIds}
            />
        </DpfSubsurfaceViewerContext.Provider>
    );
}

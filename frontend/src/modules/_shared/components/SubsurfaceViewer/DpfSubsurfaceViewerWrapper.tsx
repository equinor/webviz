import React from "react";

import { OrbitView, OrthographicView, type Layer } from "@deck.gl/core";
import type { BoundingBox2D, BoundingBox3D, ViewStateType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { HoverService } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type {
    AssemblerProduct,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { VisualizationItemType } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewportTypeExtended, ViewsTypeExtended } from "@modules/_shared/types/deckgl";

import { PlaceholderLayer } from "../../customDeckGlLayers/PlaceholderLayer";

import { InteractionWrapper } from "./_components/InteractionWrapper";
import { PerformanceRecorder } from "./PerformanceRecorder";
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
    hoverService: HoverService;
    moduleInstanceId: string;
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
    visualizationAssemblerProduct: AssemblerProduct<VisualizationTarget.DECK_GL, any, any>;
    viewContext: ViewContext<any>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    workbenchServices: WorkbenchServices;
    preferredViewLayout: PreferredViewLayout;
    hoverService: HoverService;
    moduleInstanceId: string;
};

export function DpfSubsurfaceViewerWrapper(props: DpfSubsurfaceViewerWrapperProps): React.ReactNode {
    // State to override the camera during benchmark
    const [benchmarkViewState, setBenchmarkViewState] = React.useState<ViewStateType | undefined>(undefined);

    // State to track "real" camera position (even if uncontrolled)
    const [lastKnownViewState, setLastKnownViewState] = React.useState<ViewStateType | undefined>(props.viewState);

    const [changingFields, setChangingFields] = React.useState<boolean>(false);
    const [prevFieldId, setPrevFieldId] = React.useState<string | null>(null);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const usedPolylineIds = props.visualizationAssemblerProduct.accumulatedData.polylineIds;

    const viewports: ViewportTypeExtended[] = [];
    const deckGlLayers: Layer<any>[] = [];
    const globalLayerIds: string[] = ["placeholder", "axes"];

    for (const item of props.visualizationAssemblerProduct.children) {
        if (item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW) {
            const colorScales = item.annotations.filter((el) => "colorScale" in el);
            const layerIds: string[] = [...globalLayerIds];
            for (const child of item.children) {
                if (child.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
                    const layer = child.visualization;
                    layerIds.push(layer.id);
                    if (!deckGlLayers.some((l) => l.id === layer.id)) deckGlLayers.push(layer);
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
        }
    }

    const views: ViewsTypeExtended = { layout: [0, 0], showLabel: false, viewports: viewports };
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

    // Compute a default view state from bounds so benchmark can start immediately
    const defaultViewStateFromBounds = React.useMemo((): ViewStateType | undefined => {
        if (!bounds3D) return undefined;

        const centerX = (bounds3D[0] + bounds3D[3]) / 2;
        const centerY = (bounds3D[1] + bounds3D[4]) / 2;
        const centerZ = (bounds3D[2] + bounds3D[5]) / 2;

        return {
            target: [centerX, centerY, centerZ],
            zoom: -4,
            rotationX: 45,
            rotationOrbit: 0,
            minZoom: -10,
            maxZoom: 20,
        };
    }, [bounds3D]);

    // Initialize lastKnownViewState from bounds when they become available
    React.useEffect(() => {
        if (!lastKnownViewState && defaultViewStateFromBounds) {
            setLastKnownViewState(defaultViewStateFromBounds);
        }
    }, [defaultViewStateFromBounds, lastKnownViewState]);

    deckGlLayers.push(
        new PlaceholderLayer({ id: "placeholder" }),
        new AxesLayer({ id: "axes", bounds: bounds3D, ZIncreasingDownwards: true }),
    );
    deckGlLayers.reverse();

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

    // Determine active view state: benchmark override takes precedence
    const activeViewState = benchmarkViewState || props.viewState;

    // Intercept view state updates from the viewer
    const handleViewStateChange = (newViewState: ViewStateType) => {
        // Always track the latest state so we have a valid start point for benchmark
        setLastKnownViewState(newViewState);

        // If benchmark is running, update the override
        if (benchmarkViewState) {
            setBenchmarkViewState(newViewState);
        }

        // Notify parent
        props.onViewStateChange?.(newViewState);
    };

    return (
        <DpfSubsurfaceViewerContext.Provider
            value={{
                ...props,
                viewState: activeViewState,
                onViewStateChange: handleViewStateChange,
                bounds: props.visualizationMode === "2D" ? bounds2D : undefined,
                moduleInstanceId: props.moduleInstanceId,
                hoverService: props.hoverService,
            }}
        >
            <PerformanceRecorder
                currentViewState={activeViewState || lastKnownViewState}
                onViewStateChange={(vs) => {
                    setBenchmarkViewState(vs);
                    props.onViewStateChange?.(vs);
                }}
                onBenchmarkEnd={() => setBenchmarkViewState(undefined)}
            />

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

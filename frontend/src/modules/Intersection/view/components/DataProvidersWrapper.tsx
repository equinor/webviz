import React from "react";

import { useAtom } from "jotai";

import type { HoverService } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorPaletteType } from "@framework/WorkbenchSettings";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { IntersectionRealizationGridProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { IntersectionSeismicProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/seismicProviders/IntersectionSeismicProvider";
import { type DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { IntersectionView } from "@modules/_shared/DataProviderFramework/groups/implementations/IntersectionView";
import { useVisualizationAssemblerProduct } from "@modules/_shared/DataProviderFramework/hooks/useVisualizationProduct";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { useDrilledWellboreHeadersQuery } from "@modules/_shared/WellBore";
import {
    makeGridColorScaleAnnotation,
    makeSeismicColorScaleAnnotation,
} from "@modules/Intersection/DataProviderFramework/annotations/makeColorScaleAnnotation";
import { makeGridBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeGridBoundingBox";
import { makeSeismicBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeSeismicBoundingBox";
import { makeSurfacesBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeSurfacesBoundingBox";
import { makeSurfacesUncertaintiesBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeSurfacesUncertaintiesBoundingBox";
import { CustomDataProviderType } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { EnsembleWellborePicksProvider } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/EnsembleWellborePicksProvider";
import { RealizationSurfacesProvider } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/RealizationSurfacesProvider";
import { SurfacesPerRealizationValuesProvider } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/SurfacesPerRealizationValuesProvider";
import type { IntersectionInjectedData } from "@modules/Intersection/DataProviderFramework/injectedDataType";
import { createGridLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createGridLayerItemsMaker";
import { createSeismicLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createSeismicLayerItemsMaker";
import { createSurfacesLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createSurfacesLayerItemsMaker";
import { createSurfacesUncertaintiesLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createSurfacesUncertaintiesLayerItemsMaker";
import { createWellborePicksLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createWellborePicksLayerItemsMaker";
import { makeEsvViewDataCollection } from "@modules/Intersection/DataProviderFramework/visualization/makeEsvViewDataCollection";
import type { Interfaces } from "@modules/Intersection/interfaces";
import { MAX_INTERSECTION_VIEWS } from "@modules/Intersection/typesAndEnums";
import type { PreferredViewLayout } from "@modules/Intersection/typesAndEnums";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";

import { viewLinksAtom } from "../atoms/baseAtoms";

import { MultiViewLayout } from "./MultiViewLayout";
import { ViewDataProcessor } from "./ViewDataProcessor";
import { ViewLinkManager, type ViewLink } from "./ViewLinkManager";

export type DataProvidersWrapperProps = {
    dataProviderManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    workbenchServices: WorkbenchServices;
    hoverService: HoverService;
};

export type EsvView = {
    intersection: IntersectionSettingValue | null;
    extensionLength: number | null;
};

export type TargetViewReturnTypes = {
    [GroupType.INTERSECTION_VIEW]: EsvView;

    // Need to specify typing for all existing group-types, otherwise we get a typing error
    [GroupType.VIEW]: Record<string, never>;
    [GroupType.WELL_LOG_TRACK_CONT]: Record<string, never>;
    [GroupType.WELL_LOG_TRACK_DISC]: Record<string, never>;
    [GroupType.WELL_LOG_DIFF_GROUP]: Record<string, never>;
};

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<
    VisualizationTarget.ESV,
    TargetViewReturnTypes,
    IntersectionInjectedData
>();

VISUALIZATION_ASSEMBLER.registerGroupCustomPropsCollector(
    GroupType.INTERSECTION_VIEW,
    IntersectionView,
    makeEsvViewDataCollection,
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    {
        transformToVisualization: createGridLayerItemsMaker,
        transformToBoundingBox: makeGridBoundingBox,
        transformToAnnotations: makeGridColorScaleAnnotation,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_SEISMIC,
    IntersectionSeismicProvider,
    {
        transformToVisualization: createSeismicLayerItemsMaker,
        transformToBoundingBox: makeSeismicBoundingBox,
        transformToAnnotations: makeSeismicColorScaleAnnotation,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.ENSEMBLE_WELLBORE_PICKS,
    EnsembleWellborePicksProvider,
    {
        transformToVisualization: createWellborePicksLayerItemsMaker,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SURFACES,
    RealizationSurfacesProvider,
    {
        transformToVisualization: createSurfacesLayerItemsMaker,
        transformToBoundingBox: makeSurfacesBoundingBox,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.SURFACES_REALIZATIONS_UNCERTAINTY,
    SurfacesPerRealizationValuesProvider,
    {
        transformToVisualization: createSurfacesUncertaintiesLayerItemsMaker,
        transformToBoundingBox: makeSurfacesUncertaintiesBoundingBox,
    },
);

export function DataProvidersWrapper(props: DataProvidersWrapperProps): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);

    const fieldIdentifier = props.dataProviderManager.getGlobalSetting("fieldId");

    const [persistedViewLinks, setPersistedViewLinks] = useAtom(viewLinksAtom);

    // Assemble visualization of providers
    const assemblerProduct = useVisualizationAssemblerProduct(props.dataProviderManager, VISUALIZATION_ASSEMBLER);

    if (assemblerProduct.children.length === 0) {
        statusWriter.addWarning("Create intersection view to visualize");
    }

    // Retrieve error messages from assembler
    for (const error of assemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(error);
    }

    // Set loading status
    const isLoading = assemblerProduct.numLoadingDataProviders > 0;
    statusWriter.setLoading(isLoading);

    // Shared field-level query (same result for all views)
    const wellboreHeadersQuery = useDrilledWellboreHeadersQuery(fieldIdentifier ?? undefined);

    const allIntersectionViews = assemblerProduct.children.filter(
        (child) => child.itemType === VisualizationItemType.GROUP,
    );

    if (allIntersectionViews.length > MAX_INTERSECTION_VIEWS) {
        statusWriter.addWarning(
            `Only ${MAX_INTERSECTION_VIEWS} intersection views can be shown at once. Remove excess views.`,
        );
    }

    const intersectionViews = allIntersectionViews.slice(0, MAX_INTERSECTION_VIEWS);

    const handleViewLinksChange = React.useCallback(
        function handleViewLinksChange(viewLinks: ViewLink[]) {
            setPersistedViewLinks(viewLinks);
        },
        [setPersistedViewLinks],
    );

    if (intersectionViews.length === 0) {
        return null;
    }

    return (
        <ViewLinkManager
            intersectionViews={intersectionViews}
            linkColors={props.workbenchSettings.getSelectedColorPalette(ColorPaletteType.Categorical).getColors()}
            initialViewLinks={persistedViewLinks}
            onViewLinksChange={handleViewLinksChange}
        >
            <MultiViewLayout viewCount={intersectionViews.length} preferredViewLayout={props.preferredViewLayout}>
                {intersectionViews.map((view) => (
                    <ViewDataProcessor
                        key={view.id}
                        view={view}
                        fieldIdentifier={fieldIdentifier}
                        isLoading={isLoading}
                        wellboreHeadersQuery={wellboreHeadersQuery}
                        workbenchSession={props.workbenchSession}
                        workbenchServices={props.workbenchServices}
                        hoverService={props.hoverService}
                        viewContext={props.viewContext}
                    />
                ))}
            </MultiViewLayout>
        </ViewLinkManager>
    );
}

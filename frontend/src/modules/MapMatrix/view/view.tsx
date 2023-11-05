import React from "react";

import { WellBoreTrajectory_api } from "@api";
import { View } from "@deck.gl/core/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { colorTablesObj } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { IconButton } from "@lib/components/IconButton";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { SurfaceAddressFactory } from "@modules/_shared/Surface";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore";
import { SyncedSubsurfaceViewer } from "@modules/_shared/components/SubsurfaceViewer";
import { createSubsurfaceMapColorPalettes } from "@modules/_shared/components/SubsurfaceViewer/utils";
import { Home } from "@mui/icons-material";
import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";
import { ViewFooter } from "@webviz/subsurface-viewer/dist/components/ViewFooter";

import { isEqual } from "lodash";

import { ViewLabel } from "./components/viewLabel";
import { ViewMatrixBuilder } from "./viewMatrixBuilder";

import {
    IndexedSurfaceData,
    IndexedSurfaceDataQueryResults,
    useSurfaceDataSetQueryByAddresses,
} from "../hooks/useSurfaceDataAsPngQuery";
import { State } from "../state";
import { EnsembleStageType, ViewSpecification } from "../types";

export function view({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);

    const viewSpecifications = moduleContext.useStoreValue("viewSpecifications");

    const wellsSpecification = moduleContext.useStoreValue("wellsSpecification");
    const wellBoreAddresses = wellsSpecification.smdaWellBoreAddresses;
    const surfaceAddresses = createSurfaceAddressesFromViewSpecifications(viewSpecifications);
    const firstCaseUuid = viewSpecifications?.[0]?.ensembleIdent?.getCaseUuid() ?? undefined;

    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(firstCaseUuid);
    const surfaceDataSetQueryByAddresses = useSurfaceDataSetQueryByAddresses(surfaceAddresses);

    const statusWriter = useViewStatusWriter(moduleContext);
    statusWriter.setLoading(wellTrajectoriesQuery.isFetching);
    statusWriter.setLoading(surfaceDataSetQueryByAddresses.isFetching);

    const [selectedWell, setSelectedWell] = React.useState<string | null>(null);

    let wellTrajectoryData: WellBoreTrajectory_api[] = [];
    if (wellTrajectoriesQuery.data && !wellTrajectoriesQuery.isFetching) {
        const wellBoreUUids = wellBoreAddresses?.map((well) => well.uuid) ?? [];
        wellTrajectoryData = wellTrajectoriesQuery.data.filter((well) => wellBoreUUids.includes(well.wellbore_uuid));
    }

    const [prevSurfaceDataSetQueryByAddresses, setPrevSurfaceDataSetQueryByAddresses] =
        React.useState<IndexedSurfaceDataQueryResults | null>(null);

    let surfaceDataSet: IndexedSurfaceData[] = [];

    if (
        !surfaceDataSetQueryByAddresses.isFetching &&
        !isEqual(prevSurfaceDataSetQueryByAddresses, surfaceDataSetQueryByAddresses)
    ) {
        setPrevSurfaceDataSetQueryByAddresses(surfaceDataSetQueryByAddresses);
        surfaceDataSet = surfaceDataSetQueryByAddresses.data;
    } else if (prevSurfaceDataSetQueryByAddresses) {
        surfaceDataSet = prevSurfaceDataSetQueryByAddresses.data;
    }

    const colorTables = createSubsurfaceMapColorPalettes();

    const viewMatrixBuilder = new ViewMatrixBuilder(
        viewSpecifications,
        surfaceDataSet,
        wellTrajectoryData,
        wellsSpecification.useFilterTvdAbove ? wellsSpecification.filterTvdAbove : null,
        wellsSpecification.useFilterTvdBelow ? wellsSpecification.filterTvdBelow : null
    );

    viewMatrixBuilder.buildViewMatrix();

    const layers = viewMatrixBuilder.getLayers();
    const bounds = viewMatrixBuilder.getBounds();
    if (bounds && !viewportBounds) {
        setviewPortBounds(bounds);
    }

    const [prevViewLayout, setExistingViews] = React.useState<ViewsType>(
        makeEmptySurfaceViews(surfaceDataSet.length ?? 1)
    );
    const viewLayout = viewMatrixBuilder.getViewLayout();
    if (!isEqual(prevViewLayout, viewLayout)) {
        setExistingViews(viewLayout);
    }
    const viewAnnotationData = viewMatrixBuilder.getViewAnnotationsData();
    const viewAnnotations = viewAnnotationData.map((annotation) =>
        makeViewAnnotation(
            annotation.id,
            annotation.viewSpecification,
            colorTables,
            annotation.colorMin,
            annotation.colorMax
        )
    );

    function handleMouseEvent(e: any) {
        if (e) {
            if (e.type === "click") {
                if (e.wellname) {
                    setSelectedWell(e.wellname);
                } else if (selectedWell) {
                    setSelectedWell(null);
                }
            }
        }
    }

    return (
        <div className="w-full h-full flex">
            <div className="relative w-full h-full  flex-col z-1">
                <SyncedSubsurfaceViewer
                    id={"test"}
                    layers={layers}
                    views={prevViewLayout}
                    colorTables={colorTables}
                    bounds={viewportBounds || undefined}
                    workbenchServices={workbenchServices}
                    moduleContext={moduleContext}
                    // getTooltip={tooltipCallback}
                    // editedData={(editedData:any) => console.log(editedData)}
                    selection={{ well: selectedWell || undefined, selection: undefined }}
                    onMouseEvent={handleMouseEvent}
                >
                    {viewAnnotations}
                </SyncedSubsurfaceViewer>
            </div>
            <div className="flex-col">
                <IconButton size="large" onClick={() => setviewPortBounds(undefined)}>
                    <Home />
                </IconButton>
            </div>
        </div>
    );
}
function makeViewAnnotation(
    id: string,
    viewSpecification: ViewSpecification,
    colorTables: colorTablesObj[],
    colorMin: number,
    colorMax: number
): JSX.Element {
    return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* @ts-expect-error */
        <View key={id} id={id}>
            <>
                <ContinuousLegend
                    id={`legend-${id}`}
                    min={colorMin}
                    max={colorMax}
                    colorName={viewSpecification.colorPaletteId ?? ""}
                    colorTables={colorTables}
                    cssLegendStyles={{ top: "20px", right: "0px", backgroundColor: "transparent" }}
                    legendScaleSize={0.1}
                    legendFontSize={30}
                />
                <ViewFooter>
                    <ViewLabel viewSpecification={viewSpecification} />
                </ViewFooter>
            </>
        </View>
    );
}

function makeEmptySurfaceViews(numSubplots: number): ViewsType {
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);
    const viewPorts: ViewportType[] = [];
    for (let index = 0; index < numSubplots; index++) {
        viewPorts.push({
            id: `${index}view`,
            show3D: false,
            isSync: true,
            layerIds: [`surface-${index}`],
            name: `Surface ${index}`,
        });
    }
    return { layout: [numRows, numColumns], showLabel: true, viewports: viewPorts };
}

function createSurfaceAddressesFromViewSpecifications(
    viewSpecifications: ViewSpecification[]
): Array<SurfaceAddress | null> {
    const surfaceAddresses: Array<SurfaceAddress | null> = [];
    viewSpecifications.forEach((surface) => {
        if (surface.ensembleIdent && surface.surfaceName && surface.surfaceAttribute) {
            const factory = new SurfaceAddressFactory(
                surface.ensembleIdent?.getCaseUuid(),
                surface.ensembleIdent?.getEnsembleName(),
                surface.surfaceName,
                surface.surfaceAttribute,
                surface.surfaceTimeOrInterval
            );
            if (surface.ensembleStage === EnsembleStageType.Realization && surface.realizationNum !== null) {
                const surfaceAddress = factory.createRealizationAddress(surface.realizationNum);
                surfaceAddresses.push(surfaceAddress);
            }
            if (surface.ensembleStage === EnsembleStageType.Statistics) {
                const surfaceAddress = factory.createStatisticalAddress(
                    surface.statisticFunction,
                    surface.realizationNumsStatistics
                );
                surfaceAddresses.push(surfaceAddress);
            }
            if (surface.ensembleStage === EnsembleStageType.Observation) {
                const surfaceAddress = factory.createObservationAddress();
                surfaceAddresses.push(surfaceAddress);
            }
        } else {
            surfaceAddresses.push(null);
        }
    });
    return surfaceAddresses;
}

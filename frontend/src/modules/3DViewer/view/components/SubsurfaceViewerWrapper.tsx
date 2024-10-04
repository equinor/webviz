import React, { useId } from "react";

import { Layer, PickingInfo } from "@deck.gl/core/typed";
import { ColumnLayer, SolidPolygonLayer } from "@deck.gl/layers/typed";
import { IntersectionPolyline, IntersectionPolylineWithoutId } from "@framework/userCreatedItems/IntersectionPolylines";
import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import { Add, FilterCenterFocus, Polyline, Remove } from "@mui/icons-material";
import { LayerPickInfo, ViewStateType } from "@webviz/subsurface-viewer";
import { MapMouseEvent } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { WellsPickInfo } from "@webviz/subsurface-viewer/dist/layers/wells/wellsLayer";

import { Feature } from "geojson";
import { isEqual } from "lodash";

import { PolylineEditingPanel } from "./PolylineEditingPanel";
import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";

import { createContinuousColorScaleForMap } from "../utils/colorTables";

export type BoundingBox3D = {
    xmin: number;
    ymin: number;
    zmin: number;
    xmax: number;
    ymax: number;
    zmax: number;
};

export type BoundingBox2D = {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
};

export type SubsurfaceViewerWrapperProps = {
    ref?: React.ForwardedRef<HTMLDivElement>;
    boundingBox: BoundingBox2D | BoundingBox3D;
    layers: Layer[];
    show3D?: boolean;
    verticalScale?: number;
    colorScale: ColorScaleWithName;
    enableIntersectionPolylineEditing?: boolean;
    onAddIntersectionPolyline?: (intersectionPolyline: IntersectionPolylineWithoutId) => void;
    onIntersectionPolylineChange?: (intersectionPolyline: IntersectionPolyline) => void;
    onIntersectionPolylineEditCancel?: () => void;
    onVerticalScaleChange?: (verticalScale: number) => void;
    intersectionPolyline?: IntersectionPolyline;
    intersectionPolylines?: IntersectionPolyline[];
};

type IntersectionZValues = {
    zMid: number;
    zExtension: number;
};

export function SubsurfaceViewerWrapper(props: SubsurfaceViewerWrapperProps): React.ReactNode {
    const { onVerticalScaleChange } = props;

    const subsurfaceViewerId = useId();

    const [intersectionZValues, setIntersectionZValues] = React.useState<IntersectionZValues | undefined>(undefined);
    const [polylineEditPointsModusActive, setPolylineEditPointsModusActive] = React.useState<boolean>(false);
    const [polylineEditingActive, setPolylineEditingActive] = React.useState<boolean>(false);
    const [currentlyEditedPolyline, setCurrentlyEditedPolyline] = React.useState<number[][]>([]);
    const [selectedPolylinePointIndex, setSelectedPolylinePointIndex] = React.useState<number | null>(null);
    const [hoveredPolylinePointIndex, setHoveredPolylinePointIndex] = React.useState<number | null>(null);
    const [userCameraInteractionActive, setUserCameraInteractionActive] = React.useState<boolean>(true);
    const [hoverPreviewPoint, setHoverPreviewPoint] = React.useState<number[] | null>(null);
    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [layerPickingInfo, setLayerPickingInfo] = React.useState<LayerPickInfo[]>([]);
    const [pointerOver, setPointerOver] = React.useState<boolean>(false);

    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [prevVerticalScale, setPrevVerticalScale] = React.useState<number | undefined>(props.verticalScale);

    if (props.verticalScale !== prevVerticalScale) {
        setPrevVerticalScale(props.verticalScale);
        if (props.verticalScale !== undefined) {
            setVerticalScale(props.verticalScale ?? 1);
        }
    }

    const [prevBoundingBox, setPrevBoundingBox] = React.useState<BoundingBox2D | BoundingBox3D | undefined>(undefined);
    const [prevIntersectionPolyline, setPrevIntersectionPolyline] = React.useState<IntersectionPolyline | undefined>(
        undefined
    );

    const internalRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementSize(internalRef);

    React.useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(props.ref, () => internalRef.current);

    if (!isEqual(props.boundingBox, prevBoundingBox)) {
        setPrevBoundingBox(props.boundingBox);
        let zMid = 0;
        let zExtension = 10;
        if ("zmin" in props.boundingBox && "zmax" in props.boundingBox) {
            zMid = -(props.boundingBox.zmin + (props.boundingBox.zmax - props.boundingBox.zmin) / 2);
            zExtension = Math.abs(props.boundingBox.zmax - props.boundingBox.zmin) + 100;
        }
        setIntersectionZValues({
            zMid,
            zExtension,
        });
    }

    if (!isEqual(props.intersectionPolyline, prevIntersectionPolyline)) {
        setPrevIntersectionPolyline(props.intersectionPolyline);
        if (props.intersectionPolyline) {
            setCurrentlyEditedPolyline(props.intersectionPolyline.points);
            setPolylineEditingActive(true);
            setPolylineEditPointsModusActive(true);
            setSelectedPolylinePointIndex(0);
        } else {
            setPolylineEditingActive(false);
            setPolylineEditPointsModusActive(false);
            setCurrentlyEditedPolyline([]);
            setSelectedPolylinePointIndex(null);
        }
    }

    const layers: Layer[] = [];
    const layerIds: string[] = [];

    if (props.layers) {
        for (const layer of props.layers) {
            layers.push(layer);
            layerIds.push(layer.id);
        }
    }

    function handleHover(pickingInfo: PickingInfo): void {
        if (!polylineEditPointsModusActive) {
            return;
        }
        if (pickingInfo.object && pickingInfo.object.index < currentlyEditedPolyline.length) {
            setHoveredPolylinePointIndex(pickingInfo.object.index);
        } else {
            setHoveredPolylinePointIndex(null);
        }
    }

    function handleClick(pickingInfo: PickingInfo, event: any): void {
        if (!polylineEditPointsModusActive) {
            return;
        }
        if (pickingInfo.object && pickingInfo.object.index < currentlyEditedPolyline.length) {
            setHoverPreviewPoint(null);
            setSelectedPolylinePointIndex(pickingInfo.object.index);
            event.stopPropagation();
            event.handled = true;
        } else {
            setSelectedPolylinePointIndex(null);
        }
    }

    function handleDragStart(): void {
        setHoverPreviewPoint(null);
        setIsDragging(true);
        if (!polylineEditPointsModusActive) {
            return;
        }
        setUserCameraInteractionActive(false);
    }

    function handleDragEnd(): void {
        setIsDragging(false);
        setUserCameraInteractionActive(true);
    }

    function handleDrag(pickingInfo: PickingInfo): void {
        if (!polylineEditPointsModusActive) {
            return;
        }
        if (pickingInfo.object) {
            const index = pickingInfo.object.index;
            if (!pickingInfo.coordinate) {
                return;
            }
            setCurrentlyEditedPolyline((prev) => {
                const newPolyline = prev.reduce((acc, point, i) => {
                    if (i === index && pickingInfo.coordinate) {
                        return [...acc, [pickingInfo.coordinate[0], pickingInfo.coordinate[1]]];
                    }
                    return [...acc, point];
                }, [] as number[][]);

                if (props.onIntersectionPolylineChange) {
                    // props.onIntersectionPolylineChange(newPolyline);
                }
                return newPolyline;
            });
        }
    }

    if (props.enableIntersectionPolylineEditing && polylineEditingActive) {
        const zMid = intersectionZValues?.zMid || 0;
        const zExtension = intersectionZValues?.zExtension || 10;

        const currentlyEditedPolylineData = makePolylineData(
            currentlyEditedPolyline,
            zMid,
            zExtension,
            polylineEditPointsModusActive ? selectedPolylinePointIndex : -1,
            hoveredPolylinePointIndex,
            [255, 255, 255, 255]
        );

        const userPolylinePolygonsData = currentlyEditedPolylineData.polygonData;
        const userPolylineColumnsData = currentlyEditedPolylineData.columnData;

        const userPolylineLineLayer = new SolidPolygonLayer({
            id: "user-polyline-line-layer",
            data: userPolylinePolygonsData,
            getPolygon: (d) => d.polygon,
            getFillColor: (d) => d.color,
            getElevation: zExtension,
            getLineColor: [255, 255, 255],
            getLineWidth: 20,
            lineWidthMinPixels: 1,
            extruded: true,
        });
        layers.push(userPolylineLineLayer);
        layerIds.push(userPolylineLineLayer.id);

        const userPolylinePointLayer = new ColumnLayer({
            id: "user-polyline-point-layer",
            data: userPolylineColumnsData,
            getElevation: zExtension,
            getPosition: (d) => d.centroid,
            getFillColor: (d) => d.color,
            extruded: true,
            radius: 50,
            radiusUnits: "pixels",
            pickable: true,
            onHover: handleHover,
            onClick: handleClick,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDrag: handleDrag,
        });
        layers.push(userPolylinePointLayer);
        layerIds.push(userPolylinePointLayer.id);

        const previewData: { centroid: number[]; color: [number, number, number, number] }[] = [];
        if (hoverPreviewPoint) {
            previewData.push({
                centroid: hoverPreviewPoint,
                color: [255, 255, 255, 100],
            });
        }

        const userPolylineHoverPointLayer = new ColumnLayer({
            id: "user-polyline-hover-point-layer",
            data: previewData,
            getElevation: zExtension,
            getPosition: (d) => d.centroid,
            getFillColor: (d) => d.color,
            extruded: true,
            radius: 50,
            radiusUnits: "pixels",
            pickable: true,
        });
        layers.push(userPolylineHoverPointLayer);
        layerIds.push(userPolylineHoverPointLayer.id);
    }

    function handleMouseClick(event: MapMouseEvent): void {
        if (!polylineEditPointsModusActive) {
            return;
        }

        if (!event.x || !event.y) {
            return;
        }

        // Do not create new polyline point when clicking on an already existing point
        for (const info of event.infos) {
            if ("layer" in info && info.layer?.id === "user-polyline-point-layer") {
                if (info.picked) {
                    return;
                }
            }
        }

        const newPoint = [event.x, event.y];
        setCurrentlyEditedPolyline((prev) => {
            let newPolyline: number[][] = [];
            if (selectedPolylinePointIndex === null || selectedPolylinePointIndex === prev.length - 1) {
                newPolyline = [...prev, newPoint];
                setSelectedPolylinePointIndex(prev.length);
            } else if (selectedPolylinePointIndex === 0) {
                newPolyline = [newPoint, ...prev];
                setSelectedPolylinePointIndex(0);
            } else {
                newPolyline = prev;
            }
            return newPolyline;
        });

        setHoverPreviewPoint(null);
    }

    function handleMouseHover(event: MapMouseEvent): void {
        if (!polylineEditPointsModusActive) {
            setLayerPickingInfo(event.infos);
            setHoverPreviewPoint(null);
            return;
        }

        if (event.x === undefined || event.y === undefined) {
            setHoverPreviewPoint(null);
            return;
        }

        if (
            selectedPolylinePointIndex !== null &&
            selectedPolylinePointIndex !== 0 &&
            selectedPolylinePointIndex !== currentlyEditedPolyline.length - 1
        ) {
            setHoverPreviewPoint(null);
            return;
        }

        setHoverPreviewPoint([event.x, event.y, intersectionZValues?.zMid ?? 0]);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "click") {
            handleMouseClick(event);
            return;
        }
        if (event.type === "hover") {
            handleMouseHover(event);
            return;
        }
    }

    function handlePolylineEditingCancel(): void {
        setPolylineEditingActive(false);
        setPolylineEditPointsModusActive(false);
        setCurrentlyEditedPolyline([]);
        setSelectedPolylinePointIndex(null);
        if (props.onIntersectionPolylineEditCancel) {
            props.onIntersectionPolylineEditCancel();
        }
    }

    function handlePolylineEditingFinish(name: string): void {
        if (props.intersectionPolyline) {
            if (props.onIntersectionPolylineChange && currentlyEditedPolyline.length > 1) {
                props.onIntersectionPolylineChange({
                    ...props.intersectionPolyline,
                    name,
                    points: currentlyEditedPolyline,
                });
            }
        } else {
            if (props.onAddIntersectionPolyline && currentlyEditedPolyline.length > 1) {
                props.onAddIntersectionPolyline({
                    name,
                    points: currentlyEditedPolyline,
                });
            }
            handlePolylineEditingCancel();
        }
    }

    const handleDeleteCurrentlySelectedPoint = React.useCallback(
        function handleDeleteCurrentlySelectedPoint() {
            if (selectedPolylinePointIndex !== null) {
                setSelectedPolylinePointIndex((prev) => (prev === null || prev === 0 ? null : prev - 1));
                setCurrentlyEditedPolyline((prev) => {
                    const newPolyline = prev.filter((_, i) => i !== selectedPolylinePointIndex);
                    return newPolyline;
                });
            }
        },
        [selectedPolylinePointIndex]
    );

    const handleCurrentlySelectedPointChange = React.useCallback(
        function handleCurrentlySelectedPointChange(index: number, value: number) {
            if (selectedPolylinePointIndex !== null) {
                setCurrentlyEditedPolyline((prev) => {
                    const newPolyline = prev.map((point, i) => {
                        if (i === selectedPolylinePointIndex) {
                            const newPoint = [...point];
                            newPoint[index] = value;
                            return newPoint;
                        }
                        return point;
                    });
                    return newPolyline;
                });
            }
        },
        [selectedPolylinePointIndex]
    );

    React.useEffect(() => {
        function handleKeyboardEvent(event: KeyboardEvent) {
            if (!polylineEditPointsModusActive) {
                return;
            }
            if (event.key === "Delete" && selectedPolylinePointIndex !== null) {
                handleDeleteCurrentlySelectedPoint();
            }
        }

        document.addEventListener("keydown", handleKeyboardEvent);

        return () => {
            document.removeEventListener("keydown", handleKeyboardEvent);
        };
    }, [selectedPolylinePointIndex, polylineEditPointsModusActive, handleDeleteCurrentlySelectedPoint]);

    function handleAddPolyline(): void {
        setPolylineEditingActive(true);
        handleFocusTopViewClick();
        setPolylineEditPointsModusActive(true);
        setCurrentlyEditedPolyline([]);
        setSelectedPolylinePointIndex(null);
    }

    function handlePolylineEditingModusChange(active: boolean): void {
        setPolylineEditPointsModusActive(active);
    }

    function handleFocusTopViewClick(): void {
        const targetX = (props.boundingBox.xmin + props.boundingBox.xmax) / 2;
        const targetY = (props.boundingBox.ymin + props.boundingBox.ymax) / 2;
        const targetZ = intersectionZValues?.zMid ?? 0;

        setCameraPositionSetByAction({
            rotationOrbit: 0,
            rotationX: 90,
            target: [targetX, targetY, targetZ],
            zoom: NaN,
        });
    }

    const handleVerticalScaleIncrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = prev + 0.1;
                if (onVerticalScaleChange) {
                    onVerticalScaleChange(newVerticalScale);
                }
                return newVerticalScale;
            });
        },
        [onVerticalScaleChange]
    );

    const handleVerticalScaleDecrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.max(0.1, prev - 0.1);
                if (onVerticalScaleChange) {
                    onVerticalScaleChange(newVerticalScale);
                }
                return newVerticalScale;
            });
        },
        [onVerticalScaleChange]
    );

    function makeTooltip(info: PickingInfo): string | null {
        if (!polylineEditPointsModusActive) {
            if ((info as WellsPickInfo)?.logName) {
                return (info as WellsPickInfo)?.logName;
            } else if (info.layer?.id === "drawing-layer") {
                return (info as LayerPickInfo).propertyValue?.toFixed(2) ?? null;
            }
            const feat = info.object as Feature;
            return feat?.properties?.["name"];
        }

        if (isDragging) {
            return null;
        }

        if (
            selectedPolylinePointIndex !== null &&
            selectedPolylinePointIndex !== 0 &&
            selectedPolylinePointIndex !== currentlyEditedPolyline.length - 1
        ) {
            return null;
        }

        if (!info.coordinate) {
            return null;
        }

        return `x: ${info.coordinate[0].toFixed(2)}, y: ${info.coordinate[1].toFixed(2)}`;
    }

    function makeHelperText(): React.ReactNode {
        if (!props.enableIntersectionPolylineEditing) {
            return null;
        }

        if (!polylineEditPointsModusActive) {
            return null;
        }

        const nodes: React.ReactNode[] = [];

        if (selectedPolylinePointIndex === null) {
            nodes.push("Click on map to add first point to polyline");
        } else if (selectedPolylinePointIndex === currentlyEditedPolyline.length - 1) {
            nodes.push(<div>Click on map to add new point to end of polyline</div>);
            nodes.push(
                <div>
                    Press <KeyboardButton text="Delete" /> to remove selected point
                </div>
            );
        } else if (selectedPolylinePointIndex === 0) {
            nodes.push(<div>Click on map to add new point to start of polyline</div>);
            nodes.push(
                <div>
                    Press <KeyboardButton text="Delete" /> to remove selected point
                </div>
            );
        } else {
            nodes.push(<div>Select either end of polyline to add new point</div>);
            nodes.push(
                <div>
                    Press <KeyboardButton text="Delete" /> to remove selected point
                </div>
            );
        }

        return nodes;
    }

    React.useEffect(function handleMount() {
        if (!internalRef.current) {
            return;
        }

        const internalRefCurrent = internalRef.current;

        function handlePointerEnter() {
            setPointerOver(true);
        }

        function handlePointerLeave() {
            setPointerOver(false);
        }

        internalRefCurrent.addEventListener("pointerenter", handlePointerEnter);
        internalRefCurrent.addEventListener("pointerleave", handlePointerLeave);

        return function handleUnmount() {
            internalRefCurrent.removeEventListener("pointerenter", handlePointerEnter);
            internalRefCurrent.removeEventListener("pointerleave", handlePointerLeave);
        };
    });

    const colorTables = createContinuousColorScaleForMap(props.colorScale);
    const colorScaleWithName = { id: "grid3d", colorScale: props.colorScale };

    return (
        <div ref={internalRef} className="w-full h-full relative overflow-hidden">
            <SubsurfaceViewerToolbar
                visible={
                    props.intersectionPolyline === undefined &&
                    !polylineEditingActive &&
                    props.enableIntersectionPolylineEditing !== undefined
                }
                onAddPolyline={handleAddPolyline}
                onFocusTopView={handleFocusTopViewClick}
                onVerticalScaleIncrease={handleVerticalScaleIncrease}
                onVerticalScaleDecrease={handleVerticalScaleDecrease}
                zFactor={verticalScale}
            />
            <ColorLegendsContainer
                colorScales={[colorScaleWithName]}
                height={divSize.height / 2 - 50}
                position="left"
            />
            <ReadoutBoxWrapper layerPickInfo={layerPickingInfo} visible={pointerOver} verticalScale={verticalScale} />
            {props.enableIntersectionPolylineEditing && polylineEditingActive && (
                <PolylineEditingPanel
                    currentlyEditedPolyline={currentlyEditedPolyline}
                    currentlyEditedPolylineName={props.intersectionPolyline?.name}
                    selectedPolylineIndex={selectedPolylinePointIndex}
                    hoveredPolylineIndex={hoveredPolylinePointIndex}
                    intersectionPolylines={props.intersectionPolylines ?? []}
                    onPolylinePointSelectionChange={setSelectedPolylinePointIndex}
                    onEditingCancel={handlePolylineEditingCancel}
                    onEditingFinish={handlePolylineEditingFinish}
                    onDeleteCurrentlySelectedPoint={handleDeleteCurrentlySelectedPoint}
                    onChangeCurrentlySelectedPoint={handleCurrentlySelectedPointChange}
                    onPolylineEditingModusChange={handlePolylineEditingModusChange}
                />
            )}
            <SubsurfaceViewerWithCameraState
                id={subsurfaceViewerId}
                layers={layers}
                scale={{
                    visible: true,
                    incrementValue: 100,
                    widthPerUnit: 100,
                    cssStyle: {
                        right: 10,
                        top: 10,
                    },
                }}
                coords={{
                    visible: false,
                    multiPicking: true, //polylineEditPointsModusActive,
                    pickDepth: 2, // polylineEditPointsModusActive ? 2 : undefined,
                }}
                colorTables={colorTables}
                onMouseEvent={handleMouseEvent}
                userCameraInteractionActive={userCameraInteractionActive}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                views={{
                    layout: [1, 1],
                    showLabel: false,
                    viewports: [
                        {
                            id: "main",
                            isSync: true,
                            show3D: props.show3D,
                            layerIds,
                        },
                    ],
                }}
                getTooltip={makeTooltip}
                verticalScale={verticalScale}
            />
            <div className="absolute bottom-0 right-0 z-30 bg-white bg-opacity-50 p-2 pointer-events-none">
                {makeHelperText()}
            </div>
        </div>
    );
}

type KeyboardButtonProps = {
    text: string;
};

function KeyboardButton(props: KeyboardButtonProps): React.ReactNode {
    return (
        <span className="bg-gray-200 p-1 m-2 rounded text-sm text-gray-800 border border-gray-400 shadow inline-flex items-center justify-center">
            {props.text}
        </span>
    );
}

type SubsurfaceViewerToolbarProps = {
    visible: boolean;
    zFactor: number;
    onAddPolyline: () => void;
    onFocusTopView: () => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
};

function SubsurfaceViewerToolbar(props: SubsurfaceViewerToolbarProps): React.ReactNode {
    function handleAddPolylineClick() {
        props.onAddPolyline();
    }

    function handleFocusTopViewClick() {
        props.onFocusTopView();
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleIncrease();
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleDecrease();
    }

    if (!props.visible) {
        return null;
    }

    return (
        <div className="absolute left-0 top-0 bg-white p-1 rounded border-gray-300 border shadow z-30 text-sm flex flex-col gap-1 items-center">
            <Button onClick={handleAddPolylineClick} title="Add new custom intersection polyline">
                <Polyline fontSize="inherit" />
            </Button>
            <Button onClick={handleFocusTopViewClick} title="Focus top view">
                <FilterCenterFocus fontSize="inherit" />
            </Button>
            <ToolBarDivider />
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                title="Increase vertical scale"
            >
                <Add fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
            <span title="Vertical scale">{props.zFactor.toFixed(2)}</span>
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                title="Decrease vertical scale"
            >
                <Remove fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
        </div>
    );
}

function ToolBarDivider(): React.ReactNode {
    return <div className="w-full h-[1px] bg-gray-300" />;
}

function makePolylineData(
    polyline: number[][],
    zMid: number,
    zExtension: number,
    selectedPolylineIndex: number | null,
    hoveredPolylineIndex: number | null,
    color: [number, number, number, number]
): {
    polygonData: { polygon: number[][]; color: number[] }[];
    columnData: { index: number; centroid: number[]; color: number[] }[];
} {
    const polygonData: {
        polygon: number[][];
        color: number[];
    }[] = [];

    const columnData: {
        index: number;
        centroid: number[];
        color: number[];
    }[] = [];

    const width = 10;
    for (let i = 0; i < polyline.length; i++) {
        const startPoint = polyline[i];
        const endPoint = polyline[i + 1];

        if (i < polyline.length - 1) {
            const lineVector = [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1], 0];
            const zVector = [0, 0, 1];
            const normalVector = [
                lineVector[1] * zVector[2] - lineVector[2] * zVector[1],
                lineVector[2] * zVector[0] - lineVector[0] * zVector[2],
                lineVector[0] * zVector[1] - lineVector[1] * zVector[0],
            ];
            const normalizedNormalVector = [
                normalVector[0] / Math.sqrt(normalVector[0] ** 2 + normalVector[1] ** 2 + normalVector[2] ** 2),
                normalVector[1] / Math.sqrt(normalVector[0] ** 2 + normalVector[1] ** 2 + normalVector[2] ** 2),
            ];

            const point1 = [
                startPoint[0] - (normalizedNormalVector[0] * width) / 2,
                startPoint[1] - (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const point2 = [
                endPoint[0] - (normalizedNormalVector[0] * width) / 2,
                endPoint[1] - (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const point3 = [
                endPoint[0] + (normalizedNormalVector[0] * width) / 2,
                endPoint[1] + (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const point4 = [
                startPoint[0] + (normalizedNormalVector[0] * width) / 2,
                startPoint[1] + (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const polygon: number[][] = [point1, point2, point3, point4];
            polygonData.push({ polygon, color: [color[0], color[1], color[2], color[3] / 2] });
        }

        let adjustedColor = color;
        if (i === selectedPolylineIndex) {
            if (i === 0 || i === polyline.length - 1) {
                adjustedColor = [0, 255, 0, color[3]];
                if (i === hoveredPolylineIndex) {
                    adjustedColor = [200, 255, 200, color[3]];
                }
            } else {
                adjustedColor = [60, 60, 255, color[3]];
                if (i === hoveredPolylineIndex) {
                    adjustedColor = [120, 120, 255, color[3]];
                }
            }
        } else if (i === hoveredPolylineIndex) {
            adjustedColor = [120, 120, 255, color[3]];
        }
        columnData.push({
            index: i,
            centroid: [startPoint[0], startPoint[1], zMid - zExtension / 2],
            color: adjustedColor,
        });
    }

    return { polygonData, columnData };
}

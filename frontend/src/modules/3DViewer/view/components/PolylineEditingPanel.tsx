import React from "react";

import { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { Button } from "@lib/components/Button";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { ArrowBack, ArrowForward, Delete, Save } from "@mui/icons-material";

export type PolylineEditingPanelProps = {
    currentlyEditedPolyline: number[][];
    currentlyEditedPolylineName?: string;
    selectedPolylineIndex: number | null;
    hoveredPolylineIndex: number | null;
    intersectionPolylines: IntersectionPolyline[];
    onPolylinePointSelectionChange: (index: number | null) => void;
    onPolylineEditingModusChange: (active: boolean) => void;
    onDeleteCurrentlySelectedPoint: () => void;
    onChangeCurrentlySelectedPoint: (index: number, value: number) => void;
    onEditingFinish: (name: string) => void;
    onEditingCancel: () => void;
};

export function PolylineEditingPanel(props: PolylineEditingPanelProps): React.ReactNode {
    const [pointEditingFinished, setPointEditingFinished] = React.useState<boolean>(false);
    const [polylineName, setPolylineName] = React.useState<string>(
        props.currentlyEditedPolylineName ?? makeUniquePolylineName(props.intersectionPolylines)
    );

    function handlePolylinePointSelectionChange(values: string[]): void {
        if (values.length === 0) {
            props.onPolylinePointSelectionChange(null);
        } else {
            props.onPolylinePointSelectionChange(parseInt(values[0], 10));
        }
    }

    function handleFinishEditingClick(): void {
        setPointEditingFinished(true);
        props.onPolylineEditingModusChange(false);
    }

    function handleSaveClick(): void {
        setPointEditingFinished(false);
        props.onEditingFinish(polylineName);
        setPolylineName("");
    }

    function handleCancelClick(): void {
        setPointEditingFinished(false);
        setPolylineName("");
        props.onEditingCancel();
    }

    function handleBackClick(): void {
        setPointEditingFinished(false);
        props.onPolylineEditingModusChange(true);
    }

    function handleNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
        setPolylineName(event.target.value);
    }

    function handleDeleteCurrentlySelectedPoint(): void {
        if (props.selectedPolylineIndex !== null) {
            props.onDeleteCurrentlySelectedPoint();
        }
    }

    function handlePolylineCoordinateChange(index: number, value: number): void {
        if (props.selectedPolylineIndex !== null) {
            props.onChangeCurrentlySelectedPoint(index, value);
        }
    }

    function handleKeyDown(event: React.KeyboardEvent): void {
        event.stopPropagation();
    }

    function makeContent() {
        if (pointEditingFinished) {
            return (
                <Label text="Name">
                    <Input
                        value={polylineName}
                        autoFocus
                        type="text"
                        placeholder="Polyline name"
                        onChange={handleNameChange}
                    />
                </Label>
            );
        }
        return (
            <>
                <div className="flex gap-2">
                    <div className="flex-grow flex flex-col gap-1">
                        <Select
                            value={props.selectedPolylineIndex !== null ? [props.selectedPolylineIndex.toString()] : []}
                            options={makeSelectOptionsFromPoints(props.currentlyEditedPolyline)}
                            onChange={handlePolylinePointSelectionChange}
                            size={5}
                            placeholder="Click on map to set first point"
                        />
                        <div className="flex gap-1">
                            <Label text="X">
                                <Input
                                    value={
                                        props.selectedPolylineIndex !== null
                                            ? props.currentlyEditedPolyline[props.selectedPolylineIndex][0]
                                            : 0
                                    }
                                    type="number"
                                    disabled={props.selectedPolylineIndex === null}
                                    onChange={(event) =>
                                        handlePolylineCoordinateChange(0, parseFloat(event.target.value))
                                    }
                                    onKeyDown={handleKeyDown}
                                />
                            </Label>
                            <Label text="Y">
                                <Input
                                    value={
                                        props.selectedPolylineIndex !== null
                                            ? props.currentlyEditedPolyline[props.selectedPolylineIndex][1]
                                            : 0
                                    }
                                    type="number"
                                    disabled={props.selectedPolylineIndex === null}
                                    onChange={(event) =>
                                        handlePolylineCoordinateChange(1, parseFloat(event.target.value))
                                    }
                                    onKeyDown={handleKeyDown}
                                />
                            </Label>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded bg-slate-50">
                        <IconButton
                            onClick={handleDeleteCurrentlySelectedPoint}
                            disabled={props.selectedPolylineIndex === null}
                            title="Delete currently selected point"
                        >
                            <Delete fontSize="inherit" />
                        </IconButton>
                    </div>
                </div>
            </>
        );
    }

    function makeButtons() {
        if (pointEditingFinished) {
            return (
                <>
                    <Button onClick={handleCancelClick} color="danger">
                        Cancel
                    </Button>
                    <Button onClick={handleBackClick} startIcon={<ArrowBack fontSize="inherit" />}>
                        Back
                    </Button>
                    <Button onClick={handleSaveClick} color="success" startIcon={<Save fontSize="inherit" />}>
                        Save
                    </Button>
                </>
            );
        }
        return (
            <>
                <Button onClick={handleCancelClick} color="danger">
                    Cancel
                </Button>
                <Button
                    onClick={handleFinishEditingClick}
                    disabled={props.currentlyEditedPolyline.length < 2}
                    endIcon={<ArrowForward fontSize="inherit" />}
                >
                    Continue
                </Button>
            </>
        );
    }

    return (
        <div className="w-64 absolute left-0 top-0 z-50 bg-white rounded shadow border border-gray-300 text-sm">
            <div className="bg-slate-300 p-2 font-bold">Polyline editing</div>
            <div className="p-2 h-50">{makeContent()}</div>
            <div className="bg-slate-100 flex items-center justify-between p-1">{makeButtons()}</div>
        </div>
    );
}

function makeStringFromPoint(point: number[]): string {
    return `${point[0].toFixed(2)}, ${point[1].toFixed(2)}`;
}

function makeSelectOptionsFromPoints(points: number[][]): SelectOption[] {
    return points.map((point, index) => ({
        value: index.toString(),
        label: makeStringFromPoint(point),
    }));
}

function makeUniquePolylineName(intersectionPolylines: IntersectionPolyline[]): string {
    const names = intersectionPolylines.map((polyline) => polyline.name);
    let i = 1;
    while (names.includes(`Polyline ${i}`)) {
        i++;
    }
    return `Polyline ${i}`;
}

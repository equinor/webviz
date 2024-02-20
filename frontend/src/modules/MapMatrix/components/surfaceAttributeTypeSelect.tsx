import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SurfaceTimeType } from "@modules/_shared/Surface";

import { SurfaceAttributeType } from "../types";

const SurfaceAttributeTypeToStringMapping = {
    [SurfaceAttributeType.DEPTH_TIME]: "Depth/Time",
    [SurfaceAttributeType.PROPERTY]: "Property",
};
export type SurfaceAttributeTypeSelectProps = {
    onAttributeChange(attributeType: SurfaceAttributeType): void;
    onTimeModeChange(timeMode: SurfaceTimeType): void;
    timeMode: SurfaceTimeType;
    attributeType: SurfaceAttributeType;
};
export const SurfaceAttributeTypeSelect: React.FC<SurfaceAttributeTypeSelectProps> = (props) => {
    function handleTimeModeChange(val: string) {
        props.onTimeModeChange(val as SurfaceTimeType);
    }

    function handleSurfaceAttributeTypeChange(val: string) {
        const newSurfaceAttributeType = val as SurfaceAttributeType;
        if (newSurfaceAttributeType === SurfaceAttributeType.DEPTH_TIME && props.timeMode !== SurfaceTimeType.None) {
            props.onTimeModeChange(SurfaceTimeType.None);
        }
        props.onAttributeChange(newSurfaceAttributeType);
    }
    return (
        <div className="flex mb-2  gap-4 text-sm">
            <div className="flex-grow">
                <Label text="Surface type">
                    <Dropdown
                        options={Object.values(SurfaceAttributeType).map((val: SurfaceAttributeType) => {
                            return { label: SurfaceAttributeTypeToStringMapping[val], value: val };
                        })}
                        onChange={handleSurfaceAttributeTypeChange}
                        value={props.attributeType}
                    />
                </Label>
            </div>
            <Label text="Static / dynamic">
                <Dropdown
                    value={props.timeMode}
                    options={[
                        {
                            value: SurfaceTimeType.None,
                            label: "No time (static)",
                        },
                        { value: SurfaceTimeType.TimePoint, label: "Time point" },
                        { value: SurfaceTimeType.Interval, label: "Time interval" },
                    ]}
                    disabled={props.attributeType === SurfaceAttributeType.DEPTH_TIME}
                    onChange={handleTimeModeChange}
                />
            </Label>
        </div>
    );
};

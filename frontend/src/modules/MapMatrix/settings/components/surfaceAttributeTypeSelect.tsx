import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SurfaceTimeType } from "@modules/_shared/Surface";

import { SurfaceAttributeType } from "../../types";

const SurfaceAttributeTypeToStringMapping = {
    [SurfaceAttributeType.DEPTH_TIME]: "Depth/Time surfaces",
    [SurfaceAttributeType.STATIC_ATTRIBUTE]: "Static attribute maps",
    [SurfaceAttributeType.TIMEPOINT_ATTRIBUTE]: "Time-point attribute maps",
    [SurfaceAttributeType.TIMEINTERVAL_ATTRIBUTE]: "Time-interval attribute maps",
};

export type SurfaceAttributeTypeSelectProps = {
    onAttributeChange(attributeType: SurfaceAttributeType): void;
    onTimeModeChange(timeMode: SurfaceTimeType): void;
    attributeType: SurfaceAttributeType;
};
export const SurfaceAttributeTypeSelect: React.FC<SurfaceAttributeTypeSelectProps> = (props) => {
    function handleSurfaceAttributeTypeChange(val: string) {
        const newSurfaceAttributeType = val as SurfaceAttributeType;
        if (newSurfaceAttributeType === SurfaceAttributeType.DEPTH_TIME) {
            props.onTimeModeChange(SurfaceTimeType.None);
        }
        if (newSurfaceAttributeType === SurfaceAttributeType.STATIC_ATTRIBUTE) {
            props.onTimeModeChange(SurfaceTimeType.None);
        }
        if (newSurfaceAttributeType === SurfaceAttributeType.TIMEPOINT_ATTRIBUTE) {
            props.onTimeModeChange(SurfaceTimeType.TimePoint);
        }
        if (newSurfaceAttributeType === SurfaceAttributeType.TIMEINTERVAL_ATTRIBUTE) {
            props.onTimeModeChange(SurfaceTimeType.Interval);
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
        </div>
    );
};

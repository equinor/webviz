import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { TimeType } from "@modules/_shared/Surface";

const SurfaceAttributeTypeToStringMapping = {
    [SurfaceAttributeType_api.DEPTH]: "Depth surfaces",
    [SurfaceAttributeType_api.TIME]: "Time surfaces",
    [SurfaceAttributeType_api.PROPERTY]: "Extracted grid properties",
    [SurfaceAttributeType_api.SEISMIC]: "Seismic attributes",
    [SurfaceAttributeType_api.THICKNESS]: "Thickness surfaces??",
    [SurfaceAttributeType_api.ISOCHORE]: "Isochores",
    [SurfaceAttributeType_api.FLUID_CONTACT]: "Fluid contacts",
};

export type SurfaceAttributeTypeSelectProps = {
    onAttributeChange(attributeType: SurfaceAttributeType_api): void;
    onTimeModeChange(timeMode: TimeType): void;
    timeMode: TimeType;
    attributeType: SurfaceAttributeType_api;
};
export const SurfaceAttributeTypeSelect: React.FC<SurfaceAttributeTypeSelectProps> = (props) => {
    function handleTimeModeChange(val: string) {
        props.onTimeModeChange(val as TimeType);
    }

    function handleSurfaceAttributeTypeChange(val: string) {
        const newSurfaceAttributeType = val as SurfaceAttributeType_api;
        if (
            (newSurfaceAttributeType === SurfaceAttributeType_api.DEPTH ||
                newSurfaceAttributeType === SurfaceAttributeType_api.TIME) &&
            props.timeMode !== TimeType.None
        ) {
            props.onTimeModeChange(TimeType.None);
        }
        if (newSurfaceAttributeType === SurfaceAttributeType_api.SEISMIC && props.timeMode === TimeType.None) {
            props.onTimeModeChange(TimeType.TimePoint);
        }
        props.onAttributeChange(newSurfaceAttributeType);
    }
    return (
        <div className="flex mb-2  gap-4 text-sm">
            <div className="flex-grow">
                <Label text="Surface type">
                    <Dropdown
                        options={Object.values(SurfaceAttributeType_api).map((val: SurfaceAttributeType_api) => {
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
                            value: TimeType.None,
                            label: "No time (static)",
                            disabled: props.attributeType === SurfaceAttributeType_api.SEISMIC,
                        },
                        { value: TimeType.TimePoint, label: "Time point" },
                        { value: TimeType.Interval, label: "Time interval" },
                    ]}
                    disabled={
                        props.attributeType === SurfaceAttributeType_api.DEPTH ||
                        props.attributeType === SurfaceAttributeType_api.TIME
                    }
                    onChange={handleTimeModeChange}
                />
            </Label>
        </div>
    );
};

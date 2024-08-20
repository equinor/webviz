import React from "react";

import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { IntersectionSettings } from "../../typesAndEnums";

type IntersectionSettingsProps = {
    intersectionSettings: IntersectionSettings;
    onChange: (intersectionSettings: IntersectionSettings) => void;
};

export const IntersectionSettingsSelect: React.FC<IntersectionSettingsProps> = (props) => {
    const handleExtensionChange = (e: any) => {
        const extension = parseInt(e.target.value, 10);
        if (extension >= 10) {
            props.onChange({ ...props.intersectionSettings, extension });
        }
    };
    const handleZScaleChange = (e: any) => {
        const zScale = parseInt(e.target.value, 10);
        if (zScale >= 0) {
            props.onChange({ ...props.intersectionSettings, zScale });
        }
    };
    return (
        <>
            <Label text="Extension">
                <Input type={"number"} value={props.intersectionSettings.extension} onChange={handleExtensionChange} />
            </Label>
            <Label text="Z-scale">
                <Input type={"number"} value={props.intersectionSettings.zScale} onChange={handleZScaleChange} />
            </Label>
        </>
    );
};

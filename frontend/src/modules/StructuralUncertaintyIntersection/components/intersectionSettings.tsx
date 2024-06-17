import React from "react";

import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { IntersectionSettings } from "../types";

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
    return (
        <>
            <Label text="Extension">
                <Input type={"number"} value={props.intersectionSettings.extension} onChange={handleExtensionChange} />
            </Label>
        </>
    );
};

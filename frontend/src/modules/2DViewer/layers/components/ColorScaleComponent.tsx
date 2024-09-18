import React from "react";

import { SortableListItem } from "@lib/components/SortableList";
import { ColorScale as ColorScaleImpl } from "@lib/utils/ColorScale";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";

import { RemoveButton } from "./RemoveButton";

import { ColorScale } from "../ColorScale";

export type ColorScaleComponentProps = {
    colorScale: ColorScale;
};

export function ColorScaleComponent(props: ColorScaleComponentProps): React.ReactNode {
    const workbenchSettings = props.colorScale.getItemDelegate().getLayerManager()?.getWorkbenchSettings();

    function handleColorScaleChange(newColorScale: ColorScaleImpl, areBoundariesUserDefined: boolean): void {
        props.colorScale.setColorScale(newColorScale);
        props.colorScale.setAreBoundariesUserDefined(areBoundariesUserDefined);
    }

    function makeColorScaleSelector(): React.ReactNode {
        if (!workbenchSettings) {
            return "No layer manager set.";
        }

        return (
            <ColorScaleSelector
                workbenchSettings={workbenchSettings}
                colorScale={props.colorScale.getColorScale()}
                onChange={handleColorScaleChange}
                areBoundariesUserDefined={props.colorScale.getAreBoundariesUserDefined()}
            />
        );
    }

    return (
        <SortableListItem
            key={props.colorScale.getItemDelegate().getId()}
            id={props.colorScale.getItemDelegate().getId()}
            title={<span className="font-bold">Color scale</span>}
            endAdornment={<RemoveButton item={props.colorScale} />}
        >
            <div className="p-2 text-sm border">{makeColorScaleSelector()}</div>
        </SortableListItem>
    );
}

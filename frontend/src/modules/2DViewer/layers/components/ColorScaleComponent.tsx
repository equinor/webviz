import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { color_palette } from "@equinor/eds-icons";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { SortableListItem } from "@lib/components/SortableList";
import { ColorScale as ColorScaleImpl } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

import { RemoveButton } from "./RemoveButton";

import { ColorScale } from "../ColorScale";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";

export type ColorScaleComponentProps = {
    colorScale: ColorScale;
};

export function ColorScaleComponent(props: ColorScaleComponentProps): React.ReactNode {
    const workbenchSettings = props.colorScale.getItemDelegate().getLayerManager()?.getWorkbenchSettings();
    const isExpanded = usePublishSubscribeTopicValue(props.colorScale.getItemDelegate(), ItemDelegateTopic.EXPANDED);

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

    function handleToggleExpanded(): void {
        props.colorScale.getItemDelegate().setExpanded(!isExpanded);
    }

    return (
        <SortableListItem
            key={props.colorScale.getItemDelegate().getId()}
            id={props.colorScale.getItemDelegate().getId()}
            title={<span className="font-bold">Color scale</span>}
            startAdornment={
                <div className="flex gap-1 items-center">
                    <DenseIconButton
                        onClick={handleToggleExpanded}
                        title={isExpanded ? "Hide settings" : "Show settings"}
                    >
                        {isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                    </DenseIconButton>
                    <Icon data={color_palette} size={16} />
                </div>
            }
            endAdornment={<RemoveButton item={props.colorScale} />}
        >
            <div className={resolveClassNames("p-2 text-sm border", { hidden: !isExpanded })}>
                {makeColorScaleSelector()}
            </div>
        </SortableListItem>
    );
}

import type React from "react";

import { DragIndicator, Remove } from "@mui/icons-material";

import { IconButton } from "@lib/components/IconButton";
import { SortableList } from "@lib/components/SortableList";

import type { InternalRegularEnsembleSetting } from "../../types";
import { TextInput } from "@lib/newComponents/TextInput";
import { ColorSelect } from "@lib/newComponents/ColorSelect";
import { Button } from "@lib/newComponents/Button";
import { Tooltip } from "@lib/components/Tooltip";

export type RegularEnsembleRowProps = {
    ensembleSetting: InternalRegularEnsembleSetting;
    onUpdate: (newItem: InternalRegularEnsembleSetting) => void;
    onDelete: (item: InternalRegularEnsembleSetting) => void;
};

export function RegularEnsembleRow(props: RegularEnsembleRowProps): React.ReactNode {
    function onColorChange(newColor: string) {
        props.onUpdate({
            ...props.ensembleSetting,
            color: newColor,
        });
    }

    function onNameChange(newName: string) {
        props.onUpdate({
            ...props.ensembleSetting,
            customName: newName || null,
        });
    }

    function onDelete() {
        props.onDelete(props.ensembleSetting);
    }

    return (
        <SortableList.Item
            key={props.ensembleSetting.ensembleIdent.toString()}
            id={props.ensembleSetting.ensembleIdent.toString()}
        >
            <tr className="align-center odd:bg-neutral-canvas hover:bg-accent-hover">
                <td>
                    <SortableList.DragHandle className="flex items-center justify-center">
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </SortableList.DragHandle>
                </td>
                <td className="px-horizontal-xs py-vertical-xs">
                    <ColorSelect size="small" value={props.ensembleSetting.color} onChange={onColorChange} />
                </td>
                <td className="px-horizontal-xs py-vertical-xs">
                    <TextInput
                        size="small"
                        value={props.ensembleSetting.customName ?? ""}
                        placeholder="Give a custom name..."
                        onValueChange={onNameChange}
                    />
                </td>
                <td className="px-horizontal-xs py-vertical-xs">
                    <div className="truncate" title={props.ensembleSetting.caseName}>
                        {props.ensembleSetting.caseName}
                    </div>
                </td>
                <td className="px-horizontal-xs py-vertical-xs">
                    <div className="truncate" title={props.ensembleSetting.ensembleIdent.getEnsembleName()}>
                        {props.ensembleSetting.ensembleIdent.getEnsembleName()}
                    </div>
                </td>
                <td className="px-horizontal-xs py-vertical-xs">
                    <Tooltip title="Remove this ensemble from the list" enterDelay="medium">
                        <Button variant="text" tone="danger" onClick={onDelete} size="small" iconOnly>
                            <Remove fontSize="inherit" />
                        </Button>
                    </Tooltip>
                </td>
            </tr>
        </SortableList.Item>
    );
}

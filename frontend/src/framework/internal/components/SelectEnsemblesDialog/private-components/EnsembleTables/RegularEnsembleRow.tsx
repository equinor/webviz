import type React from "react";

import { DragIndicator, Remove } from "@mui/icons-material";

import { ColorSelect } from "@lib/components/ColorSelect";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { SortableList } from "@lib/components/SortableList";

import type { InternalRegularEnsembleSetting } from "../../types";

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
            <tr className="hover:bg-slate-100 odd:bg-slate-50 align-center">
                <td>
                    <SortableList.DragHandle className="flex justify-center items-center">
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </SortableList.DragHandle>
                </td>
                <td className="p-2">
                    <ColorSelect value={props.ensembleSetting.color} onChange={onColorChange} />
                </td>
                <td className="p-2">
                    <Input
                        value={props.ensembleSetting.customName ?? ""}
                        placeholder="Give a custom name..."
                        onValueChange={onNameChange}
                    />
                </td>
                <td className="p-2">
                    <div className="truncate" title={props.ensembleSetting.caseName}>
                        {props.ensembleSetting.caseName}
                    </div>
                </td>
                <td className="p-2">
                    <div className="truncate" title={props.ensembleSetting.ensembleIdent.getEnsembleName()}>
                        {props.ensembleSetting.ensembleIdent.getEnsembleName()}
                    </div>
                </td>
                <td className="p-2">
                    <IconButton title="Remove ensemble from selection" color="danger" onClick={onDelete}>
                        <Remove fontSize="small" />
                    </IconButton>
                </td>
            </tr>
        </SortableList.Item>
    );
}

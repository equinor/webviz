import type React from "react";

import { Remove } from "@mui/icons-material";

import { ColorSelect } from "@lib/components/ColorSelect";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";

import type { RegularEnsembleItem } from "../types";

export type RegularEnsembleRowProps = {
    ensembleItem: RegularEnsembleItem;
    onUpdate: (newItem: RegularEnsembleItem) => void;
    onDelete: (item: RegularEnsembleItem) => void;
};

export function RegularEnsembleRow(props: RegularEnsembleRowProps): React.ReactNode {
    function onColorChange(newColor: string) {
        props.onUpdate({
            ...props.ensembleItem,
            color: newColor,
        });
    }

    function onNameChange(newName: string) {
        props.onUpdate({
            ...props.ensembleItem,
            customName: newName || null,
        });
    }

    function onDelete() {
        props.onDelete(props.ensembleItem);
    }

    return (
        <tr className="hover:bg-slate-100 odd:bg-slate-50 align-center">
            <td className="p-2">
                <ColorSelect value={props.ensembleItem.color} onChange={onColorChange} />
            </td>
            <td className="p-2">
                <Input
                    value={props.ensembleItem.customName ?? ""}
                    placeholder="Give a custom name..."
                    onValueChange={onNameChange}
                />
            </td>
            <td className="p-2">
                <div className="text-ellipsis overflow-hidden whitespace-nowrap" title={props.ensembleItem.caseName}>
                    {props.ensembleItem.caseName}
                </div>
            </td>
            <td className="p-2">
                <div
                    className="text-ellipsis overflow-hidden whitespace-nowrap"
                    title={props.ensembleItem.ensembleName}
                >
                    {props.ensembleItem.ensembleName}
                </div>
            </td>
            <td className="p-2">
                <IconButton title="Remove ensemble from selection" color="danger" onClick={onDelete}>
                    <Remove fontSize="small" />
                </IconButton>
            </td>
        </tr>
    );
}

import type React from "react";

import { Remove } from "@mui/icons-material";

import { ColorSelect } from "@lib/components/ColorSelect";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";

import type { InternalRegularEnsembleSetting } from "../types";

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
        <tr className="hover:bg-slate-100 odd:bg-slate-50 align-center">
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
                <div className="text-ellipsis overflow-hidden whitespace-nowrap" title={props.ensembleSetting.caseName}>
                    {props.ensembleSetting.caseName}
                </div>
            </td>
            <td className="p-2">
                <div
                    className="text-ellipsis overflow-hidden whitespace-nowrap"
                    title={props.ensembleSetting.ensembleIdent.getEnsembleName()}
                >
                    {props.ensembleSetting.ensembleIdent.getEnsembleName()}
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

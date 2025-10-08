import type React from "react";

import { Remove } from "@mui/icons-material";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColorSelect } from "@lib/components/ColorSelect";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "../types";

export type DeltaEnsembleRowProps = {
    deltaEnsembleSetting: InternalDeltaEnsembleSetting;
    availableRegularEnsembleSettings: InternalRegularEnsembleSetting[];
    isDuplicate: boolean;
    isValid: boolean;
    onUpdate: (newItem: InternalDeltaEnsembleSetting) => void;
    onDelete: (item: InternalDeltaEnsembleSetting) => void;
};

function createEnsembleOptionValue(ensembleIdent: RegularEnsembleIdent): string {
    return ensembleIdent.toString();
}

function getEnsembleFromDropdownValue(value: string): RegularEnsembleIdent {
    return RegularEnsembleIdent.fromString(value);
}

function makeEnsembleDropdownOptions(ensembleItems: InternalRegularEnsembleSetting[]): DropdownOption[] {
    return ensembleItems.map((ens) => ({
        value: createEnsembleOptionValue(ens.ensembleIdent),
        label: ens.customName ?? `${ens.ensembleIdent.getEnsembleName()} (${ens.caseName})`,
    }));
}

export function DeltaEnsembleRow(props: DeltaEnsembleRowProps): React.ReactNode {
    const { comparisonEnsembleIdent, referenceEnsembleIdent } = props.deltaEnsembleSetting;

    const ensembleDropdownItems = makeEnsembleDropdownOptions(props.availableRegularEnsembleSettings);
    const comparisonEnsValue = comparisonEnsembleIdent ? createEnsembleOptionValue(comparisonEnsembleIdent) : undefined;
    const referenceEnsValue = referenceEnsembleIdent ? createEnsembleOptionValue(referenceEnsembleIdent) : undefined;

    function onColorChange(newColor: string) {
        props.onUpdate({
            ...props.deltaEnsembleSetting,
            color: newColor,
        });
    }

    function onNameChange(newName: string) {
        props.onUpdate({
            ...props.deltaEnsembleSetting,
            customName: newName || null,
        });
    }

    function onComparisonEnsembleChange(value: string) {
        const ens = getEnsembleFromDropdownValue(value);

        props.onUpdate({
            ...props.deltaEnsembleSetting,
            comparisonEnsembleIdent: ens,
        });
    }

    function onReferenceEnsembleChange(value: string) {
        const ens = getEnsembleFromDropdownValue(value);

        props.onUpdate({
            ...props.deltaEnsembleSetting,
            referenceEnsembleIdent: ens,
        });
    }

    function onDelete() {
        props.onDelete(props.deltaEnsembleSetting);
    }

    return (
        <tr
            className={resolveClassNames("align-center ", {
                "hover:bg-red-50 odd:bg-red-200 even:bg-red-300": !props.isValid,
                "hover:bg-blue-50 odd:bg-blue-200 even:bg-blue-300": props.isValid && props.isDuplicate,
                "hover:bg-slate-100 odd:bg-slate-50": props.isValid && !props.isDuplicate,
            })}
        >
            <td className="p-2">
                <ColorSelect value={props.deltaEnsembleSetting.color} onChange={onColorChange} />
            </td>
            <td className="p-2">
                <Input
                    value={props.deltaEnsembleSetting.customName ?? ""}
                    placeholder="Give a custom name..."
                    onValueChange={onNameChange}
                />
            </td>
            <td className="p-2">
                <Dropdown
                    value={comparisonEnsValue}
                    options={ensembleDropdownItems}
                    onChange={onComparisonEnsembleChange}
                />
            </td>
            <td className="p-2">
                <Dropdown
                    value={referenceEnsValue}
                    options={ensembleDropdownItems}
                    onChange={onReferenceEnsembleChange}
                />
            </td>
            <td className="p-2">
                <IconButton color="danger" title="Remove delta ensemble from selection" onClick={onDelete}>
                    <Remove fontSize="small" />
                </IconButton>
            </td>
        </tr>
    );
}

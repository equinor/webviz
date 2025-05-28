import type React from "react";

import { Remove } from "@mui/icons-material";

import { ColorSelect } from "@lib/components/ColorSelect";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { BaseEnsembleItem, InternalDeltaEnsembleItem, RegularEnsembleItem } from "../types";

export type DeltaEnsembleRowProps = {
    deltaEnsembleItem: InternalDeltaEnsembleItem;
    availableRegularEnsembles: RegularEnsembleItem[];
    isDuplicate: boolean;
    isValid: boolean;
    onUpdate: (newItem: InternalDeltaEnsembleItem) => void;
    onDelete: (item: InternalDeltaEnsembleItem) => void;
};

const CASE_UUID_ENSEMBLE_NAME_SEPARATOR = "~@@~";

function createEnsembleOptionValue(ensembleItem: BaseEnsembleItem): string {
    return `${ensembleItem.caseUuid}${CASE_UUID_ENSEMBLE_NAME_SEPARATOR}${ensembleItem.ensembleName}`;
}

function getEnsembleFromDropdownValue(value: string): BaseEnsembleItem {
    const [caseUuid, ensembleName] = value.split(CASE_UUID_ENSEMBLE_NAME_SEPARATOR);
    if (!caseUuid || !ensembleName) {
        throw new Error("Invalid caseUuidAndEnsembleNameString");
    }

    return { caseUuid, ensembleName };
}

function makeEnsembleDropdownOptions(ensembleItems: RegularEnsembleItem[]): DropdownOption[] {
    return ensembleItems.map((ens) => ({
        value: createEnsembleOptionValue(ens),
        label: ens.customName ?? `${ens.ensembleName} (${ens.caseName})`,
    }));
}

export function DeltaEnsembleRow(props: DeltaEnsembleRowProps): React.ReactNode {
    const { comparisonEnsemble, referenceEnsemble } = props.deltaEnsembleItem;

    const ensembleDropdownItems = makeEnsembleDropdownOptions(props.availableRegularEnsembles);
    const comparisonEnsValue = comparisonEnsemble ? createEnsembleOptionValue(comparisonEnsemble) : undefined;
    const referenceEnsValue = referenceEnsemble ? createEnsembleOptionValue(referenceEnsemble) : undefined;

    function onColorChange(newColor: string) {
        props.onUpdate({
            ...props.deltaEnsembleItem,
            color: newColor,
        });
    }

    function onNameChange(newName: string) {
        props.onUpdate({
            ...props.deltaEnsembleItem,
            customName: newName || null,
        });
    }

    function onComparisonEnsembleChange(value: string) {
        const ens = getEnsembleFromDropdownValue(value);

        props.onUpdate({
            ...props.deltaEnsembleItem,
            comparisonEnsemble: ens,
        });
    }

    function onReferenceEnsembleChange(value: string) {
        const ens = getEnsembleFromDropdownValue(value);

        props.onUpdate({
            ...props.deltaEnsembleItem,
            referenceEnsemble: ens,
        });
    }

    function onDelete() {
        props.onDelete(props.deltaEnsembleItem);
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
                <ColorSelect value={props.deltaEnsembleItem.color} onChange={onColorChange} />
            </td>
            <td className="p-2">
                <Input
                    placeholder="Give a custom name..."
                    defaultValue={props.deltaEnsembleItem.customName ?? ""}
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

import type React from "react";

import { DragIndicator, FolderOpen, Remove, WarningOutlined } from "@mui/icons-material";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColorSelect } from "@lib/components/ColorSelect";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { SortableList } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { InternalDeltaEnsembleSetting } from "../../types";
import { TextInput } from "@lib/newComponents/TextInput";
import { Combobox } from "@lib/newComponents/Combobox";
import { ComboboxItem } from "@lib/newComponents/Combobox/combobox";

export type RegularEnsembleOption = {
    ensembleIdent: RegularEnsembleIdent;
    caseName: string;
    customName?: string | null;
    adornment?: React.ReactNode;
};

export type DeltaEnsembleRowProps = {
    deltaEnsembleSetting: InternalDeltaEnsembleSetting;
    regularEnsembleOptions: RegularEnsembleOption[];
    isDuplicate: boolean;
    onUpdate: (newItem: InternalDeltaEnsembleSetting) => void;
    onDelete: (item: InternalDeltaEnsembleSetting) => void;
    onRequestOtherComparisonEnsemble: (item: InternalDeltaEnsembleSetting) => void;
    onRequestOtherReferenceEnsemble: (item: InternalDeltaEnsembleSetting) => void;
};

const SELECT_OTHER_VALUE = "__selectOthers__";

function createEnsembleOptionValue(ensembleIdent: RegularEnsembleIdent): string {
    return ensembleIdent.toString();
}

function getEnsembleIdentFromDropdownValue(value: string): RegularEnsembleIdent {
    return RegularEnsembleIdent.fromString(value);
}

function makeDropdownOptions(regularEnsembleOptions: RegularEnsembleOption[]): ComboboxItem<string>[] {
    return regularEnsembleOptions.map((option) => ({
        value: createEnsembleOptionValue(option.ensembleIdent),
        label: option.customName ?? `${option.ensembleIdent.getEnsembleName()} (${option.caseName})`,
    }));
}

export function DeltaEnsembleRow(props: DeltaEnsembleRowProps): React.ReactNode {
    const { comparisonEnsembleIdent, referenceEnsembleIdent } = props.deltaEnsembleSetting;

    const ensembleDropdownOptions = [
        ...makeDropdownOptions(props.regularEnsembleOptions),
        {
            value: SELECT_OTHER_VALUE,
            label: "Select other ensemble...",
        },
    ];

    const comparisonEnsValue = comparisonEnsembleIdent ? createEnsembleOptionValue(comparisonEnsembleIdent) : null;
    const referenceEnsValue = referenceEnsembleIdent ? createEnsembleOptionValue(referenceEnsembleIdent) : null;

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

    function handleComparisonEnsembleChange(value: string | null) {
        if (value === null) {
            return;
        }
        if (value === SELECT_OTHER_VALUE) {
            props.onRequestOtherComparisonEnsemble({
                ...props.deltaEnsembleSetting,
                comparisonEnsembleIdent: null,
                comparisonEnsembleCaseName: null,
            });
            return;
        }

        const ensIdent = getEnsembleIdentFromDropdownValue(value);
        const ensOptions = props.regularEnsembleOptions.find((option) => option.ensembleIdent.equals(ensIdent));
        if (!ensOptions) {
            throw new Error("Selected comparison ensemble not found in regular ensemble options");
        }

        props.onUpdate({
            ...props.deltaEnsembleSetting,
            comparisonEnsembleIdent: ensIdent,
            comparisonEnsembleCaseName: ensOptions.caseName,
        });
    }

    function handleReferenceEnsembleChange(value: string | null) {
        if (value === null) {
            return;
        }
        if (value === SELECT_OTHER_VALUE) {
            props.onRequestOtherReferenceEnsemble({
                ...props.deltaEnsembleSetting,
                referenceEnsembleIdent: null,
                referenceEnsembleCaseName: null,
            });
            return;
        }

        const ensIdent = getEnsembleIdentFromDropdownValue(value);
        const ensOptions = props.regularEnsembleOptions.find((option) => option.ensembleIdent.equals(ensIdent));
        if (!ensOptions) {
            throw new Error("Selected reference ensemble not found in regular ensemble options");
        }

        props.onUpdate({
            ...props.deltaEnsembleSetting,
            referenceEnsembleIdent: ensIdent,
            referenceEnsembleCaseName: ensOptions.caseName,
        });
    }

    function onDelete() {
        props.onDelete(props.deltaEnsembleSetting);
    }

    const isValid =
        !!props.deltaEnsembleSetting.comparisonEnsembleIdent && !!props.deltaEnsembleSetting.referenceEnsembleIdent;

    return (
        <SortableList.Item key={props.deltaEnsembleSetting.uuid} id={props.deltaEnsembleSetting.uuid}>
            <tr
                className={resolveClassNames("align-center hover:bg-slate-100", {
                    "odd:bg-blue-100 even:bg-blue-200": isValid && props.isDuplicate,
                    "odd:bg-slate-50": !props.isDuplicate,
                })}
            >
                <td>
                    <SortableList.DragHandle className="flex items-center justify-center">
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </SortableList.DragHandle>
                </td>
                <td className="p-2">
                    <ColorSelect value={props.deltaEnsembleSetting.color} onChange={onColorChange} />
                </td>
                <td className="p-2">
                    <TextInput
                        value={props.deltaEnsembleSetting.customName ?? ""}
                        placeholder="Give a custom name..."
                        onValueChange={onNameChange}
                    />
                </td>
                <td className="p-2">
                    <Combobox
                        value={comparisonEnsValue ?? ""}
                        placeholder="Select comparison ensemble..."
                        items={ensembleDropdownOptions}
                        onValueChange={handleComparisonEnsembleChange}
                        renderItemAdornment={() => <FolderOpen fontSize="small" />}
                    />
                </td>
                <td className="p-2">
                    <Combobox
                        value={referenceEnsValue ?? ""}
                        placeholder="Select reference ensemble..."
                        items={ensembleDropdownOptions}
                        onValueChange={handleReferenceEnsembleChange}
                        renderItemAdornment={() => <FolderOpen fontSize="small" />}
                    />
                </td>
                <td className="p-2">
                    <div className="flex flex-row">
                        <IconButton color="danger" title="Remove delta ensemble from selection" onClick={onDelete}>
                            <Remove fontSize="small" />
                        </IconButton>
                        {props.isDuplicate && (
                            <IconButton
                                className="ml-2 cursor-help"
                                title="This delta ensemble is a duplicate of another delta ensemble in the selection."
                            >
                                <WarningOutlined fontSize="small" className="text-indigo-600" />
                            </IconButton>
                        )}
                    </div>
                </td>
            </tr>
        </SortableList.Item>
    );
}

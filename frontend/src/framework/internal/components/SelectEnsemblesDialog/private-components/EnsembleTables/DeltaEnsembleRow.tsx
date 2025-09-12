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

function makeDropdownOptions(regularEnsembleOptions: RegularEnsembleOption[]): DropdownOption[] {
    return regularEnsembleOptions.map((option) => ({
        value: createEnsembleOptionValue(option.ensembleIdent),
        label: option.customName ?? `${option.ensembleIdent.getEnsembleName()} (${option.caseName})`,
        adornment: option.adornment,
    }));
}

export function DeltaEnsembleRow(props: DeltaEnsembleRowProps): React.ReactNode {
    const { comparisonEnsembleIdent, referenceEnsembleIdent } = props.deltaEnsembleSetting;

    const ensembleDropdownOptions = [
        ...makeDropdownOptions(props.regularEnsembleOptions),
        {
            value: SELECT_OTHER_VALUE,
            label: "Select other ensemble...",
            adornment: <FolderOpen fontSize="small" />,
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

    function onComparisonEnsembleChange(value: string) {
        if (value === SELECT_OTHER_VALUE) {
            props.onRequestOtherComparisonEnsemble({
                ...props.deltaEnsembleSetting,
                comparisonEnsembleIdent: null,
            });
            return;
        }

        const ens = getEnsembleIdentFromDropdownValue(value);
        props.onUpdate({
            ...props.deltaEnsembleSetting,
            comparisonEnsembleIdent: ens,
        });
    }

    function onReferenceEnsembleChange(value: string) {
        if (value === SELECT_OTHER_VALUE) {
            props.onRequestOtherReferenceEnsemble({
                ...props.deltaEnsembleSetting,
                referenceEnsembleIdent: null,
            });
            return;
        }

        const ens = getEnsembleIdentFromDropdownValue(value);

        props.onUpdate({
            ...props.deltaEnsembleSetting,
            referenceEnsembleIdent: ens,
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
                    <SortableList.DragHandle className="flex justify-center items-center">
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </SortableList.DragHandle>
                </td>
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
                        value={comparisonEnsValue ?? ""}
                        placeholder="Select comparison ensemble..."
                        options={ensembleDropdownOptions}
                        onChange={onComparisonEnsembleChange}
                    />
                </td>
                <td className="p-2">
                    <Dropdown
                        value={referenceEnsValue ?? ""}
                        placeholder="Select reference ensemble..."
                        options={ensembleDropdownOptions}
                        onChange={onReferenceEnsembleChange}
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

import type React from "react";

import { Delete, DragIndicator, FolderOpen } from "@mui/icons-material";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/newComponents/Button";
import { ColorSelect } from "@lib/newComponents/ColorSelect";
import { Combobox } from "@lib/newComponents/Combobox";
import type { ComboboxItem } from "@lib/newComponents/Combobox/types";
import { Field } from "@lib/newComponents/Field";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { SortableList } from "@lib/newComponents/SortableList";
import { Table } from "@lib/newComponents/Table";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";

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

    function handleColorChange(newColor: string) {
        props.onUpdate({
            ...props.deltaEnsembleSetting,
            color: newColor,
        });
    }

    function handleNameChange(newName: string) {
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

    function renderEnsembleIdentAdornment(value: string) {
        if (value === SELECT_OTHER_VALUE) return <FolderOpen fontSize="small" />;

        const ensemble = props.regularEnsembleOptions.find((ens) => ens.ensembleIdent.toString() === value);

        return ensemble?.adornment;
    }

    return (
        <SortableList.Item key={props.deltaEnsembleSetting.uuid} id={props.deltaEnsembleSetting.uuid}>
            <Table.Row>
                <Table.Cell layoutClassName="*:justify-center">
                    <SortableList.DragHandle className="flex items-center justify-center">
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </SortableList.DragHandle>
                </Table.Cell>
                <Table.Cell>
                    <ColorSelect
                        size="small"
                        value={props.deltaEnsembleSetting.color}
                        onValueCommit={handleColorChange}
                    />
                </Table.Cell>
                <Table.Cell>
                    <TextInput
                        size="small"
                        value={props.deltaEnsembleSetting.customName ?? ""}
                        placeholder="Give a custom name..."
                        onValueChange={handleNameChange}
                    />
                </Table.Cell>
                <Table.Cell>
                    <Field.Root
                        validate={() => (!comparisonEnsembleIdent ? "Please select a comparison ensemble" : null)}
                        validationMode="onSubmit"
                        layoutClassName="w-full"
                    >
                        <Combobox
                            size="small"
                            value={comparisonEnsValue ?? ""}
                            placeholder="Select comparison ensemble..."
                            items={ensembleDropdownOptions}
                            onValueChange={handleComparisonEnsembleChange}
                            renderItemAdornment={renderEnsembleIdentAdornment}
                            layoutClassName="w-full"
                        />
                        <FieldCompositions.GenericErrors include={["customError"]} single />
                    </Field.Root>
                </Table.Cell>
                <Table.Cell>
                    <Field.Root
                        validate={() => {
                            if (!referenceEnsembleIdent) return "Please select a reference ensemble";
                            if (props.isDuplicate) return "This delta ensemble is a duplicate";
                            return null;
                        }}
                        validationMode="onSubmit"
                        layoutClassName="w-full"
                    >
                        <Combobox
                            size="small"
                            value={referenceEnsValue ?? ""}
                            placeholder="Select reference ensemble..."
                            items={ensembleDropdownOptions}
                            onValueChange={handleReferenceEnsembleChange}
                            renderItemAdornment={renderEnsembleIdentAdornment}
                            layoutClassName="w-full"
                        />
                        <FieldCompositions.GenericErrors include={["customError"]} single />
                    </Field.Root>
                </Table.Cell>
                <Table.Cell>
                    <div className="flex flex-row">
                        <Tooltip content="Remove delta ensemble from selection">
                            <Button variant="ghost" tone="danger" size="small" iconOnly onClick={onDelete}>
                                <Delete fontSize="inherit" />
                            </Button>
                        </Tooltip>
                    </div>
                </Table.Cell>
            </Table.Row>
        </SortableList.Item>
    );
}

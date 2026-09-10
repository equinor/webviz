import React from "react";

import { Add, Delete } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { NumberInput } from "@lib/components/NumberInput";
import { Table } from "@lib/components/Table";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";

const COST_INPUT_DEBOUNCE_MS = 500;

export type CostProfileEditorProps = {
    value: CostProfileEntry[];
    currency: string;
    onValueChange: (costProfile: CostProfileEntry[]) => void;
};

export function CostProfileEditor(props: CostProfileEditorProps): React.ReactNode {
    const { value, onValueChange } = props;

    const [immediateValue, setImmediateValue] = React.useState<CostProfileEntry[]>(value);
    const [previousValue, setPreviousValue] = React.useState<CostProfileEntry[]>(value);

    const debouncedOnValueChange = useDebouncedFunction(onValueChange, COST_INPUT_DEBOUNCE_MS);

    if (previousValue !== value) {
        setPreviousValue(value);
        setImmediateValue(value);
    }

    function updateProfile(newProfile: CostProfileEntry[]) {
        setImmediateValue(newProfile);
        debouncedOnValueChange(newProfile);
    }

    function handleAddRow() {
        const lastYear = immediateValue.at(-1)?.year;
        const newYear = lastYear !== undefined ? lastYear + 1 : new Date().getUTCFullYear();
        updateProfile([...immediateValue, { year: newYear, capex: 0, opex: 0 }]);
    }

    function handleRemoveRow(index: number) {
        updateProfile(immediateValue.filter((_, i) => i !== index));
    }

    function handleFieldChange(index: number, field: keyof CostProfileEntry, newValue: number | null) {
        updateProfile(immediateValue.map((entry, i) => (i === index ? { ...entry, [field]: newValue ?? 0 } : entry)));
    }

    if (immediateValue.length === 0) {
        return (
            <div className="gap-y-xs flex flex-col items-start">
                <span className="text-sm font-light">No costs defined. CAPEX and OPEX are treated as zero.</span>
                <Button icon={<Add fontSize="inherit" />} variant="outlined" size="small" onClick={handleAddRow}>
                    Add year
                </Button>
            </div>
        );
    }

    return (
        <div className="gap-y-xs flex flex-col items-start">
            <Table.Root size="small" compact maxHeight={220}>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell colKey="year">Year</Table.Cell>
                        <Table.Cell colKey="capex">CAPEX [{props.currency}]</Table.Cell>
                        <Table.Cell colKey="opex">OPEX [{props.currency}]</Table.Cell>
                        <Table.Cell colKey="actions" />
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {immediateValue.map((entry, index) => (
                        <Table.Row key={index}>
                            <Table.Cell>
                                <NumberInput
                                    size="small"
                                    value={entry.year}
                                    min={1900}
                                    max={2200}
                                    onValueChange={(newValue) => handleFieldChange(index, "year", newValue)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <NumberInput
                                    size="small"
                                    value={entry.capex}
                                    onValueChange={(newValue) => handleFieldChange(index, "capex", newValue)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <NumberInput
                                    size="small"
                                    value={entry.opex}
                                    onValueChange={(newValue) => handleFieldChange(index, "opex", newValue)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <Button
                                    size="small"
                                    variant="ghost"
                                    tone="danger"
                                    title="Remove year"
                                    icon={<Delete fontSize="inherit" />}
                                    onClick={() => handleRemoveRow(index)}
                                />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
            <Button icon={<Add fontSize="inherit" />} variant="outlined" size="small" onClick={handleAddRow}>
                Add year
            </Button>
        </div>
    );
}

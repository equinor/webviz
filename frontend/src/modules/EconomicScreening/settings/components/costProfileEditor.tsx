import React from "react";

import { Add, Delete } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { NumberInput } from "@lib/components/NumberInput";
import { Table } from "@lib/components/Table";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import type { CostProfileEntry, EvaluationWindow } from "@modules/EconomicScreening/typesAndEnums";

const COST_INPUT_DEBOUNCE_MS = 500;

type EditableCostProfileEntry = Omit<CostProfileEntry, "year"> & { year: number | null };

export type CostProfileEditorProps = {
    value: CostProfileEntry[];
    currency: string;
    isDelta: boolean;
    evaluationWindow: EvaluationWindow;
    onValueChange: (costProfile: CostProfileEntry[]) => void;
    onValidityChange: (isValid: boolean) => void;
};

export function validateCostProfile(costProfile: EditableCostProfileEntry[], isDelta: boolean): string | null {
    const years = new Set<number>();
    for (const entry of costProfile) {
        if (entry.year === null) {
            return "Enter a calendar year for each cost row.";
        }
        if (!Number.isInteger(entry.year)) {
            return "Each cost year must be a whole calendar year.";
        }
        if (years.has(entry.year)) {
            return "Each calendar year can appear only once.";
        }
        years.add(entry.year);
        if (!isDelta && (entry.capex < 0 || entry.opex < 0)) {
            return "Investment and operating costs must be zero or greater.";
        }
    }
    return null;
}

export function parseCostProfilePaste(
    text: string,
): { entries: EditableCostProfileEntry[] } | { error: string } {
    const rows = text.replaceAll("\r", "").split("\n").filter(Boolean);
    const entries: EditableCostProfileEntry[] = [];

    for (const row of rows) {
        const values = row.split("\t");
        if (values.length !== 3) {
            return { error: "Paste year, investment, and operating cost values in three tab-separated columns." };
        }

        const [yearText, capexText, opexText] = values;
        const year = Number(yearText);
        const capex = capexText.trim() === "" ? 0 : Number(capexText);
        const opex = opexText.trim() === "" ? 0 : Number(opexText);
        if (yearText.trim() === "" || !Number.isInteger(year) || !Number.isFinite(capex) || !Number.isFinite(opex)) {
            return { error: "Each pasted row needs a calendar year and numeric costs." };
        }
        entries.push({ year, capex, opex });
    }

    return { entries };
}

export function getCostYearsOutsideEvaluationWindow(
    costProfile: EditableCostProfileEntry[],
    evaluationWindow: EvaluationWindow,
): number[] {
    return costProfile.flatMap((entry) => {
        if (
            entry.year === null ||
            (evaluationWindow.firstYear === null || entry.year >= evaluationWindow.firstYear) &&
            (evaluationWindow.lastYear === null || entry.year <= evaluationWindow.lastYear)
        ) {
            return [];
        }
        return [entry.year];
    });
}

function costProfilesMatch(
    draft: EditableCostProfileEntry[],
    committed: CostProfileEntry[],
): boolean {
    return (
        draft.length === committed.length &&
        draft.every(
            (entry, index) =>
                entry.year === committed[index].year &&
                entry.capex === committed[index].capex &&
                entry.opex === committed[index].opex,
        )
    );
}

export function CostProfileEditor(props: CostProfileEditorProps): React.ReactNode {
    const { value, onValueChange, onValidityChange, isDelta } = props;

    const [immediateValue, setImmediateValue] = React.useState<EditableCostProfileEntry[]>(value);
    const [previousValue, setPreviousValue] = React.useState<CostProfileEntry[]>(value);
    const [pasteError, setPasteError] = React.useState<string | null>(null);

    const debouncedOnValueChange = useDebouncedFunction(onValueChange, COST_INPUT_DEBOUNCE_MS);

    React.useEffect(() => {
        onValidityChange(
            validateCostProfile(immediateValue, isDelta) === null && costProfilesMatch(immediateValue, value),
        );
    }, [immediateValue, isDelta, onValidityChange, value]);

    if (previousValue !== value) {
        setPreviousValue(value);
        setImmediateValue(value);
    }

    function updateProfile(newProfile: EditableCostProfileEntry[]) {
        setImmediateValue(newProfile);
        setPasteError(null);
        if (validateCostProfile(newProfile, props.isDelta) !== null) {
            debouncedOnValueChange.cancel();
            return;
        }
        debouncedOnValueChange(newProfile as CostProfileEntry[]);
    }

    function handleAddRow() {
        const lastYear = immediateValue.at(-1)?.year;
        const newYear = lastYear !== undefined && lastYear !== null ? lastYear + 1 : new Date().getUTCFullYear();
        updateProfile([...immediateValue, { year: newYear, capex: 0, opex: 0 }]);
    }

    function handleRemoveRow(index: number) {
        updateProfile(immediateValue.filter((_, i) => i !== index));
    }

    function handleFieldChange(index: number, field: keyof CostProfileEntry, newValue: number | null) {
        if (field === "year") {
            updateProfile(
                immediateValue.map((entry, i) =>
                    i === index ? { ...entry, year: newValue === null ? null : Math.round(newValue) } : entry,
                ),
            );
            return;
        }
        updateProfile(immediateValue.map((entry, i) => (i === index ? { ...entry, [field]: newValue ?? 0 } : entry)));
    }

    function handlePaste(event: React.ClipboardEvent, startIndex: number) {
        event.preventDefault();
        const parsed = parseCostProfilePaste(event.clipboardData.getData("text"));
        if ("error" in parsed) {
            setPasteError(parsed.error);
            return;
        }

        const newProfile = [...immediateValue];
        newProfile.splice(startIndex, parsed.entries.length, ...parsed.entries);
        updateProfile(newProfile);
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

    const validationError = validateCostProfile(immediateValue, props.isDelta);
    const excludedCostYears = getCostYearsOutsideEvaluationWindow(immediateValue, props.evaluationWindow);

    return (
        <div className="gap-y-xs flex flex-col items-start">
            {props.isDelta && (
                <span className="text-body-xs text-subtle">Costs are comparison minus reference; negative values are savings.</span>
            )}
            <Table.Root size="small" compact maxHeight={220}>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell colKey="year">Year</Table.Cell>
                        <Table.Cell colKey="capex">
                            {props.isDelta ? "Change in investment" : "Investment (CAPEX)"} [{props.currency}]
                        </Table.Cell>
                        <Table.Cell colKey="opex">
                            {props.isDelta ? "Change in operating cost" : "Operating cost (OPEX)"} [{props.currency}]
                        </Table.Cell>
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
                                    step={1}
                                    onValueChange={(newValue) => handleFieldChange(index, "year", newValue)}
                                    onPaste={(event) => handlePaste(event, index)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <NumberInput
                                    size="small"
                                    value={entry.capex}
                                    min={props.isDelta ? undefined : 0}
                                    onValueChange={(newValue) => handleFieldChange(index, "capex", newValue)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <NumberInput
                                    size="small"
                                    value={entry.opex}
                                    min={props.isDelta ? undefined : 0}
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
            {(pasteError ?? validationError) && (
                <span className="text-body-xs text-danger" role="alert">
                    {pasteError ?? validationError}
                </span>
            )}
            {excludedCostYears.length > 0 && (
                <span className="text-body-xs text-warning" role="status">
                    Costs outside the evaluation window are excluded: {excludedCostYears.join(", ")}.
                </span>
            )}
        </div>
    );
}

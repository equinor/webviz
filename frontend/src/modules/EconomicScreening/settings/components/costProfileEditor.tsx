import React from "react";

import { ContentPaste } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { NumberInput } from "@lib/components/NumberInput";
import { Table } from "@lib/components/Table";
import { TextArea } from "@lib/components/TextArea";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import { hasIncludedNonZeroCost } from "@modules/EconomicScreening/utils/setupReadiness";

const COST_INPUT_DEBOUNCE_MS = 500;

type EditableCostProfileEntry = Omit<CostProfileEntry, "year"> & { year: number | null };

export type CostProfileEditorProps = {
    /** Every stored entry, including entries outside the generated years, which are kept for recovery. */
    value: CostProfileEntry[];
    currency: string;
    isDelta: boolean;
    /** Generated cost years run from the prediction start through the simulation end, inclusive. */
    startYear: number | null;
    endYear: number | null;
    isHorizonLoading?: boolean;
    ensembleKey?: string;
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

export function parseCostProfilePaste(text: string): { entries: EditableCostProfileEntry[] } | { error: string } {
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

/** Pasted rows must name distinct generated years; their order does not matter. */
export function validatePastedCostYears(
    entries: EditableCostProfileEntry[],
    startYear: number,
    endYear: number,
): string | null {
    const years = new Set<number>();
    for (const entry of entries) {
        if (entry.year === null || entry.year < startYear || entry.year > endYear) {
            return `Pasted year ${entry.year ?? ""} is outside the cost years ${startYear}-${endYear}.`;
        }
        if (years.has(entry.year)) {
            return `Pasted year ${entry.year} appears more than once.`;
        }
        years.add(entry.year);
    }
    return null;
}

/** Replaces the entry for a year; an all-zero entry is removed since blank cost cells mean zero. */
export function setCostEntry(costProfile: CostProfileEntry[], entry: CostProfileEntry): CostProfileEntry[] {
    const others = costProfile.filter((existing) => existing.year !== entry.year);
    const updated = entry.capex === 0 && entry.opex === 0 ? others : [...others, entry];
    return updated.sort((first, second) => first.year - second.year);
}

/** Stored entries with a non-zero cost outside the generated years. They are kept, but not used. */
export function getCostYearsOutsideRange(
    costProfile: CostProfileEntry[],
    startYear: number | null,
    endYear: number | null,
): number[] {
    return costProfile
        .filter((entry) => entry.capex !== 0 || entry.opex !== 0)
        .filter((entry) => startYear === null || endYear === null || entry.year < startYear || entry.year > endYear)
        .map((entry) => entry.year)
        .sort((first, second) => first - second);
}

function costProfilesMatch(draft: CostProfileEntry[], committed: CostProfileEntry[]): boolean {
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

function sortedByYear(costProfile: CostProfileEntry[]): CostProfileEntry[] {
    return [...costProfile].sort((first, second) => first.year - second.year);
}

export function CostProfileEditor(props: CostProfileEditorProps): React.ReactNode {
    const { value, onValueChange, onValidityChange, isDelta, startYear, endYear } = props;

    const [immediateValue, setImmediateValue] = React.useState<CostProfileEntry[]>(() => sortedByYear(value));
    const [previousValue, setPreviousValue] = React.useState<CostProfileEntry[]>(value);
    const [pasteError, setPasteError] = React.useState<string | null>(null);
    const [pasteDraft, setPasteDraft] = React.useState<{ text: string; ensembleKey: string | undefined } | null>(null);
    const pasteButtonRef = React.useRef<HTMLButtonElement>(null);

    if (
        pasteDraft &&
        (pasteDraft.ensembleKey !== props.ensembleKey || startYear === null || endYear === null || startYear > endYear)
    ) {
        setPasteDraft(null);
    }

    const debouncedOnValueChange = useDebouncedFunction(onValueChange, COST_INPUT_DEBOUNCE_MS);

    React.useEffect(() => {
        onValidityChange(
            validateCostProfile(immediateValue, isDelta) === null &&
            costProfilesMatch(immediateValue, sortedByYear(value)),
        );
    }, [immediateValue, isDelta, onValidityChange, value]);

    if (previousValue !== value) {
        setPreviousValue(value);
        setImmediateValue(sortedByYear(value));
    }

    function updateProfile(newProfile: CostProfileEntry[]) {
        setImmediateValue(newProfile);
        setPasteError(null);
        if (validateCostProfile(newProfile, isDelta) !== null) {
            debouncedOnValueChange.cancel();
            return;
        }
        debouncedOnValueChange(newProfile);
    }

    function handleCostChange(year: number, field: "capex" | "opex", newValue: number | null) {
        const current = immediateValue.find((entry) => entry.year === year) ?? { year, capex: 0, opex: 0 };
        updateProfile(setCostEntry(immediateValue, { ...current, [field]: newValue ?? 0 }));
    }

    function handlePaste(event: React.ClipboardEvent) {
        const text = event.clipboardData.getData("text");
        if (!text.includes("\t") || startYear === null || endYear === null) {
            return;
        }
        event.preventDefault();
        const parsed = parseCostProfilePaste(text);
        if ("error" in parsed) {
            setPasteError(parsed.error);
            return;
        }
        const yearError = validatePastedCostYears(parsed.entries, startYear, endYear);
        if (yearError) {
            setPasteError(yearError);
            return;
        }
        updateProfile(
            parsed.entries.reduce((profile, entry) => setCostEntry(profile, entry as CostProfileEntry), immediateValue),
        );
    }

    function pastePreview() {
        if (!pasteDraft || pasteDraft.ensembleKey !== props.ensembleKey)
            return { error: "Paste costs for the current ensemble." };
        if (startYear === null || endYear === null || startYear > endYear || props.isHorizonLoading)
            return { error: "Cost years must be available before applying costs." };
        const parsed = parseCostProfilePaste(pasteDraft.text);
        if ("error" in parsed) return parsed;
        if (parsed.entries.length === 0) return { error: "Paste at least one year of costs." };
        const error =
            validatePastedCostYears(parsed.entries, startYear, endYear) ?? validateCostProfile(parsed.entries, isDelta);
        if (error) return { error };
        const updated = parsed.entries.reduce(
            (profile, entry) => setCostEntry(profile, entry as CostProfileEntry),
            immediateValue,
        );
        const scheduleError = validateCostProfile(updated, isDelta);
        return scheduleError ? { error: scheduleError } : { entries: parsed.entries, updated };
    }

    function applyPaste() {
        const preview = pastePreview();
        if ("error" in preview) return;
        debouncedOnValueChange.cancel();
        setImmediateValue(preview.updated);
        setPasteError(null);
        onValueChange(preview.updated);
        setPasteDraft(null);
    }

    const excludedCostYears = getCostYearsOutsideRange(immediateValue, startYear, endYear);
    const excludedNotice = excludedCostYears.length > 0 && (
        <span className="text-body-xs text-warning" role="status">
            {startYear !== null && endYear !== null
                ? `Costs entered for ${excludedCostYears.join(", ")} are outside ${startYear}-${endYear}. They are kept but not used.`
                : `Costs are stored for ${excludedCostYears.join(", ")}. They are kept but not used until cost years are available.`}
        </span>
    );

    if (startYear === null || endYear === null || startYear > endYear) {
        return (
            <div className="gap-y-xs flex flex-col items-start">
                <span className="text-sm font-light">
                    {startYear === null
                        ? "Enter a prediction start year to generate cost years."
                        : props.isHorizonLoading
                            ? "Cost years are generated when the simulation data has loaded."
                            : endYear === null
                                ? "Cost years are unavailable until source coverage establishes the simulation end."
                                : `The prediction start year is after the simulation end (${endYear}).`}
                </span>
                {excludedNotice}
            </div>
        );
    }

    const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
    const entryByYear = new Map(immediateValue.map((entry) => [entry.year, entry]));
    const validationError = validateCostProfile(immediateValue, isDelta);
    const preview = pastePreview();

    return (
        <div className="gap-y-xs flex w-full min-w-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body-xs text-subtle">
                    {isDelta ? "Signed changes; blank is zero." : "Blank is zero."}
                </span>
                <Button
                    ref={pasteButtonRef}
                    variant="ghost"
                    size="small"
                    icon={<ContentPaste />}
                    onClick={() => setPasteDraft({ text: "", ensembleKey: props.ensembleKey })}
                >
                    Paste costs...
                </Button>
            </div>
            <Table.Root
                size="small"
                compact
                fixed
                width="100%"
                maxHeight={260}
                onPaste={handlePaste}
                layoutClassName="[&_input]:text-right [&_th]:whitespace-normal [&_td]:min-w-0"
            >
                <Table.Head>
                    <Table.Row>
                        <Table.Cell colKey="year" widthInPercent={18}>
                            Year
                        </Table.Cell>
                        <Table.Cell colKey="capex">
                            {isDelta ? "Delta CAPEX" : "CAPEX"} [{props.currency}]
                        </Table.Cell>
                        <Table.Cell colKey="opex">
                            {isDelta ? "Delta OPEX" : "OPEX"} [{props.currency}]
                        </Table.Cell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {years.map((year) => {
                        const entry = entryByYear.get(year);
                        return (
                            <Table.Row key={year}>
                                <Table.Cell>
                                    <span className="text-sm tabular-nums">{year}</span>
                                </Table.Cell>
                                <Table.Cell>
                                    <NumberInput
                                        size="small"
                                        layoutClassName="min-w-0"
                                        aria-label={`CAPEX ${year}`}
                                        value={entry?.capex ? entry.capex : null}
                                        placeholder="0"
                                        min={isDelta ? undefined : 0}
                                        showStepButtons={false}
                                        onValueChange={(newValue) => handleCostChange(year, "capex", newValue)}
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <NumberInput
                                        size="small"
                                        layoutClassName="min-w-0"
                                        aria-label={`OPEX ${year}`}
                                        value={entry?.opex ? entry.opex : null}
                                        placeholder="0"
                                        min={isDelta ? undefined : 0}
                                        showStepButtons={false}
                                        onValueChange={(newValue) => handleCostChange(year, "opex", newValue)}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table.Root>
            {(pasteError ?? validationError) && (
                <span className="text-body-xs text-danger" role="alert">
                    {pasteError ?? validationError}
                </span>
            )}
            {!pasteError && !validationError && !hasIncludedNonZeroCost(immediateValue, startYear, endYear) && (
                <span className="text-body-xs text-subtle" role="status">
                    No non-zero costs included.
                </span>
            )}
            {excludedNotice}
            <Dialog.Popup
                open={pasteDraft !== null && pasteDraft.ensembleKey === props.ensembleKey}
                onOpenChange={(open) => {
                    if (!open) setPasteDraft(null);
                }}
                width="min(640px, calc(100vw - 32px))"
                height="min(680px, calc(100vh - 32px))"
                finalFocus={pasteButtonRef}
            >
                <Dialog.Header>
                    <Dialog.Title>Paste costs</Dialog.Title>
                    <Dialog.Close />
                </Dialog.Header>
                <Dialog.Body layoutClassName="min-h-0 grow overflow-y-auto">
                    <div className="flex min-w-0 flex-col gap-3">
                        <Dialog.Description>
                            Paste three tab-separated columns: Year, CAPEX, OPEX. No header row or thousands separators;
                            use plain numeric values. Empty costs are zero.{" "}
                            {isDelta ? "Signed delta costs are allowed." : "Costs must be non-negative."} Amounts are in{" "}
                            {props.currency}.
                        </Dialog.Description>
                        <TextArea
                            aria-label="Year, CAPEX, OPEX rows"
                            rows={5}
                            value={pasteDraft?.text ?? ""}
                            placeholder={`${startYear}\t1000\t200\n${Math.min(startYear + 1, endYear)}\t0\t200`}
                            onChange={(event) =>
                                setPasteDraft({ text: event.target.value, ensembleKey: props.ensembleKey })
                            }
                        />
                        {pasteDraft?.text && "error" in preview && (
                            <span role="alert" className="text-body-xs text-danger">
                                {preview.error}
                            </span>
                        )}
                        {"entries" in preview && (
                            <>
                                <span className="text-body-xs">
                                    Preview: {preview.entries.length} years. Apply replaces both amounts for these
                                    years; other stored years are kept.
                                </span>
                                <Table.Root
                                    size="small"
                                    fixed
                                    width="100%"
                                    maxHeight={220}
                                    aria-label="Cost paste preview"
                                >
                                    <Table.Head>
                                        <Table.Row>
                                            <Table.Cell>Year</Table.Cell>
                                            <Table.Cell>CAPEX [{props.currency}]</Table.Cell>
                                            <Table.Cell>OPEX [{props.currency}]</Table.Cell>
                                        </Table.Row>
                                    </Table.Head>
                                    <Table.Body>
                                        {preview.entries.map((entry) => (
                                            <Table.Row key={entry.year}>
                                                <Table.Cell>{entry.year}</Table.Cell>
                                                <Table.Cell layoutClassName="text-right">{entry.capex}</Table.Cell>
                                                <Table.Cell layoutClassName="text-right">{entry.opex}</Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </>
                        )}
                    </div>
                </Dialog.Body>
                <Dialog.Actions>
                    <Button variant="ghost" onClick={() => setPasteDraft(null)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={!("entries" in preview)}
                        aria-disabled={!("entries" in preview)}
                        onClick={applyPaste}
                    >
                        Apply
                    </Button>
                </Dialog.Actions>
            </Dialog.Popup>
        </div>
    );
}

import React from "react";

import { ContentPaste } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { NumberInput } from "@lib/components/NumberInput";
import { Table } from "@lib/components/Table";
import { TextArea } from "@lib/components/TextArea";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import {
    getCostYearsOutsideRange,
    hasIncludedNonZeroCost,
    parseCostProfilePaste,
    setCostEntry,
    validateCostProfile,
    validatePastedCostYears,
} from "@modules/EconomicScreening/utils/costProfile";
import type { EvaluationHorizonState } from "@modules/EconomicScreening/utils/evaluationHorizon";

const COST_INPUT_DEBOUNCE_MS = 500;

export type CostProfileEditorProps = {
    /** Every stored entry, including entries outside the generated years, which are kept for recovery. */
    value: CostProfileEntry[];
    currency: string;
    isDelta: boolean;
    /** Generated cost years run from the prediction start through the simulation end, inclusive. */
    horizon: EvaluationHorizonState;
    /** The source is loading or refetching; applying pasted costs waits for it. */
    isSourceLoading?: boolean;
    ensembleKey?: string;
    onValueChange: (costProfile: CostProfileEntry[]) => void;
    onValidityChange: (isValid: boolean) => void;
};

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
    const { value, onValueChange, onValidityChange, isDelta, horizon, isSourceLoading } = props;
    // Start after end still names both years in its messages; other non-ready states have no cost years.
    const [startYear, endYear] =
        horizon.status === "READY"
            ? [horizon.horizon.startYear, horizon.horizon.endYear]
            : horizon.status === "START_AFTER_END"
              ? [horizon.startYear, horizon.envelopeEndYear]
              : [null, null];

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
        updateProfile(parsed.entries.reduce((profile, entry) => setCostEntry(profile, entry), immediateValue));
    }

    function pastePreview() {
        if (!pasteDraft || pasteDraft.ensembleKey !== props.ensembleKey)
            return { error: "Paste costs for the current ensemble." };
        if (startYear === null || endYear === null || startYear > endYear || isSourceLoading)
            return { error: "Cost years must be available before applying costs." };
        const parsed = parseCostProfilePaste(pasteDraft.text);
        if ("error" in parsed) return parsed;
        if (parsed.entries.length === 0) return { error: "Paste at least one year of costs." };
        const error =
            validatePastedCostYears(parsed.entries, startYear, endYear) ?? validateCostProfile(parsed.entries, isDelta);
        if (error) return { error };
        const updated = parsed.entries.reduce((profile, entry) => setCostEntry(profile, entry), immediateValue);
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
                    {horizon.status === "NO_START"
                        ? "Enter a prediction start year to generate cost years."
                        : isSourceLoading || horizon.status === "LOADING"
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

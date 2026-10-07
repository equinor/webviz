import { formatHex, oklch } from "culori";

import type { InplaceVolumesTableData_api, InplaceVolumesTableDataPerFluidSelection_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSensitivities, Sensitivity, SensitivityCase } from "@framework/EnsembleSensitivities";
import { SensitivityType } from "@framework/EnsembleSensitivities";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { expandToRegularEnsembleIdents, isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import type { ColorSet } from "@lib/utils/ColorSet";
import { createSensitivityColorMap } from "@modules/_shared/sensitivityColors";

import { encodeSelectorColumn, expandSelectorColumn } from "./selectorColumnUtils";
import { TableOriginKey } from "./types";

export type SensitivityCaseRef = { sensitivityName: string; caseName: string };

export type SensitivitySelection = { ensembleIdent: RegularEnsembleIdent; selectedCases: SensitivityCaseRef[] };

export type SensitivityMode =
    | { kind: "off" }
    | { kind: "active"; ensemble: RegularEnsemble; sensitivities: EnsembleSensitivities }
    | { kind: "blocked" };

export type SensitivityCaseOption = { ref: SensitivityCaseRef; label: string };

export const SENSITIVITY_ENSEMBLE_SELECTION_BLOCKED_MESSAGE =
    "Ensembles with sensitivities can only be analysed one at a time. Select a single ensemble.";

const REAL_COLUMN_NAME = "REAL";
const CASE_LIGHTNESS_STEP = 0.12;
const MAX_CASE_LIGHTNESS = 0.95;

export function makeSensitivityCaseLabel(sensitivity: Sensitivity, caseName: string): string {
    if (sensitivity.type === SensitivityType.MONTECARLO) {
        return sensitivity.name;
    }
    return `${sensitivity.name}:${caseName}`;
}

function getLowestRealization(sensitivityCase: SensitivityCase): number {
    return sensitivityCase.realizations.reduce((lowest, real) => Math.min(lowest, real), Infinity);
}

/** Sensitivities and their cases in design-matrix order (lowest realization first), as the backend order is not stable. */
function getOrderedSensitivityArr(sensitivities: EnsembleSensitivities): Sensitivity[] {
    const byLowestRealization = (a: SensitivityCase, b: SensitivityCase) =>
        getLowestRealization(a) - getLowestRealization(b);
    // Cases are sorted, so the first one holds the sensitivity's lowest realization.
    const lowestOf = (sensitivity: Sensitivity) =>
        sensitivity.cases.length > 0 ? getLowestRealization(sensitivity.cases[0]) : Number.MAX_SAFE_INTEGER;
    return sensitivities
        .getSensitivityArr()
        .map((sensitivity) => ({ ...sensitivity, cases: [...sensitivity.cases].sort(byLowestRealization) }))
        .sort((a, b) => lowestOf(a) - lowestOf(b));
}

/** Null unless the ensemble has more than one case, e.g. a pure Monte Carlo design is not analysed per case. */
export function getMultiCaseSensitivities(sensitivities: EnsembleSensitivities | null): EnsembleSensitivities | null {
    const numCases = sensitivities?.getSensitivityArr().reduce((sum, sens) => sum + sens.cases.length, 0) ?? 0;
    return numCases > 1 ? sensitivities : null;
}

export function getSensitivityCaseRefs(sensitivities: EnsembleSensitivities): SensitivityCaseRef[] {
    return getSensitivityCaseOptions(sensitivities).map((option) => option.ref);
}

export function getSensitivityCaseOptions(sensitivities: EnsembleSensitivities): SensitivityCaseOption[] {
    return getOrderedSensitivityArr(sensitivities).flatMap((sensitivity) =>
        sensitivity.cases.map((sensitivityCase) => ({
            ref: { sensitivityName: sensitivity.name, caseName: sensitivityCase.name },
            label: makeSensitivityCaseLabel(sensitivity, sensitivityCase.name),
        })),
    );
}

export function isSameSensitivityCase(a: SensitivityCaseRef | null, b: SensitivityCaseRef | null): boolean {
    if (a === null || b === null) {
        return a === b;
    }
    return a.sensitivityName === b.sensitivityName && a.caseName === b.caseName;
}

/** Keep the selected cases that are available, in the order of the available list. */
export function filterValidSensitivityCases(
    selected: SensitivityCaseRef[],
    available: SensitivityCaseRef[],
): SensitivityCaseRef[] {
    return available.filter((availableCase) =>
        selected.some((selectedCase) => isSameSensitivityCase(selectedCase, availableCase)),
    );
}

/** Stable string key for a case, e.g. as a select option value. */
export function makeSensitivityCaseKey(ref: SensitivityCaseRef): string {
    return JSON.stringify([ref.sensitivityName, ref.caseName]);
}

export function hasSensitivityCase(sensitivities: EnsembleSensitivities, ref: SensitivityCaseRef): boolean {
    return getSensitivityCaseRefs(sensitivities).some((available) => isSameSensitivityCase(available, ref));
}

export function makeSensitivityCaseLabelForRef(sensitivities: EnsembleSensitivities, ref: SensitivityCaseRef): string {
    const sensitivity = sensitivities.getSensitivityArr().find((sens) => sens.name === ref.sensitivityName);
    return sensitivity ? makeSensitivityCaseLabel(sensitivity, ref.caseName) : `${ref.sensitivityName}:${ref.caseName}`;
}

/** The base case to compare against: `rms_seed`, else `rms`, else the first sensitivity; its first case. */
export function pickDefaultReferenceSensitivityCase(sensitivities: EnsembleSensitivities): SensitivityCaseRef | null {
    const sensitivityArr = getOrderedSensitivityArr(sensitivities);
    const sensitivity =
        sensitivityArr.find((sens) => sens.name === "rms_seed") ??
        sensitivityArr.find((sens) => sens.name === "rms") ??
        sensitivityArr[0];
    const firstCase = sensitivity?.cases[0];
    return sensitivity && firstCase ? { sensitivityName: sensitivity.name, caseName: firstCase.name } : null;
}

/** The first case, in ensemble order, that differs from the reference case. */
export function pickDefaultComparisonSensitivityCase(
    sensitivities: EnsembleSensitivities,
    referenceCase: SensitivityCaseRef | null,
): SensitivityCaseRef | null {
    const refs = getSensitivityCaseRefs(sensitivities);
    return refs.find((ref) => !isSameSensitivityCase(ref, referenceCase)) ?? refs[0] ?? null;
}

function getSelectedCasesInEnsembleOrder(
    sensitivities: EnsembleSensitivities,
    cases: SensitivityCaseRef[],
): { sensitivity: Sensitivity; caseName: string; realizations: number[] }[] {
    const result: { sensitivity: Sensitivity; caseName: string; realizations: number[] }[] = [];
    for (const sensitivity of getOrderedSensitivityArr(sensitivities)) {
        for (const sensitivityCase of sensitivity.cases) {
            const ref = { sensitivityName: sensitivity.name, caseName: sensitivityCase.name };
            if (cases.some((selectedCase) => isSameSensitivityCase(selectedCase, ref))) {
                result.push({
                    sensitivity,
                    caseName: sensitivityCase.name,
                    realizations: sensitivityCase.realizations,
                });
            }
        }
    }
    return result;
}

export function getRealizationsForSensitivityCases(
    sensitivities: EnsembleSensitivities,
    cases: SensitivityCaseRef[],
): number[] {
    const realizations = new Set<number>();
    for (const selectedCase of getSelectedCasesInEnsembleOrder(sensitivities, cases)) {
        for (const realization of selectedCase.realizations) {
            realizations.add(realization);
        }
    }
    return Array.from(realizations).sort((a, b) => a - b);
}

export function makeRealizationToSensitivityCaseLabelMap(
    sensitivities: EnsembleSensitivities,
    cases: SensitivityCaseRef[],
): Map<number, string> {
    const realizationToLabel = new Map<number, string>();
    for (const selectedCase of getSelectedCasesInEnsembleOrder(sensitivities, cases)) {
        const label = makeSensitivityCaseLabel(selectedCase.sensitivity, selectedCase.caseName);
        for (const realization of selectedCase.realizations) {
            if (!realizationToLabel.has(realization)) {
                realizationToLabel.set(realization, label);
            }
        }
    }
    return realizationToLabel;
}

export function makeSensitivityCaseLabelOrder(
    sensitivities: EnsembleSensitivities,
    cases: SensitivityCaseRef[],
): string[] {
    return getSelectedCasesInEnsembleOrder(sensitivities, cases).map((selectedCase) =>
        makeSensitivityCaseLabel(selectedCase.sensitivity, selectedCase.caseName),
    );
}

function addSensitivityColumnToFluidSelection(
    table: InplaceVolumesTableData_api,
    realizationToLabel: ReadonlyMap<number, string>,
): { table: InplaceVolumesTableData_api; numDroppedRows: number } {
    const realColumn = table.selectorColumns.find((column) => column.columnName === REAL_COLUMN_NAME);
    if (table.resultColumns.length === 0 || !realColumn) {
        return { table, numDroppedRows: 0 };
    }

    const realValues = expandSelectorColumn(realColumn);
    const keptRows: number[] = [];
    const labels: string[] = [];
    for (const [row, real] of realValues.entries()) {
        const label = realizationToLabel.get(Number(real));
        if (label !== undefined) {
            keptRows.push(row);
            labels.push(label);
        }
    }

    const numDroppedRows = realValues.length - keptRows.length;
    const sensitivityColumn = encodeSelectorColumn(TableOriginKey.SENSITIVITY, labels);
    if (numDroppedRows === 0) {
        return {
            table: { ...table, selectorColumns: [sensitivityColumn, ...table.selectorColumns] },
            numDroppedRows,
        };
    }

    const selectorColumns = table.selectorColumns.map((column) => {
        const rowValues = expandSelectorColumn(column);
        return encodeSelectorColumn(
            column.columnName,
            keptRows.map((row) => rowValues[row]),
        );
    });
    const resultColumns = table.resultColumns.map((column) => ({
        columnName: column.columnName,
        columnValues: keptRows.map((row) => column.columnValues[row]),
    }));

    return {
        table: {
            fluidSelection: table.fluidSelection,
            selectorColumns: [sensitivityColumn, ...selectorColumns],
            resultColumns,
        },
        numDroppedRows,
    };
}

/**
 * Add a `SENSITIVITY` selector column (first) with the case label of each row's realization.
 * Rows whose realization belongs to no case are dropped. Fluid selections without results are kept as is.
 */
export function addSensitivityColumnToPerRealizationData(
    data: InplaceVolumesTableDataPerFluidSelection_api,
    realizationToLabel: ReadonlyMap<number, string>,
): { data: InplaceVolumesTableDataPerFluidSelection_api; numDroppedRows: number } {
    let numDroppedRows = 0;
    const tableDataPerFluidSelection = data.tableDataPerFluidSelection.map((table) => {
        const result = addSensitivityColumnToFluidSelection(table, realizationToLabel);
        numDroppedRows += result.numDroppedRows;
        return result.table;
    });
    return { data: { tableDataPerFluidSelection }, numDroppedRows };
}

const resultByDataAndLabelMap = new WeakMap<
    InplaceVolumesTableDataPerFluidSelection_api,
    WeakMap<ReadonlyMap<number, string>, ReturnType<typeof addSensitivityColumnToPerRealizationData>>
>();

/** Reuse the result while both input objects are unchanged. Treat the inputs as immutable. */
export function addSensitivityColumnToPerRealizationDataMemoized(
    data: InplaceVolumesTableDataPerFluidSelection_api,
    realizationToLabel: ReadonlyMap<number, string>,
): { data: InplaceVolumesTableDataPerFluidSelection_api; numDroppedRows: number } {
    let resultByLabelMap = resultByDataAndLabelMap.get(data);
    if (!resultByLabelMap) {
        resultByLabelMap = new WeakMap();
        resultByDataAndLabelMap.set(data, resultByLabelMap);
    }

    const cachedResult = resultByLabelMap.get(realizationToLabel);
    if (cachedResult) {
        return cachedResult;
    }

    const result = addSensitivityColumnToPerRealizationData(data, realizationToLabel);
    resultByLabelMap.set(realizationToLabel, result);
    return result;
}

export function resolveSensitivityMode(
    ensembleSet: EnsembleSet,
    selectedEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
): SensitivityMode {
    if (selectedEnsembleIdents.length === 1 && isEnsembleIdentOfType(selectedEnsembleIdents[0], RegularEnsembleIdent)) {
        const ensemble = ensembleSet.findEnsemble(selectedEnsembleIdents[0]);
        const sensitivities = getMultiCaseSensitivities(ensemble?.getSensitivities() ?? null);
        if (ensemble && sensitivities) {
            return { kind: "active", ensemble, sensitivities };
        }
    }

    const anyHasSensitivities = expandToRegularEnsembleIdents(selectedEnsembleIdents).some(
        (ensembleIdent) =>
            getMultiCaseSensitivities(ensembleSet.findEnsemble(ensembleIdent)?.getSensitivities() ?? null) !== null,
    );
    return anyHasSensitivities ? { kind: "blocked" } : { kind: "off" };
}

/** Base colour per sensitivity (shared with the tornado plot); later cases of a sensitivity are lighter. */
export function createSensitivityCaseColorMap(
    sensitivities: EnsembleSensitivities,
    colorSet: ColorSet,
): Map<string, string> {
    const baseColorMap = createSensitivityColorMap(sensitivities.getSensitivityNames().sort(), colorSet);

    const colorMap = new Map<string, string>();
    for (const sensitivity of getOrderedSensitivityArr(sensitivities)) {
        const baseColor = baseColorMap[sensitivity.name];
        const baseOklch = oklch(baseColor);
        for (const [caseIndex, sensitivityCase] of sensitivity.cases.entries()) {
            const label = makeSensitivityCaseLabel(sensitivity, sensitivityCase.name);
            if (caseIndex === 0 || !baseOklch) {
                colorMap.set(label, baseColor);
                continue;
            }
            const delta = caseIndex * CASE_LIGHTNESS_STEP;
            // Darken instead when lightening would push the colour towards white.
            const lightness =
                baseOklch.l + delta <= MAX_CASE_LIGHTNESS ? baseOklch.l + delta : Math.max(0.05, baseOklch.l - delta);
            colorMap.set(label, formatHex({ ...baseOklch, l: lightness }));
        }
    }
    return colorMap;
}

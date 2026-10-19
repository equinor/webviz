import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SensitivityCaseRef } from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { isSameSensitivityCase } from "@modules/_shared/InplaceVolumes/sensitivityUtils";

/** One side of the comparison: a table within an ensemble, restricted to a sensitivity case if any. */
export type WaterfallSource = {
    ensembleIdent: RegularEnsembleIdent;
    tableName: string;
    sensitivityCase: SensitivityCaseRef | null;
};

/**
 * Anything identified by an (ensemble, table, case) source, e.g. fetched table data. Widened to accept
 * `DeltaEnsembleIdent` because `InplaceVolumesStatisticalTableData.ensembleIdent` allows it, even
 * though this module's own sources are always `RegularEnsembleIdent`.
 */
type IdentifiedBySource = {
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent;
    tableName: string;
    sensitivityCase?: SensitivityCaseRef | null;
};

/**
 * Locate the fetched data for a source. Both sides may use the same ensemble with different tables
 * or sensitivity cases, so a source is only identified by all three together.
 */
export function findTableDataForSource<T extends IdentifiedBySource>(
    tablesData: T[],
    source: WaterfallSource,
): T | undefined {
    return tablesData.find(
        (tableData) =>
            tableData.ensembleIdent.equals(source.ensembleIdent) &&
            tableData.tableName === source.tableName &&
            isSameSensitivityCase(tableData.sensitivityCase ?? null, source.sensitivityCase),
    );
}

type SourceLabelParts = { ensembleName: string; tableName: string; caseLabel?: string | null };

/**
 * Endpoint bar labels. The table name is included whenever the two sides use different tables, and
 * a side's sensitivity case whenever it has one, so the endpoints stay distinguishable.
 */
export function makeSourceLabels(
    reference: SourceLabelParts,
    comparison: SourceLabelParts,
): { referenceLabel: string; comparisonLabel: string } {
    const includeTableName = reference.tableName !== comparison.tableName;

    function makeLabel(parts: SourceLabelParts): string {
        let label = includeTableName ? `${parts.ensembleName} · ${parts.tableName}` : parts.ensembleName;
        if (parts.caseLabel) {
            label += ` · ${parts.caseLabel}`;
        }
        return label;
    }

    return { referenceLabel: makeLabel(reference), comparisonLabel: makeLabel(comparison) };
}

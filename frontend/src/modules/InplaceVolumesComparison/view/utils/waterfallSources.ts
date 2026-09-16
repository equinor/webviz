import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

/** One side of the comparison: a table within an ensemble. */
export type WaterfallSource = {
    ensembleIdent: RegularEnsembleIdent;
    tableName: string;
};

/**
 * Anything identified by an (ensemble, table) source, e.g. fetched table data. Widened to accept
 * `DeltaEnsembleIdent` because `InplaceVolumesStatisticalTableData.ensembleIdent` allows it, even
 * though this module's own sources are always `RegularEnsembleIdent`.
 */
type IdentifiedBySource = {
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent;
    tableName: string;
};

/**
 * Locate the fetched data for a source. Both sides may use the same ensemble with different tables,
 * so a source is only identified by the ensemble and table name together.
 */
export function findTableDataForSource<T extends IdentifiedBySource>(
    tablesData: T[],
    source: WaterfallSource,
): T | undefined {
    return tablesData.find(
        (tableData) => tableData.ensembleIdent.equals(source.ensembleIdent) && tableData.tableName === source.tableName,
    );
}

/**
 * Endpoint bar labels. The table name is included whenever the two sides use different tables, so
 * the endpoints stay distinguishable when both sides share an ensemble.
 */
export function makeSourceLabels(
    reference: { ensembleName: string; tableName: string },
    comparison: { ensembleName: string; tableName: string },
): { referenceLabel: string; comparisonLabel: string } {
    if (reference.tableName === comparison.tableName) {
        return { referenceLabel: reference.ensembleName, comparisonLabel: comparison.ensembleName };
    }

    return {
        referenceLabel: `${reference.ensembleName} · ${reference.tableName}`,
        comparisonLabel: `${comparison.ensembleName} · ${comparison.tableName}`,
    };
}

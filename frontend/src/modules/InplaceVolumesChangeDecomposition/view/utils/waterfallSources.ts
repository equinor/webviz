import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

/** One side of the comparison: a table within an ensemble. */
export type WaterfallSource = {
    ensembleIdent: RegularEnsembleIdent;
    tableName: string;
};

type TableDataForSource = {
    ensembleIdent: { equals: (other: RegularEnsembleIdent) => boolean };
    tableName: string;
};

/**
 * Locate the fetched data for a source. Matching on the ensemble alone is not enough: both sides may
 * use the same ensemble with different tables, which would otherwise resolve to the same entry and
 * silently produce a decomposition of a table against itself.
 */
export function findTableDataForSource<T extends TableDataForSource>(
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

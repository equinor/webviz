import { useMemo } from "react";

import { useAtomValue } from "jotai";

import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { InplaceVolumesTable } from "../utils/inplaceVolumesTable";

/**
 * Custom hook to convert aggregated table data queries to a lightweight inplace volumes table
 * Memoizes the conversion to avoid expensive recomputation on every render
 *
 * @returns InplaceVolumesTable instance or null if no data available
 */
export function useInplaceVolumesTable(): InplaceVolumesTable | null {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);

    const inplaceVolumesTable = useMemo(() => {
        if (aggregatedTableDataQueries.tablesData.length === 0) {
            return null;
        }
        return InplaceVolumesTable.fromApiData(aggregatedTableDataQueries.tablesData);
    }, [aggregatedTableDataQueries.tablesData]);

    return inplaceVolumesTable;
}

import { useAtomValue } from "jotai";

import type { SettingAnnotation } from "@lib/components/Setting";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import { commonTableNamesAreMissingAtom, tableNameSetsDifferAtom } from "../atoms/derivedAtoms";
import { selectedTableNameAtom } from "../atoms/persistableFixableAtoms";

/**
 * Persistable/fixable annotations for the table name, and a warning when the selected ensembles' table names differ
 */
export function useSelectedTableNameAnnotations(): SettingAnnotation[] {
    const persistableFixableAnnotations = useMakePersistableFixableAtomAnnotations(selectedTableNameAtom);
    const commonTableNamesAreMissing = useAtomValue(commonTableNamesAreMissingAtom);
    const tableNameSetsDiffer = useAtomValue(tableNameSetsDifferAtom);

    const annotations = [...persistableFixableAnnotations];
    if (tableNameSetsDiffer && !commonTableNamesAreMissing) {
        annotations.push({
            type: "warning",
            message: "Selected ensembles have different relperm table names. Only common names are available.",
        });
    }

    return annotations;
}

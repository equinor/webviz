import { useAtomValue } from "jotai";

import type { SettingsStatusWriter } from "@framework/StatusWriter";
import { propagateQueryErrorToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";
import { propagateWarningsToStatusWriter } from "@modules/_shared/utils/propagateWarningsToStatusWriter";

import { wellCompletionsQueryAtom, wellCompletionsWarningsAtom } from "../atoms/queryAtoms";

export function useMakeSettingsStatusWriterMessages(statusWriter: SettingsStatusWriter) {
    const wellCompletionsQuery = useAtomValue(wellCompletionsQueryAtom);
    const wellCompletionsWarnings = useAtomValue(wellCompletionsWarningsAtom);

    // A disabled query keeps its cached error, which must not be reported for an invalid selection
    if (wellCompletionsQuery.isEnabled) {
        propagateQueryErrorToStatusWriter(wellCompletionsQuery, statusWriter);
        propagateWarningsToStatusWriter(wellCompletionsWarnings, statusWriter);
    }
}

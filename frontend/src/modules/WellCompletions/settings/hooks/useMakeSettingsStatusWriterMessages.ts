import { useAtomValue } from "jotai";

import type { SettingsStatusWriter } from "@framework/StatusWriter";
import { propagateQueryErrorToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";

import { wellCompletionsQueryAtom } from "../atoms/queryAtoms";

export function useMakeSettingsStatusWriterMessages(statusWriter: SettingsStatusWriter) {
    const wellCompletionsQuery = useAtomValue(wellCompletionsQueryAtom);

    propagateQueryErrorToStatusWriter(wellCompletionsQuery, statusWriter);
}

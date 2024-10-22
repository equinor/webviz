import { SettingsStatusWriter } from "@framework/StatusWriter";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue } from "jotai";

import { wellCompletionsQueryAtom } from "../atoms/queryAtoms";

export function useMakeSettingsStatusWriterMessages(statusWriter: SettingsStatusWriter) {
    const wellCompletionsQuery = useAtomValue(wellCompletionsQueryAtom);

    usePropagateApiErrorToStatusWriter(wellCompletionsQuery, statusWriter);
}

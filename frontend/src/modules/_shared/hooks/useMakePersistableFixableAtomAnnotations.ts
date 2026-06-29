import { useAtomValue } from "jotai";

import { Source, type persistableFixableAtom } from "@framework/utils/atomUtils";
import type { SettingAnnotation } from "@lib/components/SettingWrapper";

type PersistableFixableAtom<T> = ReturnType<typeof persistableFixableAtom<T>>;

export function useMakePersistableFixableAtomAnnotations(atom: PersistableFixableAtom<any>): SettingAnnotation[] {
    const { isValidInContext, _source, isLoading, depsHaveError } = useAtomValue(atom);

    if (!isValidInContext && _source && !isLoading && !depsHaveError) {
        switch (_source) {
            case Source.PERSISTENCE:
                return [
                    {
                        type: "error",
                        message: "The persisted value is invalid. Please choose a valid value.",
                    },
                ];
            case Source.TEMPLATE:
                return [
                    {
                        type: "error",
                        message: "The template value is invalid. Please choose a valid value.",
                    },
                ];
            default:
                return [];
        }
    }

    return [];
}

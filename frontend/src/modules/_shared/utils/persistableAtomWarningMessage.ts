import { Source, type persistableFixableAtom } from "@framework/utils/atomUtils";
import type { SettingAnnotation } from "@lib/components/SettingAnnotationsWrapper";
import { useAtomValue } from "jotai";

type PersistableFixableAtom<T> = ReturnType<typeof persistableFixableAtom<T>>;

export function makePersistableAtomWarningMessage(atom: PersistableFixableAtom<any>): SettingAnnotation[] {
    const { isValidInContext, _source } = useAtomValue(atom);

    if (!isValidInContext && _source) {
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

import { Source, type persistableFixableAtom } from "@framework/utils/atomUtils";
import type { SettingAnnotation, SettingWrapperProps } from "@lib/components/SettingWrapper";
import { useAtomValue } from "jotai";

type PersistableFixableAtom<T> = ReturnType<typeof persistableFixableAtom<T>>;

export function useMakeSettingWrapperPropsFromPersistableFixableAtom(
    atom: PersistableFixableAtom<any>,
): Pick<SettingWrapperProps, "annotations" | "errorOverlay" | "loadingOverlay"> {
    const { isValidInContext, _source, isLoading, depsHaveError } = useAtomValue(atom);

    const annotations: SettingAnnotation[] = [];

    if (!isValidInContext && _source) {
        switch (_source) {
            case Source.PERSISTENCE:
                annotations.push({
                    type: "error",
                    message: "The persisted value is invalid. Please choose a valid value.",
                });
                break;
            case Source.TEMPLATE:
                annotations.push({
                    type: "error",
                    message: "The template value is invalid. Please choose a valid value.",
                });
                break;
        }
    }

    return {
        annotations,
        errorOverlay: depsHaveError ? "An error occurred while loading dependencies." : undefined,
        loadingOverlay: isLoading,
    };
}

import { Warning } from "@mui/icons-material";
import { useAtomValue } from "jotai";

import { Source, type persistableFixableAtom } from "@framework/utils/atomUtils";

type PersistableFixableAtom<T> = ReturnType<typeof persistableFixableAtom<T>>;

export type PersistableAtomWarningWrapperProps<T> = {
    atom: PersistableFixableAtom<T>;
    children?: React.ReactNode;
};

export function PersistableAtomWarningWrapper<T>(props: PersistableAtomWarningWrapperProps<T>) {
    const { isValidInContext, _source } = useAtomValue(props.atom);

    let warningMessage: string | null = null;
    if (!isValidInContext && _source) {
        switch (_source) {
            case Source.PERSISTENCE:
                warningMessage = "The persisted value is invalid. Please choose a valid value.";
                break;
            case Source.TEMPLATE:
                warningMessage = "The template value is invalid. Please choose a valid value.";
                break;
            default:
                warningMessage = null;
                break;
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {props.children}
            {!isValidInContext && (
                <div className="text-red-500 flex gap-2 items-center">
                    <Warning fontSize="inherit" />
                    {warningMessage}
                </div>
            )}
        </div>
    );
}

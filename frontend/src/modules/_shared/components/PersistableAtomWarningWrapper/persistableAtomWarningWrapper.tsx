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

    let warningMessage = makePersistableAtomWarningMessage(props.atom);

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

export function makePersistableAtomWarningMessage(atom: PersistableFixableAtom<any>): string | null {
    const { isValidInContext, _source } = useAtomValue(atom);

    if (!isValidInContext && _source) {
        switch (_source) {
            case Source.PERSISTENCE:
                return "The persisted value is invalid. Please choose a valid value.";
            case Source.TEMPLATE:
                return "The template value is invalid. Please choose a valid value.";
            default:
                return null;
        }
    }

    return null;
}

import type { persistableFixableAtom } from "@framework/utils/atomUtils";
import { Warning } from "@mui/icons-material";
import { useAtomValue } from "jotai";

export type PersistableAtomWarningWrapperProps = {
    atom: ReturnType<typeof persistableFixableAtom<any>>;
    children?: React.ReactNode;
};

export function PersistableAtomWarningWrapper(props: PersistableAtomWarningWrapperProps) {
    const { isValidPersistedValue } = useAtomValue(props.atom);

    return (
        <div className="flex flex-col gap-2">
            {props.children}
            {!isValidPersistedValue && (
                <div className="text-red-500 flex gap-2 items-center">
                    <Warning fontSize="inherit" />
                    The persisted value is invalid. Please choose a valid value.
                </div>
            )}
        </div>
    );
}

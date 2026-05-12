import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { persistableFixableAtom } from "@framework/utils/atomUtils";

export const fieldIdentifierAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return (
            value !== null &&
            ensembleSet.getRegularEnsembleArray().some((ens) => ens.getFieldIdentifiers().includes(value))
        );
    },
    fixupFunction: ({ get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return ensembleSet.getRegularEnsembleArray().at(0)?.getFieldIdentifiers().at(0) ?? null;
    },
});

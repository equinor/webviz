import { atom } from "jotai";
import { random, range, sampleSize } from "lodash";

export const alternateColColorsAtom = atom<boolean>(false);
export const allowMultiSelectAtom = atom<boolean>(false);
export const amtOfDataAtom = atom<number>(0);
export const amtOfPendingDataAtom = atom<number>(20);

export const DATA_TAGS = ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6"] as const;

const stableTableDataAtom = atom((get) => {
    const amtOfData = get(amtOfDataAtom);

    return range(0, amtOfData).map((i) => ({
        id: `row-${i}`,
        "col1.1": `Row ${i + 1}, Column 1.1`,
        "col1.2": `Row ${i + 1}, Column 1.2`,
        theNumbers: random(0, 1000),
        theTags: sampleSize(DATA_TAGS, random(3)),
    }));
});

export const tableDataAtom = atom((get) => {
    const stableData = get(stableTableDataAtom);
    const amtOfPendingData = get(amtOfPendingDataAtom);

    return [...stableData, ...range(0, amtOfPendingData).map(() => ({ _pending: true }))];
});

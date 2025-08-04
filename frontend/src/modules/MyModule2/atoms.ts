import { atom } from "jotai";
import { random, range } from "lodash";

export const alternateColColorsAtom = atom<boolean>(false);
export const allowMultiSelectAtom = atom<boolean>(false);
export const amtOfDataAtom = atom<number>(1000);

export const tableDataAtom = atom((get) => {
    const amtOfData = get(amtOfDataAtom);

    return range(1, amtOfData + 1).map((i) => ({
        id: `row-${i}`,
        "col1.1": `Row ${i}, Column 1.1`,
        "col1.2": `Row ${i}, Column 1.2`,
        "col1.3": `Row ${i}, Column 1.3`,
        col3: random(0, 1000),
    }));
});

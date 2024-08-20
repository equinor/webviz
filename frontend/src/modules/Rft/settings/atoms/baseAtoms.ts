import { RftWellAddress } from "@modules/Rft/typesAndEnums";

import { atom } from "jotai";

export const rftWellAddressAtom = atom<RftWellAddress | null>(null);

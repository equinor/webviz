import { Frequency_api } from "@api";

import { atom } from "jotai";

export const resampleFrequencyAtom = atom<Frequency_api | null>(null);

export const atomDefinitions = [{ name: "resampleFrequency", atom: resampleFrequencyAtom }];

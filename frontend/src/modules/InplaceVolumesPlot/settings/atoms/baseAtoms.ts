import { atom } from "jotai";

import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

export const selectedPlotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);

export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);

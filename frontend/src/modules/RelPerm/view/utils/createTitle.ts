import { CurveType, GroupBy } from "../../typesAndEnums";

const CURVE_TYPE_TITLE: Record<CurveType, string> = {
    [CurveType.RELPERM]: "Relative permeability",
    [CurveType.CAPILLARY_PRESSURE]: "Capillary pressure",
};

const GROUP_BY_TITLE: Record<GroupBy, string> = {
    [GroupBy.NONE]: "",
    [GroupBy.ENSEMBLE]: " per Ensemble",
    [GroupBy.SATNUM]: " per SATNUM",
};

export function makeRelPermPlotTitle(curveType: CurveType, curveNames: string[], groupBy: GroupBy): string {
    const curveTypeTitle = CURVE_TYPE_TITLE[curveType];
    const curveNamesTitle = curveNames.length > 0 ? `: ${curveNames.join(", ")}` : "";
    return `${curveTypeTitle}${curveNamesTitle}${GROUP_BY_TITLE[groupBy]}`;
}
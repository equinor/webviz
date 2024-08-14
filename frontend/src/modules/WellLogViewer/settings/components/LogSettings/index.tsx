import React from "react";

import { WellboreLogCurveHeader_api } from "@api";
import { SettingsStatusWriter } from "@framework/StatusWriter";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue, useSetAtom } from "jotai";

import { WellLogSelect } from "./WellLogSelect";

import { userSelectedWellLogCurveNamesAtom, userSelectedWellLogNameAtom } from "../../atoms/baseAtoms";
import { availableLogCurvesAtom, selectedLogNameAtom } from "../../atoms/derivedAtoms";
import { wellLogCurveHeadersQueryAtom } from "../../atoms/queryAtoms";

export type LogSettingsProps = {
    statusWriter: SettingsStatusWriter;
};

export function LogSettings(props: LogSettingsProps): React.ReactNode {
    // Log name selection
    const wellLogCurveHeaders = useAtomValue(wellLogCurveHeadersQueryAtom);

    const selectedWellLogName = useAtomValue(selectedLogNameAtom);
    const setSelectedWellLogName = useSetAtom(userSelectedWellLogNameAtom);

    function handleWellLogSelectionChange(newValue: string | null) {
        setSelectedWellLogName(newValue);
        setSelectedCurveNames([]);
    }

    const setSelectedCurveNames = useSetAtom(userSelectedWellLogCurveNamesAtom);

    // TODO: Use drag-sortable component, once that's merged
    const availableLogCurves = useAtomValue(availableLogCurvesAtom);

    const selectedLogCurves = useAtomValue(userSelectedWellLogCurveNamesAtom);
    const setSelectedLogCurves = useSetAtom(userSelectedWellLogCurveNamesAtom);

    const curveHeadersErrorStatus = usePropagateApiErrorToStatusWriter(wellLogCurveHeaders, props.statusWriter) ?? "";

    return (
        <>
            <PendingWrapper isPending={wellLogCurveHeaders.isFetching} errorMessage={curveHeadersErrorStatus}>
                <WellLogSelect
                    value={selectedWellLogName}
                    logCurveHeaders={wellLogCurveHeaders?.data ?? []}
                    onChange={handleWellLogSelectionChange}
                    size={5}
                />
            </PendingWrapper>

            {selectedWellLogName && (
                <Label text="Curves">
                    <Select
                        options={makeCurveOptions(availableLogCurves)}
                        value={selectedLogCurves}
                        onChange={setSelectedLogCurves}
                        multiple={true}
                        size={Math.min(availableLogCurves.length, 10)}
                    />
                </Label>
            )}
        </>
    );
}

function makeCurveOptions(curves: WellboreLogCurveHeader_api[]): SelectOption[] {
    return curves.map((curve) => ({
        value: curve.curveName,
        label: curve.curveName,
    }));
}

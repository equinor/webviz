import React from "react";

import { Paragraph } from "@lib/newComponents/Typography/compositions";
import { pluralize } from "@lib/utils/strings";

import { calcNumberOfUniqueRealizations, type RealizationNumberLimits } from "./_utils";

export type PickedRealizationCounterProps = {
    rangeValues: readonly string[];
    realizationNumberLimits: RealizationNumberLimits;
};

export function PickedRealizationCounter(props: PickedRealizationCounterProps): React.ReactNode {
    const numSelectedRealizations = React.useMemo(
        () => calcNumberOfUniqueRealizations(props.rangeValues, props.realizationNumberLimits),
        [props.rangeValues, props.realizationNumberLimits],
    );

    return (
        <Paragraph size="sm" tone="neutral" variant="subtle" layoutClassName="text-right opacity-75 mr-horizontal-3xs">
            {pluralize("realization", numSelectedRealizations)} selected
        </Paragraph>
    );
}

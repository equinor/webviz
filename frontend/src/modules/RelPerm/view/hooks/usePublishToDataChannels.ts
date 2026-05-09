import React from "react";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { ChannelIds } from "../../channelDefs";
import type { Interfaces } from "../../interfaces";
import {
    REL_PERM_METRIC_LABELS,
    type ColorBy,
    type RelPermDataAccessorLike,
    type RelPermMetric,
    type RelPermMetricValue,
} from "../../typesAndEnums";
import { makeRelPermColorByValue, makeRelPermColorByValueMap } from "../utils/RelPermPlotBuilder";

type MetricValueGroup = {
    ensembleIdent: RegularEnsembleIdent;
    curveName: string;
    satnum: number;
    values: RelPermMetricValue[];
};

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    dataAccessor: RelPermDataAccessorLike | null,
    selectedMetric: RelPermMetric,
    colorBy: ColorBy,
) {
    const contents = React.useMemo(() => {
        if (!dataAccessor) {
            return [];
        }

        const selectedEnsembles = dataAccessor.getEntries().flatMap((entry) => {
            const ensemble = ensembleSet.findEnsemble(entry.ensembleIdent);
            return ensemble ? [ensemble] : [];
        });
        const colorByValueMap = makeRelPermColorByValueMap(
            dataAccessor.getEntries(),
            selectedEnsembles,
            colorBy,
            colorSet,
        );
        return groupMetricValues(dataAccessor.getMetricValues(selectedMetric)).map((metricValueGroup) => {
            return createChannelContent(metricValueGroup, selectedMetric, ensembleSet, colorByValueMap, colorBy);
        });
    }, [colorBy, colorSet, dataAccessor, ensembleSet, selectedMetric]);

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.METRIC_PER_REALIZATION,
        dependencies: [dataAccessor, ensembleSet, selectedMetric, colorBy, colorSet],
        enabled: Boolean(dataAccessor),
        contents,
    });
}

function createChannelContent(
    metricValueGroup: MetricValueGroup,
    selectedMetric: RelPermMetric,
    ensembleSet: EnsembleSet,
    colorByValueMap: Map<string, string>,
    colorBy: ColorBy,
): ChannelContentDefinition {
    const ensembleDisplayName = makeDistinguishableEnsembleDisplayName(
        metricValueGroup.ensembleIdent,
        ensembleSet.getRegularEnsembleArray(),
    );
    const displayName = `${REL_PERM_METRIC_LABELS[selectedMetric]}: ${ensembleDisplayName}, ${metricValueGroup.curveName}, SATNUM ${metricValueGroup.satnum}`;

    return {
        contentIdString: [
            metricValueGroup.ensembleIdent.toString(),
            selectedMetric,
            metricValueGroup.curveName,
            metricValueGroup.satnum,
        ].join("-"),
        displayName,
        dataGenerator: makeMetricDataGenerator(metricValueGroup, displayName, colorByValueMap, colorBy),
    };
}

function makeMetricDataGenerator(
    metricValueGroup: MetricValueGroup,
    displayName: string,
    colorByValueMap: Map<string, string>,
    colorBy: ColorBy,
): DataGenerator {
    return () => {
        const metaData: ChannelContentMetaData = {
            ensembleIdentString: metricValueGroup.ensembleIdent.toString(),
            displayString: displayName,
            preferredColor: colorByValueMap.get(makeMetricValueGroupColorByValue(metricValueGroup, colorBy)),
        };

        return {
            data: metricValueGroup.values.map((metricValue) => ({
                key: metricValue.realization,
                value: metricValue.value,
            })),
            metaData,
        };
    };
}

function makeMetricValueGroupColorByValue(metricValueGroup: MetricValueGroup, colorBy: ColorBy): string {
    return makeRelPermColorByValue(
        {
            ensembleIdent: metricValueGroup.ensembleIdent,
            realization: metricValueGroup.values[0]?.realization ?? 0,
            satnum: metricValueGroup.satnum,
            saturationName: "",
            saturationValues: [],
            curveName: metricValueGroup.curveName,
            curveValues: [],
        },
        colorBy,
    );
}

function groupMetricValues(metricValues: RelPermMetricValue[]): MetricValueGroup[] {
    const groups = new Map<string, MetricValueGroup>();

    for (const metricValue of metricValues) {
        const groupKey = [metricValue.ensembleIdent.toString(), metricValue.curveName, metricValue.satnum].join("-");
        const group = groups.get(groupKey);
        if (group) {
            group.values.push(metricValue);
            continue;
        }

        groups.set(groupKey, {
            ensembleIdent: metricValue.ensembleIdent,
            curveName: metricValue.curveName,
            satnum: metricValue.satnum,
            values: [metricValue],
        });
    }

    return Array.from(groups.values());
}


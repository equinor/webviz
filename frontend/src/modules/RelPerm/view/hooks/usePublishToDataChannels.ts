import React from "react";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { ChannelIds } from "../../channelDefs";
import type { Interfaces } from "../../interfaces";
import type { RelPermDataAccessorLike, RelPermMetric, RelPermMetricValue } from "../../typesAndEnums";

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
) {
    const contents = React.useMemo(() => {
        if (!dataAccessor) {
            return [];
        }

        const colorByEnsembleMap = makeColorByEnsembleMap(dataAccessor, ensembleSet, colorSet);
        return groupMetricValues(dataAccessor.getMetricValues(selectedMetric)).map((metricValueGroup) => {
            return createChannelContent(metricValueGroup, selectedMetric, ensembleSet, colorByEnsembleMap);
        });
    }, [colorSet, dataAccessor, ensembleSet, selectedMetric]);

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.METRIC_PER_REALIZATION,
        dependencies: [dataAccessor, ensembleSet, selectedMetric, colorSet],
        enabled: Boolean(dataAccessor),
        contents,
    });
}

function createChannelContent(
    metricValueGroup: MetricValueGroup,
    selectedMetric: RelPermMetric,
    ensembleSet: EnsembleSet,
    colorByEnsembleMap: Map<string, string>,
): ChannelContentDefinition {
    const ensembleDisplayName = makeDistinguishableEnsembleDisplayName(
        metricValueGroup.ensembleIdent,
        ensembleSet.getRegularEnsembleArray(),
    );
    const displayName = `${selectedMetric}: ${ensembleDisplayName}, ${metricValueGroup.curveName}, SATNUM ${metricValueGroup.satnum}`;

    return {
        contentIdString: [
            metricValueGroup.ensembleIdent.toString(),
            selectedMetric,
            metricValueGroup.curveName,
            metricValueGroup.satnum,
        ].join("-"),
        displayName,
        dataGenerator: makeMetricDataGenerator(metricValueGroup, displayName, colorByEnsembleMap),
    };
}

function makeMetricDataGenerator(
    metricValueGroup: MetricValueGroup,
    displayName: string,
    colorByEnsembleMap: Map<string, string>,
): DataGenerator {
    return () => {
        const metaData: ChannelContentMetaData = {
            ensembleIdentString: metricValueGroup.ensembleIdent.toString(),
            displayString: displayName,
            preferredColor: colorByEnsembleMap.get(metricValueGroup.ensembleIdent.toString()),
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

function makeColorByEnsembleMap(
    dataAccessor: RelPermDataAccessorLike,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
): Map<string, string> {
    const colorByEnsembleMap = new Map<string, string>();
    let color = colorSet.getFirstColor();

    for (const entry of dataAccessor.getEntries()) {
        const ensembleIdentString = entry.ensembleIdent.toString();
        if (colorByEnsembleMap.has(ensembleIdentString)) {
            continue;
        }

        const ensemble = ensembleSet.findEnsemble(RegularEnsembleIdent.fromString(ensembleIdentString));
        colorByEnsembleMap.set(ensembleIdentString, ensemble?.getColor() ?? color);
        color = colorSet.getNextColor();
    }

    return colorByEnsembleMap;
}

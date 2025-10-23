import { useAtomValue } from "jotai";

import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { ChannelIds } from "@modules/InplaceVolumesNew/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";

import { colorByAtom, firstResultNameAtom, subplotByAtom } from "../atoms/baseAtoms";
import type { InplaceVolumesTable } from "../utils/inplaceVolumesTable";
import { makeFormatLabelFunction } from "../utils/plotComponentUtils";

import { useInplaceVolumesTable } from "./useInplaceVolumesTable";

function makeResultRealizationDataGenerator(
    displayName: string,
    ensembleIdent: RegularEnsembleIdent,
    table: InplaceVolumesTable,
    resultName: string,
    preferredColor?: string,
): DataGenerator {
    return () => {
        const realValues = table.getColumn("REAL");
        const resultValues = table.getColumn(resultName);

        if (!realValues || !resultValues) {
            throw new Error("REAL and result columns must be present");
        }

        const data: { key: number; value: number }[] = realValues
            .map((realValue, row) => {
                const resultValue = resultValues[row];

                if (realValue === null || resultValue === null) {
                    return null;
                }

                return {
                    key: parseFloat(realValue.toString()),
                    value: parseFloat(resultValue.toString()),
                };
            })
            .filter((item): item is { key: number; value: number } => item !== null);

        const metaData: ChannelContentMetaData = {
            unit: "",
            ensembleIdentString: ensembleIdent.toString(),
            displayString: displayName,
            preferredColor: preferredColor,
        };

        return {
            data,
            metaData,
        };
    };
}

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
) {
    const table = useInplaceVolumesTable();
    const colorBy = useAtomValue(colorByAtom);
    const resultName = useAtomValue(firstResultNameAtom);
    const subplotBy = useAtomValue(subplotByAtom);

    const contents: ChannelContentDefinition[] = [];

    const hasRequiredData = Boolean(
        table &&
            resultName &&
            table.hasColumn("REAL") &&
            table.hasColumn(resultName) &&
            table.hasColumn(TableOriginKey.ENSEMBLE),
    );

    if (!hasRequiredData) {
        viewContext.usePublishChannelContents({
            channelIdString: ChannelIds.RESPONSE_PER_REAL,
            dependencies: [table, ensembleSet, resultName, colorBy, colorSet, subplotBy],
            enabled: false,
            contents: [],
        });
        return;
    }

    // Build grouping columns: subplot + color
    const groupingColumns = [...(subplotBy || []), colorBy].filter(Boolean);

    if (groupingColumns.length === 0) {
        viewContext.usePublishChannelContents({
            channelIdString: ChannelIds.RESPONSE_PER_REAL,
            dependencies: [table, ensembleSet, resultName, colorBy, colorSet, subplotBy],
            enabled: false,
            contents: [],
        });
        return;
    }

    const groupedEntries = table!.splitByColumns(groupingColumns);

    const formatLabelFunction = makeFormatLabelFunction(ensembleSet);

    // Create color map for all groups
    const colorMap = createColorMapForGroups(table!, groupingColumns, colorBy, ensembleSet, colorSet);

    // Build channel contents from grouped entries
    for (const entry of groupedEntries) {
        const labelParts = groupingColumns.map((colName, idx) =>
            formatLabelFunction(colName, entry.keyParts[idx]?.toString() ?? entry.key),
        );
        const displayName = `${resultName} (${labelParts.join(", ")})`;

        // Get ensemble ident for this group. safe as ensemble is always a grouping column
        const ensembleValues = entry.table.getColumn(TableOriginKey.ENSEMBLE);
        if (!ensembleValues || ensembleValues.length === 0) {
            continue;
        }

        const ensembleIdentStr = ensembleValues[0]?.toString();
        if (!ensembleIdentStr) {
            continue;
        }

        const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr);

        // Get color for this group
        const preferredColor = colorMap.get(entry.key);

        const dataGenerator = makeResultRealizationDataGenerator(
            displayName,
            ensembleIdent,
            entry.table,
            resultName ?? "",
            preferredColor,
        );

        contents.push({
            contentIdString: entry.key,
            displayName,
            dataGenerator,
        });
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [ensembleSet, table, resultName, colorBy, colorSet, subplotBy],
        enabled: hasRequiredData,
        contents,
    });
}

function createColorMapForGroups(
    table: InplaceVolumesTable,
    groupingColumns: string[],
    colorBy: string,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
): Map<string, string> {
    const colorMap = new Map<string, string>();

    // Get all grouped entries
    const allGroupedEntries = table.splitByColumns(groupingColumns);

    // Create a map of color values to colors
    const colorValueToColor = new Map<string, string>();
    const colorGroupedEntries = table.splitByColumn(colorBy);
    let currentColor = colorSet.getFirstColor();

    for (const colorEntry of colorGroupedEntries) {
        const colorKey = colorEntry.keyParts[0]?.toString() ?? colorEntry.key;
        let effectiveColor = currentColor;

        // If coloring by ensemble, use ensemble-specific color
        if (colorBy === TableOriginKey.ENSEMBLE) {
            const ensembleIdent = RegularEnsembleIdent.fromString(colorKey);
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                effectiveColor = ensemble.getColor();
            }
        }

        colorValueToColor.set(colorKey, effectiveColor);
        currentColor = colorSet.getNextColor();
    }

    // Assign colors to each group based on their color column value
    for (const entry of allGroupedEntries) {
        // Get the color value for this group - direct column access
        const colorValues = entry.table.getColumn(colorBy);
        if (colorValues && colorValues.length > 0) {
            const colorValue = colorValues[0]?.toString();
            if (colorValue) {
                const color = colorValueToColor.get(colorValue);
                if (color) {
                    colorMap.set(entry.key, color);
                }
            }
        }
    }

    return colorMap;
}

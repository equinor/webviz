import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { ChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumesPlot/interfaces";

function makeResultRealizationDataGenerator(
    ensembleName: string,
    ensembleIdent: RegularEnsembleIdent,
    tableName: string,
    fluid: string,
    table: Table,
    resultName: string,
    preferredColor?: string,
): DataGenerator {
    return () => {
        const realColumn = table.getColumn("REAL");
        const resultColumn = table.getColumn(resultName);

        if (!realColumn || !resultColumn) {
            throw new Error("REAL and result columns must be present");
        }

        const data: { key: number; value: number }[] = [];
        for (let row = 0; row < realColumn.getNumRows(); row++) {
            const key = parseFloat(realColumn.getRowValue(row).toString());
            const value = parseFloat(resultColumn.getRowValue(row).toString());
            data.push({ key, value });
        }

        const metaData: ChannelContentMetaData = {
            unit: "",
            ensembleIdentString: ensembleIdent.toString(),
            displayString: `${resultName} (${ensembleName}, ${tableName}, ${fluid})`,
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
    colorBy: string,
    table?: Table,
    resultName?: string,
) {
    const contents: ChannelContentDefinition[] = [];

    if (!table || !resultName || !table.getColumn("REAL") || !table.getColumn(resultName)) {
        viewContext.usePublishChannelContents({
            channelIdString: ChannelIds.RESPONSE_PER_REAL,
            dependencies: [table, ensembleSet, resultName, colorBy, colorSet],
            enabled: Boolean(table && resultName),
            contents,
        });
        return;
    }

    const colorByMap = createColumnValuesToColorMap(table, ensembleSet, colorBy, colorSet);

    const ensembleCollection = table.splitByColumn(TableOriginKey.ENSEMBLE);
    for (const [ensembleIdentStr, ensembleTable] of ensembleCollection.getCollectionMap()) {
        const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr.toString());
        const ensembleName = makeDistinguishableEnsembleDisplayName(
            ensembleIdent,
            ensembleSet.getRegularEnsembleArray(),
        );

        const tableCollection = ensembleTable.splitByColumn(TableOriginKey.TABLE_NAME);
        for (const [tableName, tableForTableName] of tableCollection.getCollectionMap()) {
            const fluidZoneCollection = tableForTableName.splitByColumn(TableOriginKey.FLUID);
            for (const [fluidZone, fluidZoneTable] of fluidZoneCollection.getCollectionMap()) {
                let keyForColorLookup: string | number = ensembleIdentStr;

                if (colorBy === TableOriginKey.TABLE_NAME) {
                    keyForColorLookup = tableName;
                } else if (colorBy === TableOriginKey.FLUID) {
                    keyForColorLookup = fluidZone;
                }
                const determinedColor = colorByMap.get(keyForColorLookup);

                const dataGenerator = makeResultRealizationDataGenerator(
                    ensembleName,
                    ensembleIdent,
                    tableName.toString(),
                    fluidZone.toString(),
                    fluidZoneTable,
                    resultName,
                    determinedColor,
                );

                contents.push({
                    contentIdString: `${fluidZone}-${tableName}-${ensembleIdentStr}`,
                    displayName: `${resultName} (${ensembleName}, ${tableName}, ${fluidZone})`,
                    dataGenerator,
                });
            }
        }
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [table, ensembleSet, resultName, colorBy, colorSet],
        enabled: Boolean(table && resultName),
        contents,
    });
}

function createColumnValuesToColorMap(
    table: Table,
    ensembleSet: EnsembleSet,
    colorBy: string,
    colorSet: ColorSet,
): Map<string | number, string> {
    const colorByMap = new Map<string | number, string>();
    const colorByColumn = table.getColumn(colorBy);

    if (!colorByColumn) {
        return colorByMap;
    }

    const collectionToColor = table.splitByColumn(colorBy);
    let currentBaseColorFromSet = colorSet.getFirstColor();

    for (const [keyOfColorByItem] of collectionToColor.getCollectionMap()) {
        let effectiveColor = currentBaseColorFromSet;

        if (colorBy === TableOriginKey.ENSEMBLE) {
            const currentEnsembleIdent = RegularEnsembleIdent.fromString(keyOfColorByItem.toString());
            const ensemble = ensembleSet.findEnsemble(currentEnsembleIdent);
            const ensembleSpecificColor = ensemble?.getColor();

            if (ensembleSpecificColor !== undefined) {
                effectiveColor = ensembleSpecificColor;
            }
        }

        colorByMap.set(keyOfColorByItem, effectiveColor);
        currentBaseColorFromSet = colorSet.getNextColor();
    }

    return colorByMap;
}

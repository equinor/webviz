import type { InplaceVolumetricResultName_api } from "@api";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { Table } from "@modules/_shared/InplaceVolumetrics/Table";
import type { SourceAndTableIdentifierUnion } from "@modules/_shared/InplaceVolumetrics/types";
import { SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import { ChannelIds } from "@modules/InplaceVolumetricsPlot/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumetricsPlot/interfaces";

function makeResultRealizationDataGenerator(
    ensembleName: string,
    ensembleIdent: RegularEnsembleIdent,
    tableName: string,
    fluidZone: string,
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
            displayString: `${resultName} (${ensembleName}, ${tableName}, ${fluidZone})`,
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
    colorBy: SourceAndTableIdentifierUnion,
    table?: Table,
    resultName?: InplaceVolumetricResultName_api,
) {
    const contents: ChannelContentDefinition[] = [];

    if (!table || !resultName || table.getColumn("REAL") === undefined || table.getColumn(resultName) === undefined) {
        viewContext.usePublishChannelContents({
            channelIdString: ChannelIds.RESPONSE_PER_REAL,
            dependencies: [table, ensembleSet, resultName, colorBy, colorSet],
            enabled: Boolean(table && resultName),
            contents,
        });
        return;
    }

    const colorByMap = new Map<string | number, string>();
    const colorByColumnExists = table.getColumn(colorBy);
    if (colorByColumnExists) {
        const collectionToColor = table.splitByColumn(colorBy);
        let currentBaseColorFromSet = colorSet.getFirstColor();

        for (const [keyOfColorByItem] of collectionToColor.getCollectionMap()) {
            let effectiveColor = currentBaseColorFromSet;

            if (colorBy === SourceIdentifier.ENSEMBLE) {
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
    }
    const ensembleCollection = table.splitByColumn(SourceIdentifier.ENSEMBLE);
    for (const [ensembleIdentStr, ensembleTable] of ensembleCollection.getCollectionMap()) {
        const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr.toString());
        const ensembleName = makeDistinguishableEnsembleDisplayName(
            ensembleIdent,
            ensembleSet.getRegularEnsembleArray(),
        );

        const tableCollection = ensembleTable.splitByColumn(SourceIdentifier.TABLE_NAME);
        for (const [tableName, tableForTableName] of tableCollection.getCollectionMap()) {
            const fluidZoneCollection = tableForTableName.splitByColumn(SourceIdentifier.FLUID_ZONE);
            for (const [fluidZone, fluidZoneTable] of fluidZoneCollection.getCollectionMap()) {
                let keyForColorLookup: string | number = ensembleIdentStr;

                if (colorBy === SourceIdentifier.TABLE_NAME) {
                    keyForColorLookup = tableName;
                } else if (colorBy === SourceIdentifier.FLUID_ZONE) {
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
    const colorByColumnExists = table.getColumn(colorBy);
    if (!colorByColumnExists) {
        return colorByMap;
    }
    const collectionToColor = table.splitByColumn(colorBy);
    let currentBaseColorFromSet = colorSet.getFirstColor();

    for (const [keyOfColorByItem] of collectionToColor.getCollectionMap()) {
        let effectiveColor = currentBaseColorFromSet;

        if (colorBy === SourceIdentifier.ENSEMBLE) {
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

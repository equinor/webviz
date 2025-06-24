import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableDataSource } from "@modules/_shared/InplaceVolumes/types";
import { ChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumesPlot/interfaces";

function makeDataGeneratorFunc(
    ensembleName: string,
    ensembleIdent: RegularEnsembleIdent,
    tableName: string,
    fluid: string,
    table: Table,
    resultName: string,
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
    table?: Table,
    resultName?: string,
) {
    const contents: ChannelContentDefinition[] = [];

    if (table && resultName) {
        const ensembleCollection = table.splitByColumn(TableDataSource.ENSEMBLE);
        for (const [ensembleIdentStr, ensembleTable] of ensembleCollection.getCollectionMap()) {
            const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr.toString());
            const ensembleName = makeDistinguishableEnsembleDisplayName(
                ensembleIdent,
                ensembleSet.getRegularEnsembleArray(),
            );

            const tableCollection = ensembleTable.splitByColumn(TableDataSource.TABLE_NAME);
            for (const [tableName, table] of tableCollection.getCollectionMap()) {
                const fluidCollection = table.splitByColumn(TableDataSource.FLUID);
                for (const [fluid, perFluidTable] of fluidCollection.getCollectionMap()) {
                    const dataGenerator = makeDataGeneratorFunc(
                        ensembleName,
                        ensembleIdent,
                        tableName.toString(),
                        fluid.toString(),
                        perFluidTable,
                        resultName,
                    );
                    contents.push({
                        contentIdString: `${fluid}-${tableName}-${ensembleIdentStr}`,
                        displayName: `${resultName} (${ensembleName}, ${tableName}, ${fluid})`,
                        dataGenerator,
                    });
                }
            }
        }
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [table, resultName],
        enabled: Boolean(table && resultName),
        contents,
    });
}

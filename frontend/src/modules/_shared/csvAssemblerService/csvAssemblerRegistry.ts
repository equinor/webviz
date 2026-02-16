import { expose } from "comlink";

import {
    assembleCsvDummyFiles,
    assembleCsvFiles as assembleSimulationTimeSeriesCsvFiles,
} from "@modules/SimulationTimeSeries/view/utils/csvDataAssembler";

// Register assemblers
// - Create the registry object of csv assembler functions
// - Can be assembler for specific modules or generic ones
export const csvAssemblerRegistry = {
    assembleSimulationTimeSeriesCsv: assembleSimulationTimeSeriesCsvFiles,
    assembleDummyCsv: assembleCsvDummyFiles,
};

expose(csvAssemblerRegistry);

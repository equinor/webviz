import type { csvAssemblerRegistry } from "./csvAssemblerRegistry";

export type CsvFile = { filename: string; csvContent: string };

// Derive the type automatically from registered assembler functions
export type CsvAssemblerServiceApi = typeof csvAssemblerRegistry;

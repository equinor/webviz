export enum SubplotBy {
    SOURCE = "source",
    INDEX = "index",
}

export type SubplotByInfo = {
    subplotBy: SubplotBy;
    indexName?: string;
};

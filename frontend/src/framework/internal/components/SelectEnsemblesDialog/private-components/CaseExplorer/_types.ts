export type CaseRowData = {
    caseId: string;
    caseName: string;
    description: string;
    author: string;
    status: string;
    modelName: string | null;
    modelRevision: string | null;
    dateUtcMs: number;
};

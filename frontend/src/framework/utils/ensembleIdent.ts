export class EnsembleIdent {
    private _caseUuid: string;
    private _ensembleName: string;

    private constructor(caseUuid: string, ensembleName: string) {
        this._caseUuid = caseUuid;
        this._ensembleName = ensembleName;
    }

    static fromCaseUuidAndEnsembleName(caseUuid: string, ensembleName: string): EnsembleIdent {
        return new EnsembleIdent(caseUuid, ensembleName);
    }

    static fromString(ensembleIdent: string): EnsembleIdent {
        const regex =
            /^(?<caseUuid>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12})::(?<ensembleName>.*)$/;
        const result = regex.exec(ensembleIdent);
        if (!result || !result.groups || !result.groups.caseUuid || !result.groups.ensembleName) {
            throw new Error(`Invalid ensemble ident: ${ensembleIdent}`);
        }

        const { caseUuid, ensembleName } = result.groups;

        return new EnsembleIdent(caseUuid, ensembleName);
    }

    public toCaseUuid(): string {
        return this._caseUuid;
    }

    public toEnsembleName(): string {
        return this._ensembleName;
    }

    public toString(): string {
        return `${this._caseUuid}::${this._ensembleName}`;
    }
}

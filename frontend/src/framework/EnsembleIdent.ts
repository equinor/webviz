export class EnsembleIdent {
    private _caseUuid: string;
    private _ensembleName: string;

    constructor(caseUuid: string, ensembleName: string) {
        this._caseUuid = caseUuid;
        this._ensembleName = ensembleName;
    }

    static fromCaseUuidAndEnsembleName(caseUuid: string, ensembleName: string): EnsembleIdent {
        return new EnsembleIdent(caseUuid, ensembleName);
    }

    static caseUuidAndEnsembleNameToString(caseUuid: string, ensembleName: string): string {
        return `${caseUuid}::${ensembleName}`;
    }

    static fromString(ensembleIdentString: string): EnsembleIdent {
        const regex =
            /^(?<caseUuid>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12})::(?<ensembleName>.*)$/;
        const result = regex.exec(ensembleIdentString);
        if (!result || !result.groups || !result.groups.caseUuid || !result.groups.ensembleName) {
            throw new Error(`Invalid ensemble ident: ${ensembleIdentString}`);
        }

        const { caseUuid, ensembleName } = result.groups;

        return new EnsembleIdent(caseUuid, ensembleName);
    }

    getCaseUuid(): string {
        return this._caseUuid;
    }

    getEnsembleName(): string {
        return this._ensembleName;
    }

    toString(): string {
        return EnsembleIdent.caseUuidAndEnsembleNameToString(this._caseUuid, this._ensembleName);
    }

    equals(otherIdent: EnsembleIdent | null): boolean {
        if (!otherIdent) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return this._caseUuid === otherIdent._caseUuid && this._ensembleName === otherIdent._ensembleName;
    }

    static isEqual(identA: EnsembleIdent | null, identB: EnsembleIdent | null): boolean {
        if (identA === null || identB === null) {
            if (identA === identB) {
                return true;
            } else {
                return false;
            }
        }

        return identA.equals(identB);
    }
}

import { EnsembleIdentInterface } from "./EnsembleIdentInterface";
import { ensembleIdentRegexStringWithoutAnchors } from "./utils/ensembleIdentUtils";

export class EnsembleIdent implements EnsembleIdentInterface<EnsembleIdent> {
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

    static isValidEnsembleIdentString(ensembleIdentString: string): boolean {
        const regex = EnsembleIdent.getEnsembleIdentRegex();
        const result = regex.exec(ensembleIdentString);
        return !!result && !!result.groups && !!result.groups.caseUuid && !!result.groups.ensembleName;
    }

    static fromString(ensembleIdentString: string): EnsembleIdent {
        const regex = EnsembleIdent.getEnsembleIdentRegex();
        const result = regex.exec(ensembleIdentString);
        if (!result || !result.groups || !result.groups.caseUuid || !result.groups.ensembleName) {
            throw new Error(`Invalid ensemble ident: ${ensembleIdentString}`);
        }

        const { caseUuid, ensembleName } = result.groups;

        return new EnsembleIdent(caseUuid, ensembleName);
    }

    /**
     * Get regex for an ensemble ident.
     *
     * @returns Regular expression for ensemble ident
     */
    static getEnsembleIdentRegex(): RegExp {
        return new RegExp(`^${ensembleIdentRegexStringWithoutAnchors("caseUuid", "ensembleName")}$`);
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

    equals(otherIdent: EnsembleIdentInterface<any> | null): boolean {
        if (!otherIdent || !(otherIdent instanceof EnsembleIdent)) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return this._caseUuid === otherIdent._caseUuid && this._ensembleName === otherIdent._ensembleName;
    }
}

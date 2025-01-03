import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "./utils/ensembleIdentUtils";
import { UUID_REGEX_STRING } from "./utils/uuidUtils";

/**
 * Delta ensemble ident class.
 *
 * DeltaEnsembleIdent is the ensemble ident for a delta ensemble.
 *
 * The class holds the ensemble idents of the two ensembles used to define the delta ensemble,
 * i.e. comparisonEnsembleIdent and referenceEnsembleIdent, for easy usage in the framework.
 *
 * Definition:
 *
 *      DeltaEnsemble = ComparisonEnsemble - ReferenceEnsemble
 *
 */
export class DeltaEnsembleIdent {
    private _ensembleName: string;
    private _comparisonEnsembleIdent: RegularEnsembleIdent;
    private _referenceEnsembleIdent: RegularEnsembleIdent;

    constructor(comparisonEnsembleIdent: RegularEnsembleIdent, referenceEnsembleIdent: RegularEnsembleIdent) {
        this._ensembleName = `(${comparisonEnsembleIdent.getEnsembleName()}) - (${referenceEnsembleIdent.getEnsembleName()})`;
        this._comparisonEnsembleIdent = comparisonEnsembleIdent;
        this._referenceEnsembleIdent = referenceEnsembleIdent;
    }

    static readonly ensembleIdentRegExp = new RegExp(
        `^~@@~(?<comparisonCaseUuid>${UUID_REGEX_STRING})::(?<comparisonEnsembleName>.*)~@@~(?<referenceCaseUuid>${UUID_REGEX_STRING})::(?<referenceEnsembleName>.*)~@@~$`
    );

    static comparisonEnsembleIdentAndReferenceEnsembleIdentToString(
        comparisonEnsembleIdent: RegularEnsembleIdent,
        referenceEnsembleIdent: RegularEnsembleIdent
    ): string {
        return `~@@~${comparisonEnsembleIdent.toString()}~@@~${referenceEnsembleIdent.toString()}~@@~`;
    }

    static isValidEnsembleIdentString(ensembleIdentString: string): boolean {
        const regex = DeltaEnsembleIdent.ensembleIdentRegExp;
        const result = regex.exec(ensembleIdentString);
        return (
            !!result &&
            !!result.groups &&
            !!result.groups.comparisonCaseUuid &&
            !!result.groups.comparisonEnsembleName &&
            !!result.groups.referenceCaseUuid &&
            !!result.groups.referenceEnsembleName
        );
    }

    static fromString(ensembleIdentString: string): DeltaEnsembleIdent {
        const regex = DeltaEnsembleIdent.ensembleIdentRegExp;
        const result = regex.exec(ensembleIdentString);

        const { comparisonCaseUuid, comparisonEnsembleName, referenceCaseUuid, referenceEnsembleName } =
            result?.groups ?? {};
        if (!comparisonCaseUuid || !comparisonEnsembleName || !referenceCaseUuid || !referenceEnsembleName) {
            throw new Error(`Invalid ensemble ident: ${ensembleIdentString}`);
        }

        return new DeltaEnsembleIdent(
            new RegularEnsembleIdent(comparisonCaseUuid, comparisonEnsembleName),
            new RegularEnsembleIdent(referenceCaseUuid, referenceEnsembleName)
        );
    }

    getEnsembleName(): string {
        return this._ensembleName;
    }

    getComparisonEnsembleIdent(): RegularEnsembleIdent {
        return this._comparisonEnsembleIdent;
    }

    getReferenceEnsembleIdent(): RegularEnsembleIdent {
        return this._referenceEnsembleIdent;
    }

    toString(): string {
        return DeltaEnsembleIdent.comparisonEnsembleIdentAndReferenceEnsembleIdentToString(
            this._comparisonEnsembleIdent,
            this._referenceEnsembleIdent
        );
    }

    equals(otherIdent: any | null): boolean {
        if (!otherIdent || !isEnsembleIdentOfType(otherIdent, DeltaEnsembleIdent)) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return (
            this._ensembleName === otherIdent._ensembleName &&
            this._comparisonEnsembleIdent.equals(otherIdent._comparisonEnsembleIdent) &&
            this._referenceEnsembleIdent.equals(otherIdent._referenceEnsembleIdent)
        );
    }
}

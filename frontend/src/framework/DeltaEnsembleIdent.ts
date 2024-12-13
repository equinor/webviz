import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import { ensembleIdentUuidRegexString, isEnsembleIdentOfType } from "./utils/ensembleIdentUtils";

/**
 * Delta ensemble ident class.
 *
 * DeltaEnsembleIdent is the ensemble ident for a delta ensemble.
 *
 * The class holds the ensemble idents of the two ensembles used to define the delta ensemble,
 * i.e. compareEnsembleIdent and referenceEnsembleIdent, for easy usage in the framework.
 *
 * Definition:
 *
 *      DeltaEnsemble = CompareEnsemble - ReferenceEnsemble
 *
 */
export class DeltaEnsembleIdent {
    private _ensembleName: string;
    private _compareEnsembleIdent: RegularEnsembleIdent;
    private _referenceEnsembleIdent: RegularEnsembleIdent;

    constructor(compareEnsembleIdent: RegularEnsembleIdent, referenceEnsembleIdent: RegularEnsembleIdent) {
        this._ensembleName = `(${compareEnsembleIdent.getEnsembleName()}) - (${referenceEnsembleIdent.getEnsembleName()})`;
        this._compareEnsembleIdent = compareEnsembleIdent;
        this._referenceEnsembleIdent = referenceEnsembleIdent;
    }

    static compareEnsembleIdentAndReferenceEnsembleIdentToString(
        compareEnsembleIdent: RegularEnsembleIdent,
        referenceEnsembleIdent: RegularEnsembleIdent
    ): string {
        return `~@@~${compareEnsembleIdent.toString()}~@@~${referenceEnsembleIdent.toString()}~@@~`;
    }

    private static getEnsembleIdentRegex(): RegExp {
        const compareEnsembleIdentRegexString = `(?<compareCaseUuid>${ensembleIdentUuidRegexString()})::(?<compareEnsembleName>.*)`;
        const referenceEnsembleIdentRegexString = `(?<referenceCaseUuid>${ensembleIdentUuidRegexString()})::(?<referenceEnsembleName>.*)`;
        return new RegExp(`^~@@~${compareEnsembleIdentRegexString}~@@~${referenceEnsembleIdentRegexString}~@@~$`);
    }

    static isValidEnsembleIdentString(ensembleIdentString: string): boolean {
        const regex = DeltaEnsembleIdent.getEnsembleIdentRegex();
        const result = regex.exec(ensembleIdentString);
        return (
            !!result &&
            !!result.groups &&
            !!result.groups.compareCaseUuid &&
            !!result.groups.compareEnsembleName &&
            !!result.groups.referenceCaseUuid &&
            !!result.groups.referenceEnsembleName
        );
    }

    static fromString(ensembleIdentString: string): DeltaEnsembleIdent {
        const regex = DeltaEnsembleIdent.getEnsembleIdentRegex();
        const result = regex.exec(ensembleIdentString);
        if (
            !result ||
            !result.groups ||
            !result.groups.compareCaseUuid ||
            !result.groups.compareEnsembleName ||
            !result.groups.referenceCaseUuid ||
            !result.groups.referenceEnsembleName
        ) {
            throw new Error(`Invalid ensemble ident: ${ensembleIdentString}`);
        }

        const { compareCaseUuid, compareEnsembleName, referenceCaseUuid, referenceEnsembleName } = result.groups;

        return new DeltaEnsembleIdent(
            new RegularEnsembleIdent(compareCaseUuid, compareEnsembleName),
            new RegularEnsembleIdent(referenceCaseUuid, referenceEnsembleName)
        );
    }

    getEnsembleName(): string {
        return this._ensembleName;
    }

    getCompareEnsembleIdent(): RegularEnsembleIdent {
        return this._compareEnsembleIdent;
    }

    getReferenceEnsembleIdent(): RegularEnsembleIdent {
        return this._referenceEnsembleIdent;
    }

    toString(): string {
        return DeltaEnsembleIdent.compareEnsembleIdentAndReferenceEnsembleIdentToString(
            this._compareEnsembleIdent,
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
            this._compareEnsembleIdent.equals(otherIdent._compareEnsembleIdent) &&
            this._referenceEnsembleIdent.equals(otherIdent._referenceEnsembleIdent)
        );
    }
}

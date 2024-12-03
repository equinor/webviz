import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import { ensembleIdentRegexStringWithoutAnchors } from "./utils/ensembleIdentUtils";

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

    static uuidAndEnsembleIdentStringsToString(
        compareEnsembleIdentString: string,
        referenceEnsembleIdentString: string
    ): string {
        return `~@@~${compareEnsembleIdentString}~@@~${referenceEnsembleIdentString}~@@~`;
    }

    static isValidDeltaEnsembleIdentString(deltaEnsembleIdentString: string): boolean {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        return (
            !!result &&
            !!result.groups &&
            !!result.groups.compareCaseUuid &&
            !!result.groups.compareEnsembleName &&
            !!result.groups.referenceCaseUuid &&
            !!result.groups.referenceEnsembleName
        );
    }

    static fromString(deltaEnsembleIdentString: string): DeltaEnsembleIdent {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        if (
            !result ||
            !result.groups ||
            !result.groups.compareCaseUuid ||
            !result.groups.compareEnsembleName ||
            !result.groups.referenceCaseUuid ||
            !result.groups.referenceEnsembleName
        ) {
            throw new Error(`Invalid ensemble ident: ${deltaEnsembleIdentString}`);
        }

        const { compareCaseUuid, compareEnsembleName, referenceCaseUuid, referenceEnsembleName } = result.groups;

        return new DeltaEnsembleIdent(
            new RegularEnsembleIdent(compareCaseUuid, compareEnsembleName),
            new RegularEnsembleIdent(referenceCaseUuid, referenceEnsembleName)
        );
    }

    private static getDeltaEnsembleIdentRegex(): RegExp {
        const compareEnsembleIdentRegexString = ensembleIdentRegexStringWithoutAnchors(
            "compareCaseUuid",
            "compareEnsembleName"
        );
        const referenceEnsembleIdentRegexString = ensembleIdentRegexStringWithoutAnchors(
            "referenceCaseUuid",
            "referenceEnsembleName"
        );
        return new RegExp(`^~@@~${compareEnsembleIdentRegexString}~@@~${referenceEnsembleIdentRegexString}~@@~$`);
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
        return DeltaEnsembleIdent.uuidAndEnsembleIdentStringsToString(
            this._compareEnsembleIdent.toString(),
            this._referenceEnsembleIdent.toString()
        );
    }

    equals(otherIdent: any | null): boolean {
        if (!otherIdent || !(otherIdent instanceof DeltaEnsembleIdent)) {
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

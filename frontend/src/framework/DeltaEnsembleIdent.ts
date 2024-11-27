import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleIdentInterface } from "./EnsembleIdentInterface";
import { ensembleIdentRegexStringWithoutAnchors, ensembleIdentUuidRegexString } from "./utils/ensembleIdentUtils";

/**
 * Represents a delta ensemble ident
 *
 * Holds ensemble idents of the two ensembles used to define a delta ensemble:
 * compareEnsembleIdent and referenceEnsembleIdent for easy usage in the framework.
 *
 * Definition:
 *
 *      DeltaEnsemble = CompareEnsemble - ReferenceEnsemble
 *
 */
export class DeltaEnsembleIdent implements EnsembleIdentInterface<DeltaEnsembleIdent> {
    private _uuid: string;
    private _ensembleName: string;
    private _compareEnsembleIdent: EnsembleIdent;
    private _referenceEnsembleIdent: EnsembleIdent;

    constructor(uuid: string, compareEnsembleIdent: EnsembleIdent, referenceEnsembleIdent: EnsembleIdent) {
        this._uuid = uuid;
        this._ensembleName = `(${compareEnsembleIdent.getEnsembleName()}) - (${referenceEnsembleIdent.getEnsembleName()})`;
        this._compareEnsembleIdent = compareEnsembleIdent;
        this._referenceEnsembleIdent = referenceEnsembleIdent;
    }

    static uuidAndEnsembleIdentStringsToString(
        uuid: string,
        compareEnsembleIdentString: string,
        referenceEnsembleIdentString: string
    ): string {
        return `${uuid}~@@~${compareEnsembleIdentString}~@@~${referenceEnsembleIdentString}`;
    }

    static isValidDeltaEnsembleIdentString(deltaEnsembleIdentString: string): boolean {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        return (
            !!result &&
            !!result.groups &&
            !!result.groups.uuid &&
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
            !result.groups.uuid ||
            !result.groups.compareCaseUuid ||
            !result.groups.compareEnsembleName ||
            !result.groups.referenceCaseUuid ||
            !result.groups.referenceEnsembleName
        ) {
            throw new Error(`Invalid ensemble ident: ${deltaEnsembleIdentString}`);
        }

        const { uuid, compareCaseUuid, compareEnsembleName, referenceCaseUuid, referenceEnsembleName } = result.groups;

        return new DeltaEnsembleIdent(
            uuid,
            new EnsembleIdent(compareCaseUuid, compareEnsembleName),
            new EnsembleIdent(referenceCaseUuid, referenceEnsembleName)
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
        return new RegExp(
            `^(?<uuid>${ensembleIdentUuidRegexString()})~@@~${compareEnsembleIdentRegexString}~@@~${referenceEnsembleIdentRegexString}$`
        );
    }

    getUuid(): string {
        return this._uuid;
    }

    getEnsembleName(): string {
        return this._ensembleName;
    }

    getCompareEnsembleIdent(): EnsembleIdent {
        return this._compareEnsembleIdent;
    }

    getReferenceEnsembleIdent(): EnsembleIdent {
        return this._referenceEnsembleIdent;
    }

    toString(): string {
        return DeltaEnsembleIdent.uuidAndEnsembleIdentStringsToString(
            this._uuid,
            this._compareEnsembleIdent.toString(),
            this._referenceEnsembleIdent.toString()
        );
    }

    equals(otherIdent: EnsembleIdentInterface<any> | null): boolean {
        if (!otherIdent || !(otherIdent instanceof DeltaEnsembleIdent)) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return this._uuid === otherIdent._uuid && this._ensembleName === otherIdent._ensembleName;
    }
}

import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import { ensembleIdentRegexStringWithoutAnchors, ensembleIdentUuidRegexString } from "./utils/ensembleIdentUtils";

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
    private _uuid: string;
    private _ensembleName: string;
    private _compareEnsembleIdent: RegularEnsembleIdent;
    private _referenceEnsembleIdent: RegularEnsembleIdent;

    constructor(
        uuid: string,
        compareEnsembleIdent: RegularEnsembleIdent,
        referenceEnsembleIdent: RegularEnsembleIdent
    ) {
        const uuidRegex = new RegExp(ensembleIdentUuidRegexString());
        if (!uuidRegex.exec(uuid)) {
            throw new Error(`Invalid uuid: ${uuid}`);
        }

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

    getCompareEnsembleIdent(): RegularEnsembleIdent {
        return this._compareEnsembleIdent;
    }

    getReferenceEnsembleIdent(): RegularEnsembleIdent {
        return this._referenceEnsembleIdent;
    }

    toString(): string {
        return DeltaEnsembleIdent.uuidAndEnsembleIdentStringsToString(
            this._uuid,
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

        return this._uuid === otherIdent._uuid && this._ensembleName === otherIdent._ensembleName;
    }
}

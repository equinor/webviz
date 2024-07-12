import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { AddrTypes } from "./surfaceAddress";
import { encodeSurfAddrStr } from "./surfaceAddress";
import { ObsSurfAddr, PartialSurfAddr, RealSurfAddr, StatSurfAddr } from "./surfaceAddress";

export class SurfAddrBuilder {
    private _addrType: AddrTypes | null = null;
    private _caseUuid: string | null = null;
    private _ensemble: string | null = null;
    private _name: string | null = null;
    private _attribute: string | null = null;
    private _realizationNum: number | null = null;
    private _isoTimeOrInterval: string | null = null;
    private _statisticFunction: SurfaceStatisticFunction_api | null = null;

    withType(addrType: AddrTypes): this {
        this._addrType = addrType;
        return this;
    }

    withEnsembleIdent(ensembleIdent: EnsembleIdent): this {
        this._caseUuid = ensembleIdent.getCaseUuid();
        this._ensemble = ensembleIdent.getEnsembleName();
        return this;
    }

    withName(name: string): this {
        this._name = name;
        return this;
    }

    withAttribute(attribute: string): this {
        this._attribute = attribute;
        return this;
    }

    withTimeOrInterval(isoTimeOrInterval: string | null): this {
        this._isoTimeOrInterval = isoTimeOrInterval;
        return this;
    }

    withRealization(realization: number): this {
        this._realizationNum = realization;
        return this;
    }

    withStatisticFunction(statisticFunction: SurfaceStatisticFunction_api): this {
        this._statisticFunction = statisticFunction;
        return this;
    }

    buildRealizationAddress(): RealSurfAddr {
        if (this._addrType && this._addrType !== "REAL") {
            throw new Error("Address type is already set to another type than REAL");
        }

        if (this._realizationNum == null) {
            throw new Error("Realization number not set");
        }

        this.assertCommonPropertiesAreSet(true);

        const retObj: RealSurfAddr = {
            addressType: "REAL",
            caseUuid: this._caseUuid!,
            ensemble: this._ensemble!,
            name: this._name!,
            attribute: this._attribute!,
            realizationNum: this._realizationNum,
            isoTimeOrInterval: this._isoTimeOrInterval,
        };
        return retObj;
    }

    buildObservedAddress(): ObsSurfAddr {
        if (this._addrType && this._addrType !== "OBS") {
            throw new Error("Address type is already set to another type than OBS");
        }

        if (!this._isoTimeOrInterval) {
            throw new Error("Time or interval not set");
        }

        this.assertCommonPropertiesAreSet(false);

        const retObj: ObsSurfAddr = {
            addressType: "OBS",
            caseUuid: this._caseUuid!,
            name: this._name!,
            attribute: this._attribute!,
            isoTimeOrInterval: this._isoTimeOrInterval,
        };
        return retObj;
    }

    buildStatisticalAddress(): StatSurfAddr {
        if (this._addrType && this._addrType !== "STAT") {
            throw new Error("Address type is already set to another type than STAT");
        }

        if (this._statisticFunction == null) {
            throw new Error("Statistic function not set");
        }

        this.assertCommonPropertiesAreSet(true);

        const retObj: StatSurfAddr = {
            addressType: "STAT",
            caseUuid: this._caseUuid!,
            ensemble: this._ensemble!,
            name: this._name!,
            attribute: this._attribute!,
            statFunction: this._statisticFunction,
            statRealizations: null,
            isoTimeOrInterval: this._isoTimeOrInterval,
        };
        return retObj;
    }

    buildPartialAddress(): PartialSurfAddr {
        if (this._addrType && this._addrType !== "PARTIAL") {
            throw new Error("Address type is already set to another type than PARTIAL");
        }

        this.assertCommonPropertiesAreSet(true);

        const retObj: PartialSurfAddr = {
            addressType: "PARTIAL",
            caseUuid: this._caseUuid!,
            ensemble: this._ensemble!,
            name: this._name!,
            attribute: this._attribute!,
            isoTimeOrInterval: this._isoTimeOrInterval,
        };
        return retObj;
    }

    buildAddrString(): string {
        const addr = this.buildAddr();
        if (addr.addressType === "STAT") {
            throw new Error("Cannot build address string for STAT type");
        }

        return encodeSurfAddrStr(addr);
    }

    buildAddrStringNoThrow(): string | null {
        try {
            return this.buildAddrString();
        } catch (e) {
            return null;
        }
    }

    buildAddr(): RealSurfAddr | ObsSurfAddr | StatSurfAddr | PartialSurfAddr {
        if (!this._addrType) {
            throw new Error("Address type not set");
        }

        switch (this._addrType) {
            case "REAL":
                return this.buildRealizationAddress();
            case "OBS":
                return this.buildObservedAddress();
            case "STAT":
                return this.buildStatisticalAddress();
            case "PARTIAL":
                return this.buildPartialAddress();
            default:
                throw new Error("Invalid address type");
        }
    }

    buildAddrNoThrow(): RealSurfAddr | ObsSurfAddr | StatSurfAddr | PartialSurfAddr | null {
        try {
            return this.buildAddr();
        } catch (e) {
            return null;
        }
    }

    private assertCommonPropertiesAreSet(requireEnsemble: boolean): void {
        if (!this._caseUuid) {
            throw new Error("Case UUID not set");
        }
        if (requireEnsemble && !this._ensemble) {
            throw new Error("Ensemble name not set");
        }
        if (!this._name) {
            throw new Error("Surface name not set");
        }
        if (!this._attribute) {
            throw new Error("Surface attribute not set");
        }
    }
}

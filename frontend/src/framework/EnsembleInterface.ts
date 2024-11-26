import { EnsembleIdentInterface } from "./EnsembleIdentInterface";
import { EnsembleParameters } from "./EnsembleParameters";
import { EnsembleSensitivities } from "./EnsembleSensitivities";

export interface EnsembleInterface {
    getIdent(): EnsembleIdentInterface<any>;
    getDisplayName(): string;
    getEnsembleName(): string;
    getRealizations(): readonly number[];
    getRealizationCount(): number;
    getMaxRealizationNumber(): number | undefined;
    getParameters(): EnsembleParameters;
    getSensitivities(): EnsembleSensitivities | null;
    getColor(): string;
    getCustomName(): string | null;
}

import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { WellsSpecification } from "@modules/MapMatrix/types";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";
import { SmdaWellBoreAddress, WellBoreAddressFactory } from "@modules/_shared/WellBore/wellBoreAddress";

export type WellSelectProps = {
    ensembleIdent?: EnsembleIdent | null;
    wellsSpecification: WellsSpecification;
    onChange: (wellsSpecification: WellsSpecification) => void;
};
export function WellSelect(props: WellSelectProps): JSX.Element {
    const wellHeadersQuery = useWellHeadersQuery(props.ensembleIdent?.getCaseUuid());
    let wellHeaderOptions: SelectOption[] = [];

    if (wellHeadersQuery.data) {
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
    }
    const wellBoreAddressFactory = new WellBoreAddressFactory();

    function handleSmdaWellSelectionChange(selectedWells: string[]) {
        const smdaWellBoreAddresses: SmdaWellBoreAddress[] = selectedWells.map((uuid) => {
            return wellBoreAddressFactory.createSmdaAddress(uuid);
        });
        props.onChange({ ...props.wellsSpecification, smdaWellBoreAddresses });
    }

    function handleFilterTvdAboveChange(value: number) {
        props.onChange({ ...props.wellsSpecification, filterTvdAbove: value });
    }
    function handleFilterTvdBelowChange(value: number) {
        props.onChange({ ...props.wellsSpecification, filterTvdBelow: value });
    }
    function handleUseFilterAboveChange(value: boolean) {
        props.onChange({ ...props.wellsSpecification, useFilterTvdAbove: value });
    }
    function handleUseFilterBelowChange(value: boolean) {
        props.onChange({ ...props.wellsSpecification, useFilterTvdBelow: value });
    }
    return (
        <QueryStateWrapper
            queryResult={wellHeadersQuery}
            errorComponent={"Error loading wells"}
            loadingComponent={<CircularProgress />}
        >
            <Label text="Official Wells">
                <>
                    <div>
                        <Button
                            className="float-left m-2 text-xs py-0"
                            variant="outlined"
                            onClick={() => handleSmdaWellSelectionChange(wellHeaderOptions.map((well) => well.value))}
                        >
                            Select all
                        </Button>
                        <Button
                            className="m-2 text-xs py-0"
                            variant="outlined"
                            onClick={() => handleSmdaWellSelectionChange([])}
                        >
                            Select none
                        </Button>
                    </div>
                    Filter by TVD
                    <div className="items-center mt-2 flex flex-row">
                        <Checkbox
                            onChange={(e: any) => handleUseFilterAboveChange(e.target.checked)}
                            checked={props.wellsSpecification.useFilterTvdAbove}
                        />

                        <div className="ml-2 mr-1 py-0 whitespace-nowrap">Min</div>
                        <div>
                            <Input
                                disabled={!props.wellsSpecification.useFilterTvdAbove}
                                className="text-xs"
                                type="number"
                                value={props.wellsSpecification.filterTvdAbove ?? 0}
                                onChange={(e) => {
                                    handleFilterTvdAboveChange(parseFloat(e.target.value));
                                }}
                            />
                        </div>
                        <div className="ml-2 mr-1 py-0 whitespace-nowrap">
                            <Checkbox
                                onChange={(e: any) => handleUseFilterBelowChange(e.target.checked)}
                                checked={props.wellsSpecification.useFilterTvdBelow}
                            />
                        </div>
                        <div className="ml-2 mr-1 py-0 whitespace-nowrap">Max</div>
                        <div>
                            <Input
                                disabled={!props.wellsSpecification.useFilterTvdBelow}
                                className="text-xs"
                                type="number"
                                value={props.wellsSpecification.filterTvdBelow ?? 0}
                                onChange={(e) => {
                                    handleFilterTvdBelowChange(parseFloat(e.target.value));
                                }}
                            />
                        </div>
                    </div>
                    <Select
                        options={wellHeaderOptions}
                        value={props.wellsSpecification.smdaWellBoreAddresses.map((addr) => addr.uuid)}
                        onChange={handleSmdaWellSelectionChange}
                        size={10}
                        multiple={true}
                    />
                </>
            </Label>
        </QueryStateWrapper>
    );
}

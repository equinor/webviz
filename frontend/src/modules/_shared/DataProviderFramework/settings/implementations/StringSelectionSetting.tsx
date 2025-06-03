// import React from "react";

// import { DenseIconButton } from "@lib/components/DenseIconButton";
// import { Select, SelectOption } from "@lib/components/Select";
// import { Deselect, SelectAll } from "@mui/icons-material";

// import _ from "lodash";

// import { SettingDelegate } from "../../delegates/SettingDelegate";
// import { Setting, SettingComponentProps, ValueToStringArgs } from "../../interfaces";
// import { SettingRegistry } from "../SettingRegistry";
// import { SettingType } from "../settingsTypes";
// import { CustomSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";
// import { SettingCategory } from "../settingsDefinitions";

// type ValueType = string[] | null;

// export class StringSelectionSetting implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT> {
//     private _delegate: SettingDelegate<ValueType>;
//     private _label: string;
//     private _settingType: SettingType;
//     private _multiple: boolean;

//     constructor(label: string, settingType: SettingType, multiple: boolean) {
//         this._label = label;
//         this._settingType = settingType;
//         this._multiple = multiple ?? true;
//         this._delegate = new SettingDelegate<ValueType>(null, this);
//     }

//     // getConstructorParams?: (() => any[]) | undefined;
//     getConstructorParams(): any[] {
//         return [this._label, this._settingType, this._multiple];
//     }

//     getLabel(): string {
//         return this._label;
//     }

//     isMultiple(): boolean {
//         return this._multiple;
//     }

//     getType(): SettingType {
//         return this._settingType;
//     }
//     getDelegate(): SettingDelegate<ValueType> {
//         return this._delegate;
//     }

//     makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
//         const isMultiple = this._multiple;

//         const renderFunc = function StringSelectComp(props: SettingComponentProps<ValueType>) {
//             const options: SelectOption[] = React.useMemo(() => {
//                 return props.availableValues.map((stringVals) => ({
//                     value: stringVals,
//                     label: _.upperFirst(stringVals),
//                 }));
//             }, [props.availableValues]);

//             function handleChange(selectedUuids: string[]) {
//                 props.onValueChange(selectedUuids);
//             }

//             function selectAll() {
//                 handleChange(props.availableValues);
//             }

//             function selectNone() {
//                 handleChange([]);
//             }

//             return (
//                 <div className="flex flex-col gap-1 mt-1">
//                     {isMultiple && (
//                         <div className="flex items-center gap-2">
//                             <DenseIconButton onClick={selectAll} title="Select all">
//                                 <SelectAll fontSize="inherit" />
//                                 Select all
//                             </DenseIconButton>
//                             <DenseIconButton onClick={selectNone} title="Clear selection">
//                                 <Deselect fontSize="inherit" />
//                                 Clear selection
//                             </DenseIconButton>
//                         </div>
//                     )}
//                     <Select
//                         filter
//                         options={options}
//                         value={props.value ?? undefined}
//                         onChange={handleChange}
//                         disabled={props.isOverridden}
//                         multiple={isMultiple}
//                         size={5}
//                     />
//                 </div>
//             );
//         };
//         return renderFunc.bind(this);
//     }

//     fixupValue?: ((availableValues: any[], currentValue: ValueType) => ValueType) | undefined;
//     isValueValid?: ((availableValues: any[], value: ValueType) => boolean) | undefined;
//     serializeValue?: ((value: ValueType) => string) | undefined;
//     deserializeValue?: ((serializedValue: string) => ValueType) | undefined;
//     valueToString?: ((args: ValueToStringArgs<ValueType>) => string) | undefined;
// }

// SettingRegistry.registerSetting(StringSelectionSetting);

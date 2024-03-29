export type VectorDefinition = {
    type: string;
    description: string;
};

export type VectorDefinitionsType = {
    [key: string]: VectorDefinition;
};

export const vectorDefinitions: VectorDefinitionsType = {
    FWIP: {
        type: "field",
        description: "Water In Place",
    },
    FGIP: {
        type: "field",
        description: "Gas In Place (liquid+gas phase)",
    },
    FGIPG: {
        type: "field",
        description: "Gas In Place (gas phase)",
    },
    FGIPL: {
        type: "field",
        description: "Gas In Place (liquid phase)",
    },
    FOIP: {
        type: "field",
        description: "Oil In Place (liquid+gas phase)",
    },
    FOIPG: {
        type: "field",
        description: "Oil In Place (gas phase)",
    },
    FOIPL: {
        type: "field",
        description: "Oil In Place (liquid phase)",
    },
    FOPR: {
        type: "field",
        description: "Oil Production Rate",
    },
    FOPRA: {
        type: "field",
        description: "Oil Production Rate above GOC",
    },
    FOPRB: {
        type: "field",
        description: "Oil Production Rate below GOC",
    },
    FOPTA: {
        type: "field",
        description: "Oil Production Total above GOC",
    },
    FOPTB: {
        type: "field",
        description: "Oil Production Total below GOC",
    },
    FOPR1: {
        type: "field",
        description: "Oil Production Rate above GOC",
    },
    FOPR2: {
        type: "field",
        description: "Oil Production Rate below GOC",
    },
    FOPT1: {
        type: "field",
        description: "Oil Production Total above GOC",
    },
    FOPT2: {
        type: "field",
        description: "Oil Production Total below GOC",
    },
    FOMR: {
        type: "field",
        description: "Oil Mass Rate",
    },
    FOMT: {
        type: "field",
        description: "Oil Mass Total",
    },
    FODN: {
        type: "field",
        description: "Oil Density at Surface Conditions",
    },
    FOPRH: {
        type: "field",
        description: "Oil Production Rate History",
    },
    FOPRT: {
        type: "field",
        description: "Oil Production Rate Target/Limit",
    },
    FOPRF: {
        type: "field",
        description: "Free Oil Production Rate",
    },
    FOPRS: {
        type: "field",
        description: "Solution Oil Production Rate",
    },
    FOPT: {
        type: "field",
        description: "Oil Production Total",
    },
    FOPTH: {
        type: "field",
        description: "Oil Production Total History",
    },
    FOPTF: {
        type: "field",
        description: "Free Oil Production Total",
    },
    FOPTS: {
        type: "field",
        description: "Solution Oil Production Total",
    },
    FOIR: {
        type: "field",
        description: "Oil Injection Rate",
    },
    FOIRH: {
        type: "field",
        description: "Oil Injection Rate History",
    },
    FOIRT: {
        type: "field",
        description: "Oil Injection Rate Target/Limit",
    },
    FOIT: {
        type: "field",
        description: "Oil Injection Total",
    },
    FOITH: {
        type: "field",
        description: "Oil Injection Total History",
    },
    FOPP: {
        type: "field",
        description: "Oil Potential Production rate",
    },
    FOPP2: {
        type: "field",
        description: "Oil Potential Production rate",
    },
    FOPI: {
        type: "field",
        description: "Oil Potential Injection rate",
    },
    FOPI2: {
        type: "field",
        description: "Oil Potential Injection rate",
    },
    FOVPR: {
        type: "field",
        description: "Oil Voidage Production Rate",
    },
    FOVPT: {
        type: "field",
        description: "Oil Voidage Production Total",
    },
    FOVIR: {
        type: "field",
        description: "Oil Voidage Injection Rate",
    },
    FOVIT: {
        type: "field",
        description: "Oil Voidage Injection Total",
    },
    FOnPR: {
        type: "field",
        description: "nth separator stage oil rate",
    },
    FOnPT: {
        type: "field",
        description: "nth separator stage oil total",
    },
    FEOR: {
        type: "field",
        description: "Export Oil Rate",
    },
    FEOT: {
        type: "field",
        description: "Export Oil Total",
    },
    FEOMF: {
        type: "field",
        description: "Export Oil Mole Fraction",
    },
    FWPR: {
        type: "field",
        description: "Water Production Rate",
    },
    FWMR: {
        type: "field",
        description: "Water Mass Rate",
    },
    FWMT: {
        type: "field",
        description: "Water Mass Total",
    },
    FWPRH: {
        type: "field",
        description: "Water Production Rate History",
    },
    FWPRT: {
        type: "field",
        description: "Water Production Rate Target/Limit",
    },
    FWPT: {
        type: "field",
        description: "Water Production Total",
    },
    FWPTH: {
        type: "field",
        description: "Water Production Total History",
    },
    FWIR: {
        type: "field",
        description: "Water Injection Rate",
    },
    FWIRH: {
        type: "field",
        description: "Water Injection Rate History",
    },
    FWIRT: {
        type: "field",
        description: "Water Injection Rate Target/Limit",
    },
    FWIT: {
        type: "field",
        description: "Water Injection Total",
    },
    FWITH: {
        type: "field",
        description: "Water Injection Total History",
    },
    FWPP: {
        type: "field",
        description: "Water Potential Production rate",
    },
    FWPP2: {
        type: "field",
        description: "Water Potential Production rate",
    },
    FWPI: {
        type: "field",
        description: "Water Potential Injection rate",
    },
    FWPI2: {
        type: "field",
        description: "Water Potential Injection rate",
    },
    FWVPR: {
        type: "field",
        description: "Water Voidage Production Rate",
    },
    FWVPT: {
        type: "field",
        description: "Water Voidage Production Total",
    },
    FWVIR: {
        type: "field",
        description: "Water Voidage Injection Rate",
    },
    FWVIT: {
        type: "field",
        description: "Water Voidage Injection Total",
    },
    FWPIR: {
        type: "field",
        description: "Ratio of produced water to injected water (percentage)",
    },
    FWMPR: {
        type: "field",
        description: "Water component molar production rate",
    },
    FWMPT: {
        type: "field",
        description: "Water component molar production total",
    },
    FWMIR: {
        type: "field",
        description: "Water component molar injection rate",
    },
    FWMIT: {
        type: "field",
        description: "Water component molar injection total",
    },
    FGPR: {
        type: "field",
        description: "Gas Production Rate",
    },
    FGPRA: {
        type: "field",
        description: "Gas Production Rate above",
    },
    FGPRB: {
        type: "field",
        description: "Gas Production Rate below",
    },
    FGPTA: {
        type: "field",
        description: "Gas Production Total above",
    },
    FGPTB: {
        type: "field",
        description: "Gas Production Total below",
    },
    FGPR1: {
        type: "field",
        description: "Gas Production Rate above GOC",
    },
    FGPR2: {
        type: "field",
        description: "Gas Production Rate below GOC",
    },
    FGPT1: {
        type: "field",
        description: "Gas Production Total above GOC",
    },
    FGPT2: {
        type: "field",
        description: "Gas Production Total below GOC",
    },
    FGMR: {
        type: "field",
        description: "Gas Mass Rate",
    },
    FGMT: {
        type: "field",
        description: "Gas Mass Total",
    },
    FGDN: {
        type: "field",
        description: "Gas Density at Surface Conditions",
    },
    FGPRH: {
        type: "field",
        description: "Gas Production Rate History",
    },
    FGPRT: {
        type: "field",
        description: "Gas Production Rate Target/Limit",
    },
    FGPRF: {
        type: "field",
        description: "Free Gas Production Rate",
    },
    FGPRS: {
        type: "field",
        description: "Solution Gas Production Rate",
    },
    FGPT: {
        type: "field",
        description: "Gas Production Total",
    },
    FGPTH: {
        type: "field",
        description: "Gas Production Total History",
    },
    FGPTF: {
        type: "field",
        description: "Free Gas Production Total",
    },
    FGPTS: {
        type: "field",
        description: "Solution Gas Production Total",
    },
    FGIR: {
        type: "field",
        description: "Gas Injection Rate",
    },
    FGIRH: {
        type: "field",
        description: "Gas Injection Rate History",
    },
    FGIRT: {
        type: "field",
        description: "Gas Injection Rate Target/Limit",
    },
    FGIT: {
        type: "field",
        description: "Gas Injection Total",
    },
    FGITH: {
        type: "field",
        description: "Gas Injection Total History",
    },
    FGPP: {
        type: "field",
        description: "Gas Potential Production rate",
    },
    FGPP2: {
        type: "field",
        description: "Gas Potential Production rate",
    },
    FGPPS: {
        type: "field",
        description: "Solution",
    },
    FGPPS2: {
        type: "field",
        description: "Solution",
    },
    FGPPF: {
        type: "field",
        description: "Free Gas Potential Production rate",
    },
    FGPPF2: {
        type: "field",
        description: "Free Gas Potential Production rate",
    },
    FGPI: {
        type: "field",
        description: "Gas Potential Injection rate",
    },
    FGPI2: {
        type: "field",
        description: "Gas Potential Injection rate",
    },
    FSGR: {
        type: "field",
        description: "Sales Gas Rate",
    },
    FGSR: {
        type: "field",
        description: "Sales Gas Rate",
    },
    FSGT: {
        type: "field",
        description: "Sales Gas Total",
    },
    FGST: {
        type: "field",
        description: "Sales Gas Total",
    },
    FSMF: {
        type: "field",
        description: "Sales Gas Mole Fraction",
    },
    FFGR: {
        type: "field",
        description: "Fuel Gas Rate, at and below this group",
    },
    FFGT: {
        type: "field",
        description: "Fuel Gas cumulative Total, at and below this group",
    },
    FFMF: {
        type: "field",
        description: "Fuel Gas Mole Fraction",
    },
    FGCR: {
        type: "field",
        description: "Gas Consumption Rate, at and below this group",
    },
    FGCT: {
        type: "field",
        description: "Gas Consumption Total, at and below this group",
    },
    FGIMR: {
        type: "field",
        description: "Gas Import Rate, at and below this group",
    },
    FGIMT: {
        type: "field",
        description: "Gas Import Total, at and below this group",
    },
    FGLIR: {
        type: "field",
        description: "Gas Lift Injection Rate",
    },
    FWGPR: {
        type: "field",
        description: "Wet Gas Production Rate",
    },
    FWGPT: {
        type: "field",
        description: "Wet Gas Production Total",
    },
    FWGPRH: {
        type: "field",
        description: "Wet Gas Production Rate History",
    },
    FWGIR: {
        type: "field",
        description: "Wet Gas Injection Rate",
    },
    FWGIT: {
        type: "field",
        description: "Wet Gas Injection Total",
    },
    FEGR: {
        type: "field",
        description: "Export Gas Rate",
    },
    FEGT: {
        type: "field",
        description: "Export Gas Total",
    },
    FEMF: {
        type: "field",
        description: "Export Gas Mole Fraction",
    },
    FEXGR: {
        type: "field",
        description: "Excess Gas Rate",
    },
    FEXGT: {
        type: "field",
        description: "Excess Gas Total",
    },
    FRGR: {
        type: "field",
        description: "Re-injection Gas Rate",
    },
    FRGT: {
        type: "field",
        description: "Re-injection Gas Total",
    },
    FGnPR: {
        type: "field",
        description: "nth separator stage gas rate",
    },
    FGnPT: {
        type: "field",
        description: "nth separator stage gas total",
    },
    FGVPR: {
        type: "field",
        description: "Gas Voidage Production Rate",
    },
    FGVPT: {
        type: "field",
        description: "Gas Voidage Production Total",
    },
    FGVIR: {
        type: "field",
        description: "Gas Voidage Injection Rate",
    },
    FGVIT: {
        type: "field",
        description: "Gas Voidage Injection Total",
    },
    FLPR: {
        type: "field",
        description: "Liquid Production Rate",
    },
    FLPRH: {
        type: "field",
        description: "Liquid Production Rate History",
    },
    FLPRT: {
        type: "field",
        description: "Liquid Production Rate Target/Limit",
    },
    FLPT: {
        type: "field",
        description: "Liquid Production Total",
    },
    FLPTH: {
        type: "field",
        description: "Liquid Production Total History",
    },
    FVPR: {
        type: "field",
        description: "Res Volume Production Rate",
    },
    FVPRT: {
        type: "field",
        description: "Res Volume Production Rate Target/Limit",
    },
    FVPT: {
        type: "field",
        description: "Res Volume Production Total",
    },
    FVIR: {
        type: "field",
        description: "Res Volume Injection Rate",
    },
    FVIRT: {
        type: "field",
        description: "Res Volume Injection Rate Target/Limit",
    },
    FVIT: {
        type: "field",
        description: "Res Volume Injection Total",
    },
    FWCT: {
        type: "field",
        description: "Water Cut",
    },
    FWCTH: {
        type: "field",
        description: "Water Cut History",
    },
    FGOR: {
        type: "field",
        description: "Gas-Oil Ratio",
    },
    FGORH: {
        type: "field",
        description: "Gas-Oil Ratio History",
    },
    FOGR: {
        type: "field",
        description: "Oil-Gas Ratio",
    },
    FOGRH: {
        type: "field",
        description: "Oil-Gas Ratio History",
    },
    FWGR: {
        type: "field",
        description: "Water-Gas Ratio",
    },
    FWGRH: {
        type: "field",
        description: "Water-Gas Ratio History",
    },
    FGLR: {
        type: "field",
        description: "Gas-Liquid Ratio",
    },
    FGLRH: {
        type: "field",
        description: "Gas-Liquid Ratio History",
    },
    FMCTP: {
        type: "field",
        description: "Mode of Control for group Production",
    },
    FMCTW: {
        type: "field",
        description: "Mode of Control for group Water Injection",
    },
    FMCTG: {
        type: "field",
        description: "Mode of Control for group Gas Injection",
    },
    FMWPT: {
        type: "field",
        description: "Total number of production wells",
    },
    FMWPR: {
        type: "field",
        description: "Number of production wells currently flowing",
    },
    FMWPA: {
        type: "field",
        description: "Number of abandoned production wells",
    },
    FMWPU: {
        type: "field",
        description: "Number of unused production wells",
    },
    FMWPG: {
        type: "field",
        description: "Number of producers on group control",
    },
    FMWPO: {
        type: "field",
        description: "Number of producers controlled by own oil rate limit",
    },
    FMWPS: {
        type: "field",
        description: "Number of producers on own surface rate limit control",
    },
    FMWPV: {
        type: "field",
        description: "Number of producers on own reservoir volume rate limit control",
    },
    FMWPP: {
        type: "field",
        description: "Number of producers on pressure control",
    },
    FMWPL: {
        type: "field",
        description: "Number of producers using artificial lift",
    },
    FMWIT: {
        type: "field",
        description: "Total number of injection wells",
    },
    FMWIN: {
        type: "field",
        description: "Number of injection wells currently flowing",
    },
    FMWIA: {
        type: "field",
        description: "Number of abandoned injection wells",
    },
    FMWIU: {
        type: "field",
        description: "Number of unused injection wells",
    },
    FMWIG: {
        type: "field",
        description: "Number of injectors on group control",
    },
    FMWIS: {
        type: "field",
        description: "Number of injectors on own surface rate limit control",
    },
    FMWIV: {
        type: "field",
        description: "Number of injectors on own reservoir volume rate limit control",
    },
    FMWIP: {
        type: "field",
        description: "Number of injectors on pressure control",
    },
    FMWDR: {
        type: "field",
        description: "Number of drilling events this timestep",
    },
    FMWDT: {
        type: "field",
        description: "Number of drilling events in total",
    },
    FMWWO: {
        type: "field",
        description: "Number of workover events this timestep",
    },
    FMWWT: {
        type: "field",
        description: "Number of workover events in total",
    },
    FEPR: {
        type: "field",
        description: "Energy Production Rate",
    },
    FEPT: {
        type: "field",
        description: "Energy Production Total",
    },
    FNLPR: {
        type: "field",
        description: "NGL Production Rate",
    },
    FNLPT: {
        type: "field",
        description: "NGL Production Total",
    },
    FNLPRH: {
        type: "field",
        description: "NGL Production Rate History",
    },
    FNLPTH: {
        type: "field",
        description: "NGL Production Total History",
    },
    FAMF: {
        type: "field",
        description: "Component aqueous mole fraction, from producing completions",
    },
    FXMF: {
        type: "field",
        description: "Liquid Mole Fraction",
    },
    FYMF: {
        type: "field",
        description: "Vapor Mole Fraction",
    },
    FXMFn: {
        type: "field",
        description: "Liquid Mole Fraction for nth separator stage",
    },
    FYMFn: {
        type: "field",
        description: "Vapor Mole Fraction for nth separator stage",
    },
    FZMF: {
        type: "field",
        description: "Total Mole Fraction",
    },
    FCMPR: {
        type: "field",
        description: "Hydrocarbon Component Molar Production Rates",
    },
    FCMPT: {
        type: "field",
        description: "Hydrocarbon Component",
    },
    FCMIR: {
        type: "field",
        description: "Hydrocarbon Component Molar Injection Rates",
    },
    FCMIT: {
        type: "field",
        description: "Hydrocarbon Component Molar Injection Totals",
    },
    FHMIR: {
        type: "field",
        description: "Hydrocarbon Molar Injection Rate",
    },
    FHMIT: {
        type: "field",
        description: "Hydrocarbon Molar Injection Total",
    },
    FHMPR: {
        type: "field",
        description: "Hydrocarbon Molar Production Rate",
    },
    FHMPT: {
        type: "field",
        description: "Hydrocarbon Molar Production Total",
    },
    FCHMR: {
        type: "field",
        description: "Hydrocarbon Component",
    },
    FCHMT: {
        type: "field",
        description: "Hydrocarbon Component",
    },
    FCWGPR: {
        type: "field",
        description: "Hydrocarbon Component Wet Gas Production Rate",
    },
    FCWGPT: {
        type: "field",
        description: "Hydrocarbon Component Wet Gas Production Total",
    },
    FCWGIR: {
        type: "field",
        description: "Hydrocarbon Component Wet Gas Injection Rate",
    },
    FCWGIT: {
        type: "field",
        description: "Hydrocarbon Component Wet Gas Injection Total",
    },
    FCGMR: {
        type: "field",
        description: "Hydrocarbon component",
    },
    FCGMT: {
        type: "field",
        description: "Hydrocarbon component",
    },
    FCOMR: {
        type: "field",
        description: "Hydrocarbon component",
    },
    FCOMT: {
        type: "field",
        description: "Hydrocarbon component",
    },
    FCNMR: {
        type: "field",
        description: "Hydrocarbon component molar rates in the NGL phase",
    },
    FCNWR: {
        type: "field",
        description: "Hydrocarbon component mass rates in the NGL phase",
    },
    FCGMRn: {
        type: "field",
        description: "Hydrocarbon component molar rates in the gas phase for nth separator stage",
    },
    FCGRn: {
        type: "field",
        description: "Hydrocarbon component molar rates in the gas phase for nth separator stage",
    },
    FCOMRn: {
        type: "field",
        description: "Hydrocarbon component",
    },
    FCORn: {
        type: "field",
        description: "Hydrocarbon component",
    },
    FMUF: {
        type: "field",
        description: "Make-up fraction",
    },
    FAMR: {
        type: "field",
        description: "Make-up gas rate",
    },
    FAMT: {
        type: "field",
        description: "Make-up gas total",
    },
    FGSPR: {
        type: "field",
        description: "Target sustainable rate for most recent sustainable capacity test for gas",
    },
    FGSRL: {
        type: "field",
        description:
            "Maximum tested rate sustained for the test period during the most recent sustainable capacity test for gas",
    },
    FGSRU: {
        type: "field",
        description:
            "Minimum tested rate not sustained for the test period during the most recent sustainable capacity test for gas",
    },
    FGSSP: {
        type: "field",
        description:
            "Period for which target sustainable rate could be maintained for the most recent sustainable capacity test for gas",
    },
    FGSTP: {
        type: "field",
        description: "Test period for the most recent sustainable capacity test for gas",
    },
    FOSPR: {
        type: "field",
        description: "Target sustainable rate for most recent sustainable capacity test for oil",
    },
    FOSRL: {
        type: "field",
        description:
            "Maximum tested rate sustained for the test period during the most recent sustainable capacity test for oil",
    },
    FOSRU: {
        type: "field",
        description:
            "Minimum tested rate not sustained for the test period during the most recent sustainable capacity test for oil",
    },
    FOSSP: {
        type: "field",
        description:
            "Period for which target sustainable rate could be maintained for the most recent sustainable capacity test for oil",
    },
    FOSTP: {
        type: "field",
        description: "Test period for the most recent sustainable capacity test for oil",
    },
    FWSPR: {
        type: "field",
        description: "Target sustainable rate for most recent sustainable capacity test for water",
    },
    FWSRL: {
        type: "field",
        description:
            "Maximum tested rate sustained for the test period during the most recent sustainable capacity test for water",
    },
    FWSRU: {
        type: "field",
        description:
            "Minimum tested rate not sustained for the test period during the most recent sustainable capacity test for water",
    },
    FWSSP: {
        type: "field",
        description:
            "Period for which target sustainable rate could be maintained for the most recent sustainable capacity test for water",
    },
    FWSTP: {
        type: "field",
        description: "Test period for the most recent sustainable capacity test for water",
    },
    FGPRG: {
        type: "field",
        description: "Gas production rate",
    },
    FOPRG: {
        type: "field",
        description: "Oil production rate",
    },
    FNLPRG: {
        type: "field",
        description: "NGL production rate",
    },
    FXMFG: {
        type: "field",
        description: "Liquid mole fraction",
    },
    FYMFG: {
        type: "field",
        description: "Vapor mole fraction",
    },
    FCOMRG: {
        type: "field",
        description: "Hydrocarbon component",
    },
    FCGMRG: {
        type: "field",
        description: "Hydrocarbon component molar rates in the gas phase",
    },
    FCNMRG: {
        type: "field",
        description: "Hydrocarbon component molar rates in the NGL phase",
    },
    FPR: {
        type: "field",
        description: "Pressure average value",
    },
    FPRH: {
        type: "field",
        description: "Pressure average value",
    },
    FPRP: {
        type: "field",
        description: "Pressure average value",
    },
    FPRGZ: {
        type: "field",
        description: "P/Z",
    },
    FRS: {
        type: "field",
        description: "Gas-oil ratio",
    },
    FRV: {
        type: "field",
        description: "Oil-gas ratio",
    },
    FCHIP: {
        type: "field",
        description: "Component Hydrocarbon as Wet Gas",
    },
    FCMIP: {
        type: "field",
        description: "Component Hydrocarbon as Moles",
    },
    FPPC: {
        type: "field",
        description: "Initial Contact Corrected Potential",
    },
    FREAC: {
        type: "field",
        description: "Reaction rate. The reaction number is given as a component index",
    },
    FREAT: {
        type: "field",
        description: "Reaction total. The reaction number is given as a component index",
    },
    FRPV: {
        type: "field",
        description: "Pore Volume at Reservoir conditions",
    },
    FOPV: {
        type: "field",
        description: "Pore Volume containing Oil",
    },
    FWPV: {
        type: "field",
        description: "Pore Volume containing Water",
    },
    FGPV: {
        type: "field",
        description: "Pore Volume containing Gas",
    },
    FHPV: {
        type: "field",
        description: "Pore Volume containing Hydrocarbon",
    },
    FRTM: {
        type: "field",
        description: "Transmissibility Multiplier associated with rock compaction",
    },
    FOE: {
        type: "field",
        description: "(OIP(initial) - OIP(now)) / OIP(initial)",
    },
    FOEW: {
        type: "field",
        description: "Oil Production from Wells / OIP(initial)",
    },
    FOEIW: {
        type: "field",
        description: "(OIP(initial) - OIP(now)) / Initial Mobile Oil with respect to Water",
    },
    FOEWW: {
        type: "field",
        description: "Oil Production from Wells / Initial Mobile Oil with respect to Water",
    },
    FOEIG: {
        type: "field",
        description: "(OIP(initial) - OIP(now)) / Initial Mobile Oil with respect to Gas",
    },
    FOEWG: {
        type: "field",
        description: "Oil Production from Wells / Initial Mobile Oil with respect to Gas",
    },
    FORMR: {
        type: "field",
        description: "Total stock tank oil produced by rock compaction",
    },
    FORMW: {
        type: "field",
        description: "Total stock tank oil produced by water influx",
    },
    FORMG: {
        type: "field",
        description: "Total stock tank oil produced by gas influx",
    },
    FORME: {
        type: "field",
        description: "Total stock tank oil produced by oil expansion",
    },
    FORMS: {
        type: "field",
        description: "Total stock tank oil produced by solution gas",
    },
    FORMF: {
        type: "field",
        description: "Total stock tank oil produced by free gas influx",
    },
    FORMX: {
        type: "field",
        description: "Total stock tank oil produced by 'traced' water influx",
    },
    FORMY: {
        type: "field",
        description: "Total stock tank oil produced by other water influx",
    },
    FORFR: {
        type: "field",
        description: "Fraction of total oil produced by rock compaction",
    },
    FORFW: {
        type: "field",
        description: "Fraction of total oil produced by water influx",
    },
    FORFG: {
        type: "field",
        description: "Fraction of total oil produced by gas influx",
    },
    FORFE: {
        type: "field",
        description: "Fraction of total oil produced by oil expansion",
    },
    FORFS: {
        type: "field",
        description: "Fraction of total oil produced by solution gas",
    },
    FORFF: {
        type: "field",
        description: "Fraction of total oil produced by free gas influx",
    },
    FORFX: {
        type: "field",
        description: "Fraction of total oil produced by 'traced' water influx",
    },
    FORFY: {
        type: "field",
        description: "Fraction of total oil produced by other water influx",
    },
    FAQR: {
        type: "field",
        description: "Aquifer influx rate",
    },
    FAQT: {
        type: "field",
        description: "Cumulative aquifer influx",
    },
    FAQRG: {
        type: "field",
        description: "Aquifer influx rate",
    },
    FAQTG: {
        type: "field",
        description: "Cumulative aquifer influx",
    },
    FAQER: {
        type: "field",
        description: "Aquifer thermal energy influx rate",
    },
    FAQET: {
        type: "field",
        description: "Cumulative aquifer thermal energy influx",
    },
    FNQR: {
        type: "field",
        description: "Aquifer influx rate",
    },
    FNQT: {
        type: "field",
        description: "Cumulative aquifer influx",
    },
    FTMR: {
        type: "field",
        description: "Traced mass Rate",
    },
    FTMT: {
        type: "field",
        description: "Traced mass Total",
    },
    FTQR: {
        type: "field",
        description: "Traced molar Rate",
    },
    FTCM: {
        type: "field",
        description: "Tracer Carrier molar Rate",
    },
    FTMF: {
        type: "field",
        description: "Traced molar fraction",
    },
    FTVL: {
        type: "field",
        description: "Traced liquid volume rate",
    },
    FTVV: {
        type: "field",
        description: "Traced vapor volume rate",
    },
    FTTL: {
        type: "field",
        description: "Traced liquid volume total",
    },
    FTTV: {
        type: "field",
        description: "Traced vapor volume total",
    },
    FTML: {
        type: "field",
        description: "Traced mass liquid rate",
    },
    FTMV: {
        type: "field",
        description: "Traced mass vapor rate",
    },
    FTLM: {
        type: "field",
        description: "Traced mass liquid total",
    },
    FTVM: {
        type: "field",
        description: "Traced mass vapor total",
    },
    FAPI: {
        type: "field",
        description: "Oil API",
    },
    FSPR: {
        type: "field",
        description: "Salt Production Rate",
    },
    FSPT: {
        type: "field",
        description: "Salt Production Total",
    },
    FSIR: {
        type: "field",
        description: "Salt Injection Rate",
    },
    FSIT: {
        type: "field",
        description: "Salt Injection Total",
    },
    FSPC: {
        type: "field",
        description: "Salt Production Concentration",
    },
    FSIC: {
        type: "field",
        description: "Salt Injection Concentration",
    },
    FSIP: {
        type: "field",
        description: "Salt In Place",
    },
    GTPRANI: {
        type: "field",
        description: "Anion Production Rate",
    },
    GTPTANI: {
        type: "field",
        description: "Anion Production Total",
    },
    GTIRANI: {
        type: "field",
        description: "Anion Injection Rate",
    },
    GTITANI: {
        type: "field",
        description: "Anion Injection Total",
    },
    GTPRCAT: {
        type: "field",
        description: "Cation Production Rate",
    },
    GTPTCAT: {
        type: "field",
        description: "Cation Production Total",
    },
    GTIRCAT: {
        type: "field",
        description: "Cation Injection Rate",
    },
    GTITCAT: {
        type: "field",
        description: "Cation Injection Total",
    },
    FTPCHEA: {
        type: "field",
        description: "Production Temperature",
    },
    FTICHEA: {
        type: "field",
        description: "Injection Temperature",
    },
    FTPRHEA: {
        type: "field",
        description: "Energy flows",
    },
    FTPTHEA: {
        type: "field",
        description: "Energy Production Total",
    },
    FTIRHEA: {
        type: "field",
        description: "Energy flows",
    },
    FTITHEA: {
        type: "field",
        description: "Energy Injection Total",
    },
    FTIPTHEA: {
        type: "field",
        description: "Difference in Energy in place between current and initial time",
    },
    FTPR: {
        type: "field",
        description: "Tracer Production Rate",
    },
    FTPT: {
        type: "field",
        description: "Tracer Production Total",
    },
    FTPC: {
        type: "field",
        description: "Tracer Production Concentration",
    },
    FTIR: {
        type: "field",
        description: "Tracer Injection Rate",
    },
    FTIT: {
        type: "field",
        description: "Tracer Injection Total",
    },
    FTIC: {
        type: "field",
        description: "Tracer Injection Concentration",
    },
    FTIPT: {
        type: "field",
        description: "Tracer In Place",
    },
    FTIPF: {
        type: "field",
        description: "Tracer In Place",
    },
    FTIPS: {
        type: "field",
        description: "Tracer In Place",
    },
    "FTIP#": {
        type: "field",
        description: " Tracer In Place in phase # (1,2,3,...)",
    },
    FTADS: {
        type: "field",
        description: "Tracer Adsorption total",
    },
    FTDCY: {
        type: "field",
        description: "Decayed tracer",
    },
    FTIRF: {
        type: "field",
        description: "Tracer Injection Rate",
    },
    FTIRS: {
        type: "field",
        description: "Tracer Injection Rate",
    },
    FTPRF: {
        type: "field",
        description: "Tracer Production Rate",
    },
    FTPRS: {
        type: "field",
        description: "Tracer Production Rate",
    },
    FTITF: {
        type: "field",
        description: "Tracer Injection Total",
    },
    FTITS: {
        type: "field",
        description: "Tracer Injection Total",
    },
    FTPTF: {
        type: "field",
        description: "Tracer Production Total",
    },
    FTPTS: {
        type: "field",
        description: "Tracer Production Total",
    },
    FTICF: {
        type: "field",
        description: "Tracer Injection Concentration",
    },
    FTICS: {
        type: "field",
        description: "Tracer Injection Concentration",
    },
    FTPCF: {
        type: "field",
        description: "Tracer Production",
    },
    FTPCS: {
        type: "field",
        description: "Tracer Production",
    },
    FMPR: {
        type: "field",
        description: "Methane Production Rate",
    },
    FMPT: {
        type: "field",
        description: "Methane Production Total",
    },
    FMIR: {
        type: "field",
        description: "Methane Injection Rate",
    },
    FMIT: {
        type: "field",
        description: "Methane Injection Total",
    },
    FCGC: {
        type: "field",
        description: "Bulk Coal Gas Concentration",
    },
    FCSC: {
        type: "field",
        description: "Bulk Coal Solvent Concentration",
    },
    FTPRFOA: {
        type: "field",
        description: "Production Rate",
    },
    FTPTFOA: {
        type: "field",
        description: "Production Total",
    },
    FTIRFOA: {
        type: "field",
        description: "Injection Rate",
    },
    FTITFOA: {
        type: "field",
        description: "Injection Total",
    },
    FTIPTFOA: {
        type: "field",
        description: "In Solution",
    },
    FTADSFOA: {
        type: "field",
        description: "Adsorption total",
    },
    FTDCYFOA: {
        type: "field",
        description: "Decayed tracer",
    },
    FTMOBFOA: {
        type: "field",
        description: "Gas mobility factor",
    },
    FGDC: {
        type: "field",
        description: "Gas Delivery Capacity",
    },
    FGDCQ: {
        type: "field",
        description: "Field/Group Gas DCQ",
    },
    FGCV: {
        type: "field",
        description: "Gas Calorific Value",
    },
    FGQ: {
        type: "field",
        description: "Gas molar Quality",
    },
    FESR: {
        type: "field",
        description: "Energy Sales Rate",
    },
    FEST: {
        type: "field",
        description: "Energy Sales Total",
    },
    FEDC: {
        type: "field",
        description: "Energy Delivery Capacity",
    },
    FEDCQ: {
        type: "field",
        description: "Energy DCQ",
    },
    FCPR: {
        type: "field",
        description: "Polymer Production Rate",
    },
    FCPC: {
        type: "field",
        description: "Polymer Production Concentration",
    },
    FCPT: {
        type: "field",
        description: "Polymer Production Total",
    },
    FCIR: {
        type: "field",
        description: "Polymer Injection Rate",
    },
    FCIC: {
        type: "field",
        description: "Polymer Injection Concentration",
    },
    FCIT: {
        type: "field",
        description: "Polymer Injection Total",
    },
    FCIP: {
        type: "field",
        description: "Polymer In Solution",
    },
    FCAD: {
        type: "field",
        description: "Polymer Adsorption total",
    },
    PSSPR: {
        type: "field",
        description: "Log of the pressure change per unit time",
    },
    PSSSO: {
        type: "field",
        description: "Log of the oil saturation change per unit time",
    },
    PSSSW: {
        type: "field",
        description: "Log of the water saturation change per unit time",
    },
    PSSSG: {
        type: "field",
        description: "Log of the gas saturation change per unit time",
    },
    PSSSC: {
        type: "field",
        description: "Log of the salt concentration change per unit time",
    },
    FNPR: {
        type: "field",
        description: "Solvent Production Rate",
    },
    FNPT: {
        type: "field",
        description: "Solvent Production Total",
    },
    FNIR: {
        type: "field",
        description: "Solvent Injection Rate",
    },
    FNIT: {
        type: "field",
        description: "Solvent Injection Total",
    },
    FNIP: {
        type: "field",
        description: "Solvent In Place",
    },
    FTPRSUR: {
        type: "field",
        description: "Production Rate",
    },
    FTPTSUR: {
        type: "field",
        description: "Production Total",
    },
    FTIRSUR: {
        type: "field",
        description: "Injection Rate",
    },
    FTITSUR: {
        type: "field",
        description: "Injection Total",
    },
    FTIPTSUR: {
        type: "field",
        description: "In Solution",
    },
    FTADSUR: {
        type: "field",
        description: "Adsorption total",
    },
    FTPRALK: {
        type: "field",
        description: "Production Rate",
    },
    FTPTALK: {
        type: "field",
        description: "Production Total",
    },
    FTIRALK: {
        type: "field",
        description: "Injection Rate",
    },
    FTITALK: {
        type: "field",
        description: "Injection Total",
    },
    FU: {
        type: "field",
        description: "User-defined field quantity",
    },
    GOPR: {
        type: "group",
        description: "Oil Production Rate",
    },
    GOPRA: {
        type: "group",
        description: "Oil Production Rate above GOC",
    },
    GOPRB: {
        type: "group",
        description: "Oil Production Rate below GOC",
    },
    GOPTA: {
        type: "group",
        description: "Oil Production Total above GOC",
    },
    GOPTB: {
        type: "group",
        description: "Oil Production Total below GOC",
    },
    GOPR1: {
        type: "group",
        description: "Oil Production Rate above GOC",
    },
    GOPR2: {
        type: "group",
        description: "Oil Production Rate below GOC",
    },
    GOPT1: {
        type: "group",
        description: "Oil Production Total above GOC",
    },
    GOPT2: {
        type: "group",
        description: "Oil Production Total below GOC",
    },
    GOMR: {
        type: "group",
        description: "Oil Mass Rate",
    },
    GOMT: {
        type: "group",
        description: "Oil Mass Total",
    },
    GODN: {
        type: "group",
        description: "Oil Density at Surface Conditions",
    },
    GOPRH: {
        type: "group",
        description: "Oil Production Rate History",
    },
    GOPRT: {
        type: "group",
        description: "Oil Production Rate Target/Limit",
    },
    GOPRL: {
        type: "group",
        description: "Oil Production Rate Target/Limit",
    },
    GOPRF: {
        type: "group",
        description: "Free Oil Production Rate",
    },
    GOPRS: {
        type: "group",
        description: "Solution Oil Production Rate",
    },
    GOPT: {
        type: "group",
        description: "Oil Production Total",
    },
    GOPTH: {
        type: "group",
        description: "Oil Production Total History",
    },
    GOPTF: {
        type: "group",
        description: "Free Oil Production Total",
    },
    GOPTS: {
        type: "group",
        description: "Solution Oil Production Total",
    },
    GOIR: {
        type: "group",
        description: "Oil Injection Rate",
    },
    GOIRH: {
        type: "group",
        description: "Oil Injection Rate History",
    },
    GOIRT: {
        type: "group",
        description: "Oil Injection Rate Target/Limit",
    },
    GOIRL: {
        type: "group",
        description: "Oil Injection Rate Target/Limit",
    },
    GOIT: {
        type: "group",
        description: "Oil Injection Total",
    },
    GOITH: {
        type: "group",
        description: "Oil Injection Total History",
    },
    GOPP: {
        type: "group",
        description: "Oil Potential Production rate",
    },
    GOPP2: {
        type: "group",
        description: "Oil Potential Production rate",
    },
    GOPI: {
        type: "group",
        description: "Oil Potential Injection rate",
    },
    GOPI2: {
        type: "group",
        description: "Oil Potential Injection rate",
    },
    GOPGR: {
        type: "group",
        description: "Oil Production Guide Rate",
    },
    GOIGR: {
        type: "group",
        description: "Oil Injection Guide Rate",
    },
    GOVPR: {
        type: "group",
        description: "Oil Voidage Production Rate",
    },
    GOVPT: {
        type: "group",
        description: "Oil Voidage Production Total",
    },
    GOVIR: {
        type: "group",
        description: "Oil Voidage Injection Rate",
    },
    GOVIT: {
        type: "group",
        description: "Oil Voidage Injection Total",
    },
    GOnPR: {
        type: "group",
        description: "nth separator stage oil rate",
    },
    GOnPT: {
        type: "group",
        description: "nth separator stage oil total",
    },
    GEOR: {
        type: "group",
        description: "Export Oil Rate",
    },
    GEOT: {
        type: "group",
        description: "Export Oil Total",
    },
    GEOMF: {
        type: "group",
        description: "Export Oil Mole Fraction",
    },
    GWPR: {
        type: "group",
        description: "Water Production Rate",
    },
    GWMR: {
        type: "group",
        description: "Water Mass Rate",
    },
    GWMT: {
        type: "group",
        description: "Water Mass Total",
    },
    GWPRH: {
        type: "group",
        description: "Water Production Rate History",
    },
    GWPRT: {
        type: "group",
        description: "Water Production Rate Target/Limit",
    },
    GWPRL: {
        type: "group",
        description: "Water Production Rate Target/Limit",
    },
    GWPT: {
        type: "group",
        description: "Water Production Total",
    },
    GWPTH: {
        type: "group",
        description: "Water Production Total History",
    },
    GWIR: {
        type: "group",
        description: "Water Injection Rate",
    },
    GWIRH: {
        type: "group",
        description: "Water Injection Rate History",
    },
    GWIRT: {
        type: "group",
        description: "Water Injection Rate Target/Limit",
    },
    GWIRL: {
        type: "group",
        description: "Water Injection Rate Target/Limit",
    },
    GWIT: {
        type: "group",
        description: "Water Injection Total",
    },
    GWITH: {
        type: "group",
        description: "Water Injection Total History",
    },
    GWPP: {
        type: "group",
        description: "Water Potential Production rate",
    },
    GWPP2: {
        type: "group",
        description: "Water Potential Production rate",
    },
    GWPI: {
        type: "group",
        description: "Water Potential Injection rate",
    },
    GWPI2: {
        type: "group",
        description: "Water Potential Injection rate",
    },
    GWPGR: {
        type: "group",
        description: "Water Production Guide Rate",
    },
    GWIGR: {
        type: "group",
        description: "Water Injection Guide Rate",
    },
    GWVPR: {
        type: "group",
        description: "Water Voidage Production Rate",
    },
    GWVPT: {
        type: "group",
        description: "Water Voidage Production Total",
    },
    GWVIR: {
        type: "group",
        description: "Water Voidage Injection Rate",
    },
    GWVIT: {
        type: "group",
        description: "Water Voidage Injection Total",
    },
    GWPIR: {
        type: "group",
        description: "Ratio of produced water to injected water (percentage)",
    },
    GWMPR: {
        type: "group",
        description: "Water component molar production rate",
    },
    GWMPT: {
        type: "group",
        description: "Water component molar production total",
    },
    GWMIR: {
        type: "group",
        description: "Water component molar injection rate",
    },
    GWMIT: {
        type: "group",
        description: "Water component molar injection total",
    },
    GGPR: {
        type: "group",
        description: "Gas Production Rate",
    },
    GGPRA: {
        type: "group",
        description: "Gas Production Rate above",
    },
    GGPRB: {
        type: "group",
        description: "Gas Production Rate below",
    },
    GGPTA: {
        type: "group",
        description: "Gas Production Total above",
    },
    GGPTB: {
        type: "group",
        description: "Gas Production Total below",
    },
    GGPR1: {
        type: "group",
        description: "Gas Production Rate above GOC",
    },
    GGPR2: {
        type: "group",
        description: "Gas Production Rate below GOC",
    },
    GGPT1: {
        type: "group",
        description: "Gas Production Total above GOC",
    },
    GGPT2: {
        type: "group",
        description: "Gas Production Total below GOC",
    },
    GGMR: {
        type: "group",
        description: "Gas Mass Rate",
    },
    GGMT: {
        type: "group",
        description: "Gas Mass Total",
    },
    GGDN: {
        type: "group",
        description: "Gas Density at Surface Conditions",
    },
    GGPRH: {
        type: "group",
        description: "Gas Production Rate History",
    },
    GGPRT: {
        type: "group",
        description: "Gas Production Rate Target/Limit",
    },
    GGPRL: {
        type: "group",
        description: "Gas Production Rate Target/Limit",
    },
    GGPRF: {
        type: "group",
        description: "Free Gas Production Rate",
    },
    GGPRS: {
        type: "group",
        description: "Solution Gas Production Rate",
    },
    GGPT: {
        type: "group",
        description: "Gas Production Total",
    },
    GGPTH: {
        type: "group",
        description: "Gas Production Total History",
    },
    GGPTF: {
        type: "group",
        description: "Free Gas Production Total",
    },
    GGPTS: {
        type: "group",
        description: "Solution Gas Production Total",
    },
    GGIR: {
        type: "group",
        description: "Gas Injection Rate",
    },
    GGIRH: {
        type: "group",
        description: "Gas Injection Rate History",
    },
    GGIRT: {
        type: "group",
        description: "Gas Injection Rate Target/Limit",
    },
    GGIRL: {
        type: "group",
        description: "Gas Injection Rate Target/Limit",
    },
    GGIT: {
        type: "group",
        description: "Gas Injection Total",
    },
    GGITH: {
        type: "group",
        description: "Gas Injection Total History",
    },
    GGPP: {
        type: "group",
        description: "Gas Potential Production rate",
    },
    GGPP2: {
        type: "group",
        description: "Gas Potential Production rate",
    },
    GGPPS: {
        type: "group",
        description: "Solution",
    },
    GGPPS2: {
        type: "group",
        description: "Solution",
    },
    GGPPF: {
        type: "group",
        description: "Free Gas Potential Production rate",
    },
    GGPPF2: {
        type: "group",
        description: "Free Gas Potential Production rate",
    },
    GGPI: {
        type: "group",
        description: "Gas Potential Injection rate",
    },
    GGPI2: {
        type: "group",
        description: "Gas Potential Injection rate",
    },
    GGPGR: {
        type: "group",
        description: "Gas Production Guide Rate",
    },
    GGIGR: {
        type: "group",
        description: "Gas Injection Guide Rate",
    },
    GSGR: {
        type: "group",
        description: "Sales Gas Rate",
    },
    GGSR: {
        type: "group",
        description: "Sales Gas Rate",
    },
    GSGT: {
        type: "group",
        description: "Sales Gas Total",
    },
    GGST: {
        type: "group",
        description: "Sales Gas Total",
    },
    GSMF: {
        type: "group",
        description: "Sales Gas Mole Fraction",
    },
    GFGR: {
        type: "group",
        description: "Fuel Gas Rate, at and below this group",
    },
    GFGT: {
        type: "group",
        description: "Fuel Gas cumulative Total, at and below this group",
    },
    GFMF: {
        type: "group",
        description: "Fuel Gas Mole Fraction",
    },
    GGCR: {
        type: "group",
        description: "Gas Consumption Rate, at and below this group",
    },
    GGCT: {
        type: "group",
        description: "Gas Consumption Total, at and below this group",
    },
    GGIMR: {
        type: "group",
        description: "Gas Import Rate, at and below this group",
    },
    GGIMT: {
        type: "group",
        description: "Gas Import Total, at and below this group",
    },
    GGLIR: {
        type: "group",
        description: "Gas Lift Injection Rate",
    },
    GWGPR: {
        type: "group",
        description: "Wet Gas Production Rate",
    },
    GWGPT: {
        type: "group",
        description: "Wet Gas Production Total",
    },
    GWGPRH: {
        type: "group",
        description: "Wet Gas Production Rate History",
    },
    GWGIR: {
        type: "group",
        description: "Wet Gas Injection Rate",
    },
    GWGIT: {
        type: "group",
        description: "Wet Gas Injection Total",
    },
    GEGR: {
        type: "group",
        description: "Export Gas Rate",
    },
    GEGT: {
        type: "group",
        description: "Export Gas Total",
    },
    GEMF: {
        type: "group",
        description: "Export Gas Mole Fraction",
    },
    GEXGR: {
        type: "group",
        description: "Excess Gas Rate",
    },
    GEXGT: {
        type: "group",
        description: "Excess Gas Total",
    },
    GRGR: {
        type: "group",
        description: "Re-injection Gas Rate",
    },
    GRGT: {
        type: "group",
        description: "Re-injection Gas Total",
    },
    GGnPR: {
        type: "group",
        description: "nth separator stage gas rate",
    },
    GGnPT: {
        type: "group",
        description: "nth separator stage gas total",
    },
    GGVPR: {
        type: "group",
        description: "Gas Voidage Production Rate",
    },
    GGVPT: {
        type: "group",
        description: "Gas Voidage Production Total",
    },
    GGVIR: {
        type: "group",
        description: "Gas Voidage Injection Rate",
    },
    GGVIT: {
        type: "group",
        description: "Gas Voidage Injection Total",
    },
    GGQ: {
        type: "group",
        description: "Gas Quality",
    },
    GLPR: {
        type: "group",
        description: "Liquid Production Rate",
    },
    GLPRH: {
        type: "group",
        description: "Liquid Production Rate History",
    },
    GLPRT: {
        type: "group",
        description: "Liquid Production Rate Target/Limit",
    },
    GLPRL: {
        type: "group",
        description: "Liquid Production Rate Target/Limit",
    },
    GLPT: {
        type: "group",
        description: "Liquid Production Total",
    },
    GLPTH: {
        type: "group",
        description: "Liquid Production Total History",
    },
    GVPR: {
        type: "group",
        description: "Res Volume Production Rate",
    },
    GVPRT: {
        type: "group",
        description: "Res Volume Production Rate Target/Limit",
    },
    GVPRL: {
        type: "group",
        description: "Res Volume Production Rate Target/Limit",
    },
    GVPT: {
        type: "group",
        description: "Res Volume Production Total",
    },
    GVPGR: {
        type: "group",
        description: "Res Volume Production Guide Rate",
    },
    GVIR: {
        type: "group",
        description: "Res Volume Injection Rate",
    },
    GVIRT: {
        type: "group",
        description: "Res Volume Injection Rate Target/Limit",
    },
    GVIRL: {
        type: "group",
        description: "Res Volume Injection Rate Target/Limit",
    },
    GVIT: {
        type: "group",
        description: "Res Volume Injection Total",
    },
    GWCT: {
        type: "group",
        description: "Water Cut",
    },
    GWCTH: {
        type: "group",
        description: "Water Cut History",
    },
    GGOR: {
        type: "group",
        description: "Gas-Oil Ratio",
    },
    GGORH: {
        type: "group",
        description: "Gas-Oil Ratio History",
    },
    GOGR: {
        type: "group",
        description: "Oil-Gas Ratio",
    },
    GOGRH: {
        type: "group",
        description: "Oil-Gas Ratio History",
    },
    GWGR: {
        type: "group",
        description: "Water-Gas Ratio",
    },
    GWGRH: {
        type: "group",
        description: "Water-Gas Ratio History",
    },
    GGLR: {
        type: "group",
        description: "Gas-Liquid Ratio",
    },
    GGLRH: {
        type: "group",
        description: "Gas-Liquid Ratio History",
    },
    GMCTP: {
        type: "group",
        description: "Mode of Control for group Production",
    },
    GMCTW: {
        type: "group",
        description: "Mode of Control for group Water Injection",
    },
    GMCTG: {
        type: "group",
        description: "Mode of Control for group Gas Injection",
    },
    GMWPT: {
        type: "group",
        description: "Total number of production wells",
    },
    GMWPR: {
        type: "group",
        description: "Number of production wells currently flowing",
    },
    GMWPA: {
        type: "group",
        description: "Number of abandoned production wells",
    },
    GMWPU: {
        type: "group",
        description: "Number of unused production wells",
    },
    GMWPG: {
        type: "group",
        description: "Number of producers on group control",
    },
    GMWPO: {
        type: "group",
        description: "Number of producers controlled by own oil rate limit",
    },
    GMWPS: {
        type: "group",
        description: "Number of producers on own surface rate limit control",
    },
    GMWPV: {
        type: "group",
        description: "Number of producers on own reservoir volume rate limit control",
    },
    GMWPP: {
        type: "group",
        description: "Number of producers on pressure control",
    },
    GMWPL: {
        type: "group",
        description: "Number of producers using artificial lift",
    },
    GMWIT: {
        type: "group",
        description: "Total number of injection wells",
    },
    GMWIN: {
        type: "group",
        description: "Number of injection wells currently flowing",
    },
    GMWIA: {
        type: "group",
        description: "Number of abandoned injection wells",
    },
    GMWIU: {
        type: "group",
        description: "Number of unused injection wells",
    },
    GMWIG: {
        type: "group",
        description: "Number of injectors on group control",
    },
    GMWIS: {
        type: "group",
        description: "Number of injectors on own surface rate limit control",
    },
    GMWIV: {
        type: "group",
        description: "Number of injectors on own reservoir volume rate limit control",
    },
    GMWIP: {
        type: "group",
        description: "Number of injectors on pressure control",
    },
    GMWDR: {
        type: "group",
        description: "Number of drilling events this timestep",
    },
    GMWDT: {
        type: "group",
        description: "Number of drilling events in total",
    },
    GMWWO: {
        type: "group",
        description: "Number of workover events this timestep",
    },
    GMWWT: {
        type: "group",
        description: "Number of workover events in total",
    },
    GEPR: {
        type: "group",
        description: "Energy Production Rate",
    },
    GEPT: {
        type: "group",
        description: "Energy Production Total",
    },
    GEFF: {
        type: "group",
        description: "Efficiency Factor",
    },
    GNLPR: {
        type: "group",
        description: "NGL Production Rate",
    },
    GNLPT: {
        type: "group",
        description: "NGL Production Total",
    },
    GNLPRH: {
        type: "group",
        description: "NGL Production Rate History",
    },
    GNLPTH: {
        type: "group",
        description: "NGL Production Total History",
    },
    GAMF: {
        type: "group",
        description: "Component aqueous mole fraction, from producing completions",
    },
    GXMF: {
        type: "group",
        description: "Liquid Mole Fraction",
    },
    GYMF: {
        type: "group",
        description: "Vapor Mole Fraction",
    },
    GXMFn: {
        type: "group",
        description: "Liquid Mole Fraction for nth separator stage",
    },
    GYMFn: {
        type: "group",
        description: "Vapor Mole Fraction for nth separator stage",
    },
    GZMF: {
        type: "group",
        description: "Total Mole Fraction",
    },
    GCMPR: {
        type: "group",
        description: "Hydrocarbon Component Molar Production Rates",
    },
    GCMPT: {
        type: "group",
        description: "Hydrocarbon Component",
    },
    GCMIR: {
        type: "group",
        description: "Hydrocarbon Component Molar Injection Rates",
    },
    GCMIT: {
        type: "group",
        description: "Hydrocarbon Component Molar Injection Totals",
    },
    GHMIR: {
        type: "group",
        description: "Hydrocarbon Molar Injection Rate",
    },
    GHMIT: {
        type: "group",
        description: "Hydrocarbon Molar Injection Total",
    },
    GHMPR: {
        type: "group",
        description: "Hydrocarbon Molar Production Rate",
    },
    GHMPT: {
        type: "group",
        description: "Hydrocarbon Molar Production Total",
    },
    GCHMR: {
        type: "group",
        description: "Hydrocarbon Component",
    },
    GCHMT: {
        type: "group",
        description: "Hydrocarbon Component",
    },
    GCWGPR: {
        type: "group",
        description: "Hydrocarbon Component Wet Gas Production Rate",
    },
    GCWGPT: {
        type: "group",
        description: "Hydrocarbon Component Wet Gas Production Total",
    },
    GCWGIR: {
        type: "group",
        description: "Hydrocarbon Component Wet Gas Injection Rate",
    },
    GCWGIT: {
        type: "group",
        description: "Hydrocarbon Component Wet Gas Injection Total",
    },
    GCGMR: {
        type: "group",
        description: "Hydrocarbon component",
    },
    GCGMT: {
        type: "group",
        description: "Hydrocarbon component",
    },
    GCOMR: {
        type: "group",
        description: "Hydrocarbon component",
    },
    GCOMT: {
        type: "group",
        description: "Hydrocarbon component",
    },
    GCNMR: {
        type: "group",
        description: "Hydrocarbon component molar rates in the NGL phase",
    },
    GCNWR: {
        type: "group",
        description: "Hydrocarbon component mass rates in the NGL phase",
    },
    GCGMRn: {
        type: "group",
        description: "Hydrocarbon component molar rates in the gas phase for nth separator stage",
    },
    GCGRn: {
        type: "group",
        description: "Hydrocarbon component molar rates in the gas phase for nth separator stage",
    },
    GCOMRn: {
        type: "group",
        description: "Hydrocarbon component",
    },
    GCORn: {
        type: "group",
        description: "Hydrocarbon component",
    },
    GMUF: {
        type: "group",
        description: "Make-up fraction",
    },
    GAMR: {
        type: "group",
        description: "Make-up gas rate",
    },
    GAMT: {
        type: "group",
        description: "Make-up gas total",
    },
    GGSPR: {
        type: "group",
        description: "Target sustainable rate for most recent sustainable capacity test for gas",
    },
    GGSRL: {
        type: "group",
        description:
            "Maximum tested rate sustained for the test period during the most recent sustainable capacity test for gas",
    },
    GGSRU: {
        type: "group",
        description:
            "Minimum tested rate not sustained for the test period during the most recent sustainable capacity test for gas",
    },
    GGSSP: {
        type: "group",
        description:
            "Period for which target sustainable rate could be maintained for the most recent sustainable capacity test for gas",
    },
    GGSTP: {
        type: "group",
        description: "Test period for the most recent sustainable capacity test for gas",
    },
    GOSPR: {
        type: "group",
        description: "Target sustainable rate for most recent sustainable capacity test for oil",
    },
    GOSRL: {
        type: "group",
        description:
            "Maximum tested rate sustained for the test period during the most recent sustainable capacity test for oil",
    },
    GOSRU: {
        type: "group",
        description:
            "Minimum tested rate not sustained for the test period during the most recent sustainable capacity test for oil",
    },
    GOSSP: {
        type: "group",
        description:
            "Period for which target sustainable rate could be maintained for the most recent sustainable capacity test for oil",
    },
    GOSTP: {
        type: "group",
        description: "Test period for the most recent sustainable capacity test for oil",
    },
    GWSPR: {
        type: "group",
        description: "Target sustainable rate for most recent sustainable capacity test for water",
    },
    GWSRL: {
        type: "group",
        description:
            "Maximum tested rate sustained for the test period during the most recent sustainable capacity test for water",
    },
    GWSRU: {
        type: "group",
        description:
            "Minimum tested rate not sustained for the test period during the most recent sustainable capacity test for water",
    },
    GWSSP: {
        type: "group",
        description:
            "Period for which target sustainable rate could be maintained for the most recent sustainable capacity test for water",
    },
    GWSTP: {
        type: "group",
        description: "Test period for the most recent sustainable capacity test for water",
    },
    GGPRG: {
        type: "group",
        description: "Gas production rate",
    },
    GOPRG: {
        type: "group",
        description: "Oil production rate",
    },
    GNLPRG: {
        type: "group",
        description: "NGL production rate",
    },
    GXMFG: {
        type: "group",
        description: "Liquid mole fraction",
    },
    GYMFG: {
        type: "group",
        description: "Vapor mole fraction",
    },
    GCOMRG: {
        type: "group",
        description: "Hydrocarbon component",
    },
    GCGMRG: {
        type: "group",
        description: "Hydrocarbon component molar rates in the gas phase",
    },
    GCNMRG: {
        type: "group",
        description: "Hydrocarbon component molar rates in the NGL phase",
    },
    GTPR: {
        type: "group",
        description: "Tracer Production Rate",
    },
    GTPT: {
        type: "group",
        description: "Tracer Production Total",
    },
    GTPC: {
        type: "group",
        description: "Tracer Production Concentration",
    },
    GTIR: {
        type: "group",
        description: "Tracer Injection Rate",
    },
    GTIT: {
        type: "group",
        description: "Tracer Injection Total",
    },
    GTIC: {
        type: "group",
        description: "Tracer Injection Concentration",
    },
    GTMR: {
        type: "group",
        description: "Traced mass Rate",
    },
    GTMT: {
        type: "group",
        description: "Traced mass Total",
    },
    GTQR: {
        type: "group",
        description: "Traced molar Rate",
    },
    GTCM: {
        type: "group",
        description: "Tracer Carrier molar Rate",
    },
    GTMF: {
        type: "group",
        description: "Traced molar fraction",
    },
    GTVL: {
        type: "group",
        description: "Traced liquid volume rate",
    },
    GTVV: {
        type: "group",
        description: "Traced vapor volume rate",
    },
    GTTL: {
        type: "group",
        description: "Traced liquid volume total",
    },
    GTTV: {
        type: "group",
        description: "Traced vapor volume total",
    },
    GTML: {
        type: "group",
        description: "Traced mass liquid rate",
    },
    GTMV: {
        type: "group",
        description: "Traced mass vapor rate",
    },
    GTLM: {
        type: "group",
        description: "Traced mass liquid total",
    },
    GTVM: {
        type: "group",
        description: "Traced mass vapor total",
    },
    GAPI: {
        type: "group",
        description: "Oil API",
    },
    GSPR: {
        type: "group",
        description: "Salt Production Rate",
    },
    GSPT: {
        type: "group",
        description: "Salt Production Total",
    },
    GSIR: {
        type: "group",
        description: "Salt Injection Rate",
    },
    GSIT: {
        type: "group",
        description: "Salt Injection Total",
    },
    GSPC: {
        type: "group",
        description: "Salt Production Concentration",
    },
    GSIC: {
        type: "group",
        description: "Salt Injection Concentration",
    },
    WTPRANI: {
        type: "group",
        description: "Anion Production Rate",
    },
    WTPTANI: {
        type: "group",
        description: "Anion Production Total",
    },
    WTIRANI: {
        type: "group",
        description: "Anion Injection Rate",
    },
    WTITANI: {
        type: "group",
        description: "Anion Injection Total",
    },
    WTPRCAT: {
        type: "group",
        description: "Cation Production Rate",
    },
    WTPTCAT: {
        type: "group",
        description: "Cation Production Total",
    },
    WTIRCAT: {
        type: "group",
        description: "Cation Injection Rate",
    },
    WTITCAT: {
        type: "group",
        description: "Cation Injection Total",
    },
    GTPCHEA: {
        type: "group",
        description: "Production Temperature",
    },
    GTICHEA: {
        type: "group",
        description: "Injection Temperature",
    },
    GTPRHEA: {
        type: "group",
        description: "Energy flows",
    },
    GTPTHEA: {
        type: "group",
        description: "Energy Production Total",
    },
    GTIRHEA: {
        type: "group",
        description: "Energy flows",
    },
    GTITHEA: {
        type: "group",
        description: "Energy Injection Total",
    },
    GTIRF: {
        type: "group",
        description: "Tracer Injection Rate",
    },
    GTIRS: {
        type: "group",
        description: "Tracer Injection Rate",
    },
    GTPRF: {
        type: "group",
        description: "Tracer Production Rate",
    },
    GTPRS: {
        type: "group",
        description: "Tracer Production Rate",
    },
    GTITF: {
        type: "group",
        description: "Tracer Injection Total",
    },
    GTITS: {
        type: "group",
        description: "Tracer Injection Total",
    },
    GTPTF: {
        type: "group",
        description: "Tracer Production Total",
    },
    GTPTS: {
        type: "group",
        description: "Tracer Production Total",
    },
    GTICF: {
        type: "group",
        description: "Tracer Injection Concentration",
    },
    GTICS: {
        type: "group",
        description: "Tracer Injection Concentration",
    },
    GTPCF: {
        type: "group",
        description: "Tracer Production",
    },
    GTPCS: {
        type: "group",
        description: "Tracer Production",
    },
    GMPR: {
        type: "group",
        description: "Methane Production Rate",
    },
    GMPT: {
        type: "group",
        description: "Methane Production Total",
    },
    GMIR: {
        type: "group",
        description: "Methane Injection Rate",
    },
    GMIT: {
        type: "group",
        description: "Methane Injection Total",
    },
    GTPRFOA: {
        type: "group",
        description: "Production Rate",
    },
    GTPTFOA: {
        type: "group",
        description: "Production Total",
    },
    GTIRFOA: {
        type: "group",
        description: "Injection Rate",
    },
    GTITFOA: {
        type: "group",
        description: "Injection Total",
    },
    GGDC: {
        type: "group",
        description: "Gas Delivery Capacity",
    },
    GGDCQ: {
        type: "group",
        description: "Field/Group Gas DCQ",
    },
    GMCPL: {
        type: "group",
        description: "Group Multi-level Compressor Level",
    },
    GPR: {
        type: "group",
        description: "Group nodal Pressure in network",
    },
    GPRDC: {
        type: "group",
        description: "Group Pressure at Delivery Capacity",
    },
    GPRFP: {
        type: "group",
        description: "Group or node Pressure in network from end of First Pass",
    },
    GGPRNBFP: {
        type: "group",
        description: "Gas flow rate along Group's or node's outlet branch in network, from end of First Pass",
    },
    GGCV: {
        type: "group",
        description: "Gas Calorific Value",
    },
    GESR: {
        type: "group",
        description: "Energy Sales Rate",
    },
    GEST: {
        type: "group",
        description: "Energy Sales Total",
    },
    GEDC: {
        type: "group",
        description: "Energy Delivery Capacity",
    },
    GEDCQ: {
        type: "group",
        description: "Energy DCQ",
    },
    GPRG: {
        type: "group",
        description: "Group or node Pressure in the gas injection network",
    },
    GPRW: {
        type: "group",
        description: "Group or node Pressure in the water injection network",
    },
    GPRB: {
        type: "group",
        description: "Pressure drop along the group's or node's outlet branch in the production network",
    },
    GPRBG: {
        type: "group",
        description: "Pressure drop along the group's or node's inlet branch in the gas injection network",
    },
    GPRBW: {
        type: "group",
        description: "Pressure drop along the group's or node's inlet branch in the water injection network",
    },
    GALQ: {
        type: "group",
        description: "ALQ in the group's or node's outlet branch in the production network",
    },
    GOPRNB: {
        type: "group",
        description: "Oil flow rate along the group's or node's outlet branch in the production network",
    },
    GWPRNB: {
        type: "group",
        description: "Water flow rate along the group's or node's outlet branch in the production network",
    },
    GGPRNB: {
        type: "group",
        description: "Gas flow rate along the group's or node's outlet branch in the production network",
    },
    GLPRNB: {
        type: "group",
        description: "Liquid flow rate along the group's or node's outlet branch in the production network",
    },
    GWIRNB: {
        type: "group",
        description: "Water flow rate along the group's or node's inlet branch in the water injection network",
    },
    GGIRNB: {
        type: "group",
        description: "Gas flow rate along the group's or node's inlet branch in the gas injection network",
    },
    GOMNR: {
        type: "group",
        description: "Group or node minimum oil rate as specified with GNETDP in the production network",
    },
    GGMNR: {
        type: "group",
        description: "Group or node minimum gas rate as specified with GNETDP in the production network",
    },
    GWMNR: {
        type: "group",
        description: "Group or node minimum water rate as specified with GNETDP in the production network",
    },
    GLMNR: {
        type: "group",
        description: "Group or node minimum liquid rate as specified with GNETDP in the production network",
    },
    GOMXR: {
        type: "group",
        description: "Group or node maximum oil rate as specified with GNETDP in the production network",
    },
    GGMXR: {
        type: "group",
        description: "Group or node maximum gas rate as specified with GNETDP in the production network",
    },
    GWMXR: {
        type: "group",
        description: "Group or node maximum water rate as specified with GNETDP in the production network",
    },
    GLMXR: {
        type: "group",
        description: "Group or node maximum liquid rate as specified with GNETDP in the production network",
    },
    GMNP: {
        type: "group",
        description: "Group or node minimum pressure as specified with GNETDP in the production network",
    },
    GMXP: {
        type: "group",
        description: "Group or node maximum pressure as specified with GNETDP in the production network",
    },
    GPRINC: {
        type: "group",
        description: "Group or node pressure increment as specified with GNETDP in the production network",
    },
    GPRDEC: {
        type: "group",
        description: "Group or node pressure decrement as specified with GNETDP in the production network",
    },
    GCPR: {
        type: "group",
        description: "Polymer Production Rate",
    },
    GCPC: {
        type: "group",
        description: "Polymer Production Concentration",
    },
    GCPT: {
        type: "group",
        description: "Polymer Production Total",
    },
    GCIR: {
        type: "group",
        description: "Polymer Injection Rate",
    },
    GCIC: {
        type: "group",
        description: "Polymer Injection Concentration",
    },
    GCIT: {
        type: "group",
        description: "Polymer Injection Total",
    },
    GNPR: {
        type: "group",
        description: "Solvent Production Rate",
    },
    GNPT: {
        type: "group",
        description: "Solvent Production Total",
    },
    GNIR: {
        type: "group",
        description: "Solvent Injection Rate",
    },
    GNIT: {
        type: "group",
        description: "Solvent Injection Total",
    },
    GTPRSUR: {
        type: "group",
        description: "Production Rate",
    },
    GTPTSUR: {
        type: "group",
        description: "Production Total",
    },
    GTIRSUR: {
        type: "group",
        description: "Injection Rate",
    },
    GTITSUR: {
        type: "group",
        description: "Injection Total",
    },
    GTPRALK: {
        type: "group",
        description: "Production Rate",
    },
    GTPTALK: {
        type: "group",
        description: "Production Total",
    },
    GTIRALK: {
        type: "group",
        description: "Injection Rate",
    },
    GTITALK: {
        type: "group",
        description: "Injection Total",
    },
    GU: {
        type: "group",
        description: "User-defined group quantity",
    },
    WOPR: {
        type: "well",
        description: "Oil Production Rate",
    },
    WOPRA: {
        type: "well",
        description: "Oil Production Rate above GOC",
    },
    WOPRB: {
        type: "well",
        description: "Oil Production Rate below GOC",
    },
    WOPTA: {
        type: "well",
        description: "Oil Production Total above GOC",
    },
    WOPTB: {
        type: "well",
        description: "Oil Production Total below GOC",
    },
    WOPR1: {
        type: "well",
        description: "Oil Production Rate above GOC",
    },
    WOPR2: {
        type: "well",
        description: "Oil Production Rate below GOC",
    },
    WOPT1: {
        type: "well",
        description: "Oil Production Total above GOC",
    },
    WOPT2: {
        type: "well",
        description: "Oil Production Total below GOC",
    },
    WOMR: {
        type: "well",
        description: "Oil Mass Rate",
    },
    WOMT: {
        type: "well",
        description: "Oil Mass Total",
    },
    WODN: {
        type: "well",
        description: "Oil Density at Surface Conditions",
    },
    WOPRH: {
        type: "well",
        description: "Oil Production Rate History",
    },
    WOPRT: {
        type: "well",
        description: "Oil Production Rate Target/Limit",
    },
    WOPRF: {
        type: "well",
        description: "Free Oil Production Rate",
    },
    WOPRS: {
        type: "well",
        description: "Solution Oil Production Rate",
    },
    WOPT: {
        type: "well",
        description: "Oil Production Total",
    },
    WOPTH: {
        type: "well",
        description: "Oil Production Total History",
    },
    WOPTF: {
        type: "well",
        description: "Free Oil Production Total",
    },
    WOPTS: {
        type: "well",
        description: "Solution Oil Production Total",
    },
    WOIR: {
        type: "well",
        description: "Oil Injection Rate",
    },
    WOIRH: {
        type: "well",
        description: "Oil Injection Rate History",
    },
    WOIRT: {
        type: "well",
        description: "Oil Injection Rate Target/Limit",
    },
    WOIT: {
        type: "well",
        description: "Oil Injection Total",
    },
    WOITH: {
        type: "well",
        description: "Oil Injection Total History",
    },
    WOPP: {
        type: "well",
        description: "Oil Potential Production rate",
    },
    WOPP2: {
        type: "well",
        description: "Oil Potential Production rate",
    },
    WOPI: {
        type: "well",
        description: "Oil Potential Injection rate",
    },
    WOPI2: {
        type: "well",
        description: "Oil Potential Injection rate",
    },
    WOPGR: {
        type: "well",
        description: "Oil Production Guide Rate",
    },
    WOIGR: {
        type: "well",
        description: "Oil Injection Guide Rate",
    },
    WOVPR: {
        type: "well",
        description: "Oil Voidage Production Rate",
    },
    WOVPT: {
        type: "well",
        description: "Oil Voidage Production Total",
    },
    WOVIR: {
        type: "well",
        description: "Oil Voidage Injection Rate",
    },
    WOVIT: {
        type: "well",
        description: "Oil Voidage Injection Total",
    },
    WOnPR: {
        type: "well",
        description: "nth separator stage oil rate",
    },
    WOnPT: {
        type: "well",
        description: "nth separator stage oil total",
    },
    WWPR: {
        type: "well",
        description: "Water Production Rate",
    },
    WWMR: {
        type: "well",
        description: "Water Mass Rate",
    },
    WWMT: {
        type: "well",
        description: "Water Mass Total",
    },
    WWPRH: {
        type: "well",
        description: "Water Production Rate History",
    },
    WWPRT: {
        type: "well",
        description: "Water Production Rate Target/Limit",
    },
    WWPT: {
        type: "well",
        description: "Water Production Total",
    },
    WWPTH: {
        type: "well",
        description: "Water Production Total History",
    },
    WWIR: {
        type: "well",
        description: "Water Injection Rate",
    },
    WWIRH: {
        type: "well",
        description: "Water Injection Rate History",
    },
    WWIRT: {
        type: "well",
        description: "Water Injection Rate Target/Limit",
    },
    WWIT: {
        type: "well",
        description: "Water Injection Total",
    },
    WWITH: {
        type: "well",
        description: "Water Injection Total History",
    },
    WWPP: {
        type: "well",
        description: "Water Potential Production rate",
    },
    WWPP2: {
        type: "well",
        description: "Water Potential Production rate",
    },
    WWPI: {
        type: "well",
        description: "Water Potential Injection rate",
    },
    WWIP: {
        type: "well",
        description: "Water Potential Injection rate",
    },
    WWPI2: {
        type: "well",
        description: "Water Potential Injection rate",
    },
    WWIP2: {
        type: "well",
        description: "Water Potential Injection rate",
    },
    WWPGR: {
        type: "well",
        description: "Water Production Guide Rate",
    },
    WWIGR: {
        type: "well",
        description: "Water Injection Guide Rate",
    },
    WWVPR: {
        type: "well",
        description: "Water Voidage Production Rate",
    },
    WWVPT: {
        type: "well",
        description: "Water Voidage Production Total",
    },
    WWVIR: {
        type: "well",
        description: "Water Voidage Injection Rate",
    },
    WWVIT: {
        type: "well",
        description: "Water Voidage Injection Total",
    },
    WWPIR: {
        type: "well",
        description: "Ratio of produced water to injected water (percentage)",
    },
    WWMPR: {
        type: "well",
        description: "Water component molar production rate",
    },
    WWMPT: {
        type: "well",
        description: "Water component molar production total",
    },
    WWMIR: {
        type: "well",
        description: "Water component molar injection rate",
    },
    WWMIT: {
        type: "well",
        description: "Water component molar injection total",
    },
    WGPR: {
        type: "well",
        description: "Gas Production Rate",
    },
    WGPRA: {
        type: "well",
        description: "Gas Production Rate above",
    },
    WGPRB: {
        type: "well",
        description: "Gas Production Rate below",
    },
    WGPTA: {
        type: "well",
        description: "Gas Production Total above",
    },
    WGPTB: {
        type: "well",
        description: "Gas Production Total below",
    },
    WGPR1: {
        type: "well",
        description: "Gas Production Rate above GOC",
    },
    WGPR2: {
        type: "well",
        description: "Gas Production Rate below GOC",
    },
    WGPT1: {
        type: "well",
        description: "Gas Production Total above GOC",
    },
    WGPT2: {
        type: "well",
        description: "Gas Production Total below GOC",
    },
    WGMR: {
        type: "well",
        description: "Gas Mass Rate",
    },
    WGMT: {
        type: "well",
        description: "Gas Mass Total",
    },
    WGDN: {
        type: "well",
        description: "Gas Density at Surface Conditions",
    },
    WGPRH: {
        type: "well",
        description: "Gas Production Rate History",
    },
    WGPRT: {
        type: "well",
        description: "Gas Production Rate Target/Limit",
    },
    WGPRF: {
        type: "well",
        description: "Free Gas Production Rate",
    },
    WGPRS: {
        type: "well",
        description: "Solution Gas Production Rate",
    },
    WGPT: {
        type: "well",
        description: "Gas Production Total",
    },
    WGPTH: {
        type: "well",
        description: "Gas Production Total History",
    },
    WGPTF: {
        type: "well",
        description: "Free Gas Production Total",
    },
    WGPTS: {
        type: "well",
        description: "Solution Gas Production Total",
    },
    WGIR: {
        type: "well",
        description: "Gas Injection Rate",
    },
    WGIRH: {
        type: "well",
        description: "Gas Injection Rate History",
    },
    WGIRT: {
        type: "well",
        description: "Gas Injection Rate Target/Limit",
    },
    WGIT: {
        type: "well",
        description: "Gas Injection Total",
    },
    WGITH: {
        type: "well",
        description: "Gas Injection Total History",
    },
    WGPP: {
        type: "well",
        description: "Gas Potential Production rate",
    },
    WGPP2: {
        type: "well",
        description: "Gas Potential Production rate",
    },
    WGPPS: {
        type: "well",
        description: "Solution",
    },
    WGPPS2: {
        type: "well",
        description: "Solution",
    },
    WGPPF: {
        type: "well",
        description: "Free Gas Potential Production rate",
    },
    WGPPF2: {
        type: "well",
        description: "Free Gas Potential Production rate",
    },
    WGPI: {
        type: "well",
        description: "Gas Potential Injection rate",
    },
    WGIP: {
        type: "well",
        description: "Gas Potential Injection rate",
    },
    WGPI2: {
        type: "well",
        description: "Gas Potential Injection rate",
    },
    WGIP2: {
        type: "well",
        description: "Gas Potential Injection rate",
    },
    WGPGR: {
        type: "well",
        description: "Gas Production Guide Rate",
    },
    WGIGR: {
        type: "well",
        description: "Gas Injection Guide Rate",
    },
    WGLIR: {
        type: "well",
        description: "Gas Lift Injection Rate",
    },
    WWGPR: {
        type: "well",
        description: "Wet Gas Production Rate",
    },
    WWGPT: {
        type: "well",
        description: "Wet Gas Production Total",
    },
    WWGPRH: {
        type: "well",
        description: "Wet Gas Production Rate History",
    },
    WWGIR: {
        type: "well",
        description: "Wet Gas Injection Rate",
    },
    WWGIT: {
        type: "well",
        description: "Wet Gas Injection Total",
    },
    WGnPR: {
        type: "well",
        description: "nth separator stage gas rate",
    },
    WGnPT: {
        type: "well",
        description: "nth separator stage gas total",
    },
    WGVPR: {
        type: "well",
        description: "Gas Voidage Production Rate",
    },
    WGVPT: {
        type: "well",
        description: "Gas Voidage Production Total",
    },
    WGVIR: {
        type: "well",
        description: "Gas Voidage Injection Rate",
    },
    WGVIT: {
        type: "well",
        description: "Gas Voidage Injection Total",
    },
    WGQ: {
        type: "well",
        description: "Gas Quality",
    },
    WLPR: {
        type: "well",
        description: "Liquid Production Rate",
    },
    WLPRH: {
        type: "well",
        description: "Liquid Production Rate History",
    },
    WLPRT: {
        type: "well",
        description: "Liquid Production Rate Target/Limit",
    },
    WLPT: {
        type: "well",
        description: "Liquid Production Total",
    },
    WLPTH: {
        type: "well",
        description: "Liquid Production Total History",
    },
    WVPR: {
        type: "well",
        description: "Res Volume Production Rate",
    },
    WVPRT: {
        type: "well",
        description: "Res Volume Production Rate Target/Limit",
    },
    WVPT: {
        type: "well",
        description: "Res Volume Production Total",
    },
    WVPGR: {
        type: "well",
        description: "Res Volume Production Guide Rate",
    },
    WVIR: {
        type: "well",
        description: "Res Volume Injection Rate",
    },
    WVIRT: {
        type: "well",
        description: "Res Volume Injection Rate Target/Limit",
    },
    WVIT: {
        type: "well",
        description: "Res Volume Injection Total",
    },
    WWCT: {
        type: "well",
        description: "Water Cut",
    },
    WWCTH: {
        type: "well",
        description: "Water Cut History",
    },
    WGOR: {
        type: "well",
        description: "Gas-Oil Ratio",
    },
    WGORH: {
        type: "well",
        description: "Gas-Oil Ratio History",
    },
    WOGR: {
        type: "well",
        description: "Oil-Gas Ratio",
    },
    WOGRH: {
        type: "well",
        description: "Oil-Gas Ratio History",
    },
    WWGR: {
        type: "well",
        description: "Water-Gas Ratio",
    },
    WWGRH: {
        type: "well",
        description: "Water-Gas Ratio History",
    },
    WGLR: {
        type: "well",
        description: "Gas-Liquid Ratio",
    },
    WGLRH: {
        type: "well",
        description: "Gas-Liquid Ratio History",
    },
    WBGLR: {
        type: "well",
        description: "Bottom hole Gas-Liquid Ratio",
    },
    WBHP: {
        type: "well",
        description: "Bottom Hole Pressure",
    },
    WBHPH: {
        type: "well",
        description: "Bottom Hole Pressure History,",
    },
    WBHPT: {
        type: "well",
        description: "Bottom Hole Pressure Target/Limit",
    },
    WTHP: {
        type: "well",
        description: "Tubing Head Pressure",
    },
    WTHPH: {
        type: "well",
        description: "Tubing Head Pressure History,",
    },
    WPI: {
        type: "well",
        description: "Productivity Index of well's preferred phase",
    },
    WPIO: {
        type: "well",
        description: "Oil phase PI",
    },
    WPIG: {
        type: "well",
        description: "Gas phase PI",
    },
    WPIW: {
        type: "well",
        description: "Water phase PI",
    },
    WPIL: {
        type: "well",
        description: "Liquid phase PI",
    },
    WBP: {
        type: "well",
        description: "One-point Pressure Average",
    },
    WBP4: {
        type: "well",
        description: "Four-point Pressure Average",
    },
    WBP5: {
        type: "well",
        description: "Five-point Pressure Average",
    },
    WBP9: {
        type: "well",
        description: "Nine-point Pressure Average",
    },
    WPI1: {
        type: "well",
        description: "Productivity Index based on the value of WBP",
    },
    WPI4: {
        type: "well",
        description: "Productivity Index based on the value of WBP4",
    },
    WPI5: {
        type: "well",
        description: "Productivity Index based on the value of WBP5",
    },
    WPI9: {
        type: "well",
        description: "Productivity Index based on the value of WBP9",
    },
    WHD: {
        type: "well",
        description:
            "Hydraulic head in well based on the reference depth given in HYDRHEAD and the well's reference depth",
    },
    WHDF: {
        type: "well",
        description:
            "Hydraulic head in well based on the reference depth given in HYDRHEAD and the well's reference depth calculated at freshwater conditions",
    },
    WSTAT: {
        type: "well",
        description: "Well State Indicator",
    },
    WMCTL: {
        type: "well",
        description: "Mode of Control",
    },
    WMCON: {
        type: "well",
        description: "The number of connections capable of flowing in the well",
    },
    WEPR: {
        type: "well",
        description: "Energy Production Rate",
    },
    WEPT: {
        type: "well",
        description: "Energy Production Total",
    },
    WEFF: {
        type: "well",
        description: "Efficiency Factor",
    },
    WEFFG: {
        type: "well",
        description: "Product of efficiency factors of the well and all its superior groups",
    },
    WALQ: {
        type: "well",
        description: "Well Artificial Lift Quantity",
    },
    WMVFP: {
        type: "well",
        description: "VFP table number used by the well",
    },
    WNLPR: {
        type: "well",
        description: "NGL Production Rate",
    },
    WNLPT: {
        type: "well",
        description: "NGL Production Total",
    },
    WNLPRH: {
        type: "well",
        description: "NGL Production Rate History",
    },
    WNLPTH: {
        type: "well",
        description: "NGL Production Total History",
    },
    WNLPRT: {
        type: "well",
        description: "NGL Production Rate Target",
    },
    WAMF: {
        type: "well",
        description: "Component aqueous mole fraction, from producing completions",
    },
    WXMF: {
        type: "well",
        description: "Liquid Mole Fraction",
    },
    WYMF: {
        type: "well",
        description: "Vapor Mole Fraction",
    },
    WXMFn: {
        type: "well",
        description: "Liquid Mole Fraction for nth separator stage",
    },
    WYMFn: {
        type: "well",
        description: "Vapor Mole Fraction for nth separator stage",
    },
    WZMF: {
        type: "well",
        description: "Total Mole Fraction",
    },
    WCMPR: {
        type: "well",
        description: "Hydrocarbon Component Molar Production Rates",
    },
    WCMPT: {
        type: "well",
        description: "Hydrocarbon Component",
    },
    WCMIR: {
        type: "well",
        description: "Hydrocarbon Component Molar Injection Rates",
    },
    WCMIT: {
        type: "well",
        description: "Hydrocarbon Component Molar Injection Totals",
    },
    WCGIR: {
        type: "well",
        description: "Hydrocarbon Component Gas Injection Rate",
    },
    WCGPR: {
        type: "well",
        description: "Hydrocarbon Component Gas Production Rate",
    },
    WCOPR: {
        type: "well",
        description: "Hydrocarbon Component Oil Production Rate",
    },
    WHMIR: {
        type: "well",
        description: "Hydrocarbon Molar Injection Rate",
    },
    WHMIT: {
        type: "well",
        description: "Hydrocarbon Molar Injection Total",
    },
    WHMPR: {
        type: "well",
        description: "Hydrocarbon Molar Production Rate",
    },
    WHMPT: {
        type: "well",
        description: "Hydrocarbon Molar Production Total",
    },
    WCHMR: {
        type: "well",
        description: "Hydrocarbon Component",
    },
    WCHMT: {
        type: "well",
        description: "Hydrocarbon Component",
    },
    WCWGPR: {
        type: "well",
        description: "Hydrocarbon Component Wet Gas Production Rate",
    },
    WCWGPT: {
        type: "well",
        description: "Hydrocarbon Component Wet Gas Production Total",
    },
    WCWGIR: {
        type: "well",
        description: "Hydrocarbon Component Wet Gas Injection Rate",
    },
    WCWGIT: {
        type: "well",
        description: "Hydrocarbon Component Wet Gas Injection Total",
    },
    WCGMR: {
        type: "well",
        description: "Hydrocarbon component",
    },
    WCGMT: {
        type: "well",
        description: "Hydrocarbon component",
    },
    WCOMR: {
        type: "well",
        description: "Hydrocarbon component",
    },
    WCOMT: {
        type: "well",
        description: "Hydrocarbon component",
    },
    WCNMR: {
        type: "well",
        description: "Hydrocarbon component molar rates in the NGL phase",
    },
    WCNWR: {
        type: "well",
        description: "Hydrocarbon component mass rates in the NGL phase",
    },
    WCGMRn: {
        type: "well",
        description: "Hydrocarbon component molar rates in the gas phase for nth separator stage",
    },
    WCGRn: {
        type: "well",
        description: "Hydrocarbon component molar rates in the gas phase for nth separator stage",
    },
    WCOMRn: {
        type: "well",
        description: "Hydrocarbon component",
    },
    WCORn: {
        type: "well",
        description: "Hydrocarbon component",
    },
    WMUF: {
        type: "well",
        description: "Make-up fraction",
    },
    WTHT: {
        type: "well",
        description: "Tubing Head Temperature",
    },
    WMMW: {
        type: "well",
        description: "Mean molecular weight of wellstream",
    },
    WPWE0: {
        type: "well",
        description: "Well drilled indicator",
    },
    WPWE1: {
        type: "well",
        description: "Connections opened indicator",
    },
    WPWE2: {
        type: "well",
        description: "Connections closed indicator",
    },
    WPWE3: {
        type: "well",
        description: "Connections closed to bottom indicator",
    },
    WPWE4: {
        type: "well",
        description: "Well stopped indicator",
    },
    WPWE5: {
        type: "well",
        description: "Injector to producer indicator",
    },
    WPWE6: {
        type: "well",
        description: "Producer to injector indicator",
    },
    WPWE7: {
        type: "well",
        description: "Well shut indicator",
    },
    WPWEM: {
        type: "well",
        description: "WELEVNT output mnemonic",
    },
    WDRPR: {
        type: "well",
        description: "Well drilling priority",
    },
    WBHWCn: {
        type: "well",
        description: "Derivative of well BHP with respect to parameter n",
    },
    WGFWCn: {
        type: "well",
        description: "Derivative of well gas flow rate with respect to parameter n",
    },
    WOFWCn: {
        type: "well",
        description: "Derivative of well oil flow rate with respect to parameter n",
    },
    WWFWCn: {
        type: "well",
        description: "Derivative of water flow rate with respect to parameter n",
    },
    WTPR: {
        type: "well",
        description: "Tracer Production Rate",
    },
    WTPT: {
        type: "well",
        description: "Tracer Production Total",
    },
    WTPC: {
        type: "well",
        description: "Tracer Production Concentration",
    },
    WTIR: {
        type: "well",
        description: "Tracer Injection Rate",
    },
    WTIT: {
        type: "well",
        description: "Tracer Injection Total",
    },
    WTIC: {
        type: "well",
        description: "Tracer Injection Concentration",
    },
    WTMR: {
        type: "well",
        description: "Traced mass Rate",
    },
    WTMT: {
        type: "well",
        description: "Traced mass Total",
    },
    WTQR: {
        type: "well",
        description: "Traced molar Rate",
    },
    WTCM: {
        type: "well",
        description: "Tracer Carrier molar Rate",
    },
    WTMF: {
        type: "well",
        description: "Traced molar fraction",
    },
    WTVL: {
        type: "well",
        description: "Traced liquid volume rate",
    },
    WTVV: {
        type: "well",
        description: "Traced vapor volume rate",
    },
    WTTL: {
        type: "well",
        description: "Traced liquid volume total",
    },
    WTTV: {
        type: "well",
        description: "Traced vapor volume total",
    },
    WTML: {
        type: "well",
        description: "Traced mass liquid rate",
    },
    WTMV: {
        type: "well",
        description: "Traced mass vapor rate",
    },
    WTLM: {
        type: "well",
        description: "Traced mass liquid total",
    },
    WTVM: {
        type: "well",
        description: "Traced mass vapor total",
    },
    WAPI: {
        type: "well",
        description: "Oil API",
    },
    WSPR: {
        type: "well",
        description: "Salt Production Rate",
    },
    WSPT: {
        type: "well",
        description: "Salt Production Total",
    },
    WSIR: {
        type: "well",
        description: "Salt Injection Rate",
    },
    WSIT: {
        type: "well",
        description: "Salt Injection Total",
    },
    WSPC: {
        type: "well",
        description: "Salt Production Concentration",
    },
    WSIC: {
        type: "well",
        description: "Salt Injection Concentration",
    },
    WTPCHEA: {
        type: "well",
        description: "Production Temperature",
    },
    WTICHEA: {
        type: "well",
        description: "Injection Temperature",
    },
    WTPRHEA: {
        type: "well",
        description: "Energy flows",
    },
    WTPTHEA: {
        type: "well",
        description: "Energy Production Total",
    },
    WTIRHEA: {
        type: "well",
        description: "Energy flows",
    },
    WTITHEA: {
        type: "well",
        description: "Energy Injection Total",
    },
    WTIRF: {
        type: "well",
        description: "Tracer Injection Rate",
    },
    WTIRS: {
        type: "well",
        description: "Tracer Injection Rate",
    },
    WTPRF: {
        type: "well",
        description: "Tracer Production Rate",
    },
    WTPRS: {
        type: "well",
        description: "Tracer Production Rate",
    },
    WTITF: {
        type: "well",
        description: "Tracer Injection Total",
    },
    WTITS: {
        type: "well",
        description: "Tracer Injection Total",
    },
    WTPTF: {
        type: "well",
        description: "Tracer Production Total",
    },
    WTPTS: {
        type: "well",
        description: "Tracer Production Total",
    },
    WTICF: {
        type: "well",
        description: "Tracer Injection Concentration",
    },
    WTICS: {
        type: "well",
        description: "Tracer Injection Concentration",
    },
    WTPCF: {
        type: "well",
        description: "Tracer Production",
    },
    WTPCS: {
        type: "well",
        description: "Tracer Production",
    },
    WMPR: {
        type: "well",
        description: "Methane Production Rate",
    },
    WMPT: {
        type: "well",
        description: "Methane Production Total",
    },
    WMIR: {
        type: "well",
        description: "Methane Injection Rate",
    },
    WMIT: {
        type: "well",
        description: "Methane Injection Total",
    },
    WTPRFOA: {
        type: "well",
        description: "Production Rate",
    },
    WTPTFOA: {
        type: "well",
        description: "Production Total",
    },
    WTIRFOA: {
        type: "well",
        description: "Injection Rate",
    },
    WTITFOA: {
        type: "well",
        description: "Injection Total",
    },
    WGDC: {
        type: "well",
        description: "Gas Delivery Capacity",
    },
    NGOPAS: {
        type: "well",
        description: "Number of iterations to converge DCQ in first pass",
    },
    WGPRFP: {
        type: "well",
        description: "Well Gas Production Rate from end of First Pass",
    },
    WTHPFP: {
        type: "well",
        description: "Well Tubing Head Pressure from end of First Pass",
    },
    WBHPFP: {
        type: "well",
        description: "Well Bottom Hole Pressure from end of First Pass",
    },
    WOGLR: {
        type: "well",
        description: "Well Oil Gas Lift Ratio",
    },
    WGCV: {
        type: "well",
        description: "Gas Calorific Value",
    },
    WEDC: {
        type: "well",
        description: "Energy Delivery Capacity",
    },
    WCPR: {
        type: "well",
        description: "Polymer Production Rate",
    },
    WCPC: {
        type: "well",
        description: "Polymer Production Concentration",
    },
    WCPT: {
        type: "well",
        description: "Polymer Production Total",
    },
    WCIR: {
        type: "well",
        description: "Polymer Injection Rate",
    },
    WCIC: {
        type: "well",
        description: "Polymer Injection Concentration",
    },
    WCIT: {
        type: "well",
        description: "Polymer Injection Total",
    },
    WNPR: {
        type: "well",
        description: "Solvent Production Rate",
    },
    WNPT: {
        type: "well",
        description: "Solvent Production Total",
    },
    WNIR: {
        type: "well",
        description: "Solvent Injection Rate",
    },
    WNIT: {
        type: "well",
        description: "Solvent Injection Total",
    },
    WTPRSUR: {
        type: "well",
        description: "Production Rate",
    },
    WTPTSUR: {
        type: "well",
        description: "Production Total",
    },
    WTIRSUR: {
        type: "well",
        description: "Injection Rate",
    },
    WTITSUR: {
        type: "well",
        description: "Injection Total",
    },
    WTPRALK: {
        type: "well",
        description: "Production Rate",
    },
    WTPTALK: {
        type: "well",
        description: "Production Total",
    },
    WTIRALK: {
        type: "well",
        description: "Injection Rate",
    },
    WTITALK: {
        type: "well",
        description: "Injection Total",
    },
    WU: {
        type: "well",
        description: "User-defined well quantity",
    },
    COFR: {
        type: "completion",
        description: "Oil Flow Rate",
    },
    COFRF: {
        type: "completion",
        description: "Free Oil Flow Rate",
    },
    COFRS: {
        type: "completion",
        description: "Solution oil flow rate",
    },
    COFRU: {
        type: "completion",
        description: "Sum of connection oil flow rates upstream of, and including, this connection",
    },
    COPR: {
        type: "completion",
        description: "Oil Production Rate",
    },
    COPT: {
        type: "completion",
        description: "Oil Production Total",
    },
    COPTF: {
        type: "completion",
        description: "Free Oil Production Total",
    },
    COPTS: {
        type: "completion",
        description: "Solution Oil Production Total",
    },
    COIT: {
        type: "completion",
        description: "Oil Injection Total",
    },
    COPP: {
        type: "completion",
        description: "Oil Potential Production rate",
    },
    COPI: {
        type: "completion",
        description: "Oil Potential Injection rate",
    },
    CWFR: {
        type: "completion",
        description: "Water Flow Rate",
    },
    CWFRU: {
        type: "completion",
        description: "Sum of connection water flow rates upstream of, and including, this connection",
    },
    CWPR: {
        type: "completion",
        description: "Water Production Rate",
    },
    CWPT: {
        type: "completion",
        description: "Water Production Total",
    },
    CWIR: {
        type: "completion",
        description: "Water Injection Rate",
    },
    CWIT: {
        type: "completion",
        description: "Water Injection Total",
    },
    CWPP: {
        type: "completion",
        description: "Water Potential Production rate",
    },
    CWPI: {
        type: "completion",
        description: "Water Potential Injection rate",
    },
    CGFR: {
        type: "completion",
        description: "Gas Flow Rate",
    },
    CGFRF: {
        type: "completion",
        description: "Free Gas Flow Rate",
    },
    CGFRS: {
        type: "completion",
        description: "Solution Gas Flow Rate",
    },
    CGFRU: {
        type: "completion",
        description: "Sum of connection gas flow rates upstream of, and including, this connection",
    },
    CGPR: {
        type: "completion",
        description: "Gas Production Rate ",
    },
    CGPT: {
        type: "completion",
        description: "Gas Production Total",
    },
    CGPTF: {
        type: "completion",
        description: "Free Gas Production Total",
    },
    CGPTS: {
        type: "completion",
        description: "Solution Gas Production Total",
    },
    CGIR: {
        type: "completion",
        description: "Gas Injection Rate",
    },
    CGIT: {
        type: "completion",
        description: "Gas Injection Total",
    },
    CGPP: {
        type: "completion",
        description: "Gas Potential Production rate",
    },
    CGPI: {
        type: "completion",
        description: "Gas Potential Injection rate",
    },
    CGQ: {
        type: "completion",
        description: "Gas Quality",
    },
    CLFR: {
        type: "completion",
        description: "Liquid Flow Rate",
    },
    CLPT: {
        type: "completion",
        description: "Liquid Production Total",
    },
    CVFR: {
        type: "completion",
        description: "Reservoir",
    },
    CVPR: {
        type: "completion",
        description: "Res Volume Production Rate",
    },
    CVPT: {
        type: "completion",
        description: "Res Volume Production Total",
    },
    CVIR: {
        type: "completion",
        description: "Res Volume Injection Rate",
    },
    CVIT: {
        type: "completion",
        description: "Res Volume Injection Total",
    },
    CWCT: {
        type: "completion",
        description: "Water Cut",
    },
    CGOR: {
        type: "completion",
        description: "Gas-Oil Ratio",
    },
    COGR: {
        type: "completion",
        description: "Oil-Gas Ratio",
    },
    CWGR: {
        type: "completion",
        description: "Water-Gas Ratio",
    },
    CGLR: {
        type: "completion",
        description: "Gas-Liquid Ratio",
    },
    CPR: {
        type: "completion",
        description: "Connection Pressure",
    },
    CPI: {
        type: "completion",
        description: "Productivity Index of well's preferred phase",
    },
    CTFAC: {
        type: "completion",
        description: "Connection Transmissibility Factor",
    },
    CDBF: {
        type: "completion",
        description: "Blocking factor for generalized pseudo-pressure method",
    },
    CGPPTN: {
        type: "completion",
        description: "Generalized pseudo-pressure table update counter",
    },
    CGPPTS: {
        type: "completion",
        description: "Generalized pseudo-pressure table update status",
    },
    CDSM: {
        type: "completion",
        description: "Current mass of scale deposited",
    },
    CDSML: {
        type: "completion",
        description: "Current mass of scale deposited per unit perforation length",
    },
    CDSF: {
        type: "completion",
        description: "PI multiplicative factor due to scale damage",
    },
    CAMF: {
        type: "completion",
        description: "Component aqueous mole fraction, from producing completions",
    },
    CZMF: {
        type: "completion",
        description: "Total Mole Fraction",
    },
    CKFR: {
        type: "completion",
        description: "Hydrocarbon Component",
    },
    CKFT: {
        type: "completion",
        description: "Hydrocarbon Component",
    },
    CDFAC: {
        type: "completion",
        description: "D-factor for flow dependent skin factor",
    },
    CTFR: {
        type: "completion",
        description: "Tracer Flow Rate",
    },
    CTPR: {
        type: "completion",
        description: "Tracer Production Rate",
    },
    CTPT: {
        type: "completion",
        description: "Tracer Production Total",
    },
    CTPC: {
        type: "completion",
        description: "Tracer Production Concentration",
    },
    CTIR: {
        type: "completion",
        description: "Tracer Injection Rate",
    },
    CTIT: {
        type: "completion",
        description: "Tracer Injection Total",
    },
    CTIC: {
        type: "completion",
        description: "Tracer Injection Concentration",
    },
    CAPI: {
        type: "completion",
        description: "Oil API",
    },
    CSFR: {
        type: "completion",
        description: "Salt Flow Rate",
    },
    CSPR: {
        type: "completion",
        description: "Salt Production Rate",
    },
    CSPT: {
        type: "completion",
        description: "Salt Production Total",
    },
    CSIR: {
        type: "completion",
        description: "Salt Injection Rate",
    },
    CSIT: {
        type: "completion",
        description: "Salt Injection Total",
    },
    CSPC: {
        type: "completion",
        description: "Salt Production Concentration",
    },
    CSIC: {
        type: "completion",
        description: "Salt Injection Concentration",
    },
    CTFRANI: {
        type: "completion",
        description: "Anion Flow Rate",
    },
    CTPTANI: {
        type: "completion",
        description: "Anion Production Total",
    },
    CTITANI: {
        type: "completion",
        description: "Anion Injection Total",
    },
    CTFRCAT: {
        type: "completion",
        description: "Cation Flow Rate",
    },
    CTPTCAT: {
        type: "completion",
        description: "Cation Production Total",
    },
    CTITCAT: {
        type: "completion",
        description: "Cation Injection Total",
    },
    CTIRF: {
        type: "completion",
        description: "Tracer Injection Rate",
    },
    CTIRS: {
        type: "completion",
        description: "Tracer Injection Rate",
    },
    CTPRF: {
        type: "completion",
        description: "Tracer Production Rate",
    },
    CTPRS: {
        type: "completion",
        description: "Tracer Production Rate",
    },
    CTITF: {
        type: "completion",
        description: "Tracer Injection Total",
    },
    CTITS: {
        type: "completion",
        description: "Tracer Injection Total",
    },
    CTPTF: {
        type: "completion",
        description: "Tracer Production Total",
    },
    CTPTS: {
        type: "completion",
        description: "Tracer Production Total",
    },
    CTICF: {
        type: "completion",
        description: "Tracer Injection Concentration",
    },
    CTICS: {
        type: "completion",
        description: "Tracer Injection Concentration",
    },
    CTPCF: {
        type: "completion",
        description: "Tracer Production",
    },
    CTPCS: {
        type: "completion",
        description: "Tracer Production",
    },
    CTFRFOA: {
        type: "completion",
        description: "Flow Rate",
    },
    CTPTFOA: {
        type: "completion",
        description: "Production Total",
    },
    CTITFOA: {
        type: "completion",
        description: "Injection Total",
    },
    CRREXCH: {
        type: "completion",
        description: "Exchange flux at current time",
    },
    CRRPROT: {
        type: "completion",
        description: "Connection cumulative water production",
    },
    CRRINJT: {
        type: "completion",
        description: "Connection cumulative water injection",
    },
    CCFR: {
        type: "completion",
        description: "Polymer Flow Rate",
    },
    CCPR: {
        type: "completion",
        description: "Polymer Production Rate",
    },
    CCPC: {
        type: "completion",
        description: "Polymer Production Concentration",
    },
    CCPT: {
        type: "completion",
        description: "Polymer Production Total",
    },
    CCIR: {
        type: "completion",
        description: "Polymer Injection Rate",
    },
    CCIC: {
        type: "completion",
        description: "Polymer Injection Concentration",
    },
    CCIT: {
        type: "completion",
        description: "Polymer Injection Total",
    },
    CNFR: {
        type: "completion",
        description: "Solvent Flow Rate",
    },
    CNPT: {
        type: "completion",
        description: "Solvent Production Total",
    },
    CNIT: {
        type: "completion",
        description: "Solvent Injection Total",
    },
    CTFRSUR: {
        type: "completion",
        description: "Flow Rate",
    },
    CTPTSUR: {
        type: "completion",
        description: "Production Total",
    },
    CTITSUR: {
        type: "completion",
        description: "Injection Total",
    },
    CTFRALK: {
        type: "completion",
        description: "Flow Rate",
    },
    CTPTALK: {
        type: "completion",
        description: "Production Total",
    },
    CTITALK: {
        type: "completion",
        description: "Injection Total",
    },
    LCOFRU: {
        type: "completion",
        description: "As COFRU but for local grids",
    },
    LCWFRU: {
        type: "completion",
        description: "As CWFRU but for local grids",
    },
    LCGFRU: {
        type: "completion",
        description: "As CGFRU but for local grids",
    },
    CU: {
        type: "completion",
        description: "User-defined connection quantity",
    },
    COFRL: {
        type: "completion",
        description: "Oil Flow Rate",
    },
    WOFRL: {
        type: "completion",
        description: "Oil Flow Rate",
    },
    COPRL: {
        type: "completion",
        description: "Oil Flow Rate",
    },
    WOPRL: {
        type: "completion",
        description: "Oil Flow Rate",
    },
    COPTL: {
        type: "completion",
        description: "Oil Production Total",
    },
    WOPTL: {
        type: "completion",
        description: "Oil Production Total",
    },
    COITL: {
        type: "completion",
        description: "Oil Injection Total",
    },
    WOITL: {
        type: "completion",
        description: "Oil Injection Total",
    },
    CWFRL: {
        type: "completion",
        description: "Water Flow Rate",
    },
    WWFRL: {
        type: "completion",
        description: "Water Flow Rate",
    },
    CWPRL: {
        type: "completion",
        description: "Water Flow Rate",
    },
    WWPRL: {
        type: "completion",
        description: "Water Flow Rate",
    },
    CWPTL: {
        type: "completion",
        description: "Water Production Total",
    },
    WWPTL: {
        type: "completion",
        description: "Water Production Total",
    },
    CWIRL: {
        type: "completion",
        description: "Water Injection Rate",
    },
    WWIRL: {
        type: "completion",
        description: "Water Injection Rate",
    },
    CWITL: {
        type: "completion",
        description: "Water Injection Total",
    },
    WWITL: {
        type: "completion",
        description: "Water Injection Total",
    },
    CGFRL: {
        type: "completion",
        description: "Gas Flow Rate",
    },
    WGFRL: {
        type: "completion",
        description: "Gas Flow Rate",
    },
    CGPRL: {
        type: "completion",
        description: "Gas Flow Rate",
    },
    WGPRL: {
        type: "completion",
        description: "Gas Flow Rate",
    },
    CGPTL: {
        type: "completion",
        description: "Gas Production Total",
    },
    WGPTL: {
        type: "completion",
        description: "Gas Production Total",
    },
    CGIRL: {
        type: "completion",
        description: "Gas Injection Rate",
    },
    WGIRL: {
        type: "completion",
        description: "Gas Injection Rate",
    },
    CGITL: {
        type: "completion",
        description: "Gas Injection Total",
    },
    WGITL: {
        type: "completion",
        description: "Gas Injection Total",
    },
    CLFRL: {
        type: "completion",
        description: "Liquid Flow Rate",
    },
    WLFRL: {
        type: "completion",
        description: "Liquid Flow Rate",
    },
    CLPTL: {
        type: "completion",
        description: "Liquid Production Total",
    },
    WLPTL: {
        type: "completion",
        description: "Liquid Production Total",
    },
    CVFRL: {
        type: "completion",
        description: "Reservoir",
    },
    WVFRL: {
        type: "completion",
        description: "Res Volume Flow Rate",
    },
    CVPRL: {
        type: "completion",
        description: "Res Volume Production Flow Rate",
    },
    WVPRL: {
        type: "completion",
        description: "Res Volume Production Flow Rate",
    },
    CVIRL: {
        type: "completion",
        description: "Res Volume Injection Flow Rate",
    },
    WVIRL: {
        type: "completion",
        description: "Res Volume Injection Flow Rate",
    },
    CVPTL: {
        type: "completion",
        description: "Res Volume Production Total",
    },
    WVPTL: {
        type: "completion",
        description: "Res Volume Production Total",
    },
    CVITL: {
        type: "completion",
        description: "Res Volume Injection Total",
    },
    WVITL: {
        type: "completion",
        description: "Res Volume Injection Total",
    },
    CWCTL: {
        type: "completion",
        description: "Water Cut",
    },
    WWCTL: {
        type: "completion",
        description: "Water Cut",
    },
    CGORL: {
        type: "completion",
        description: "Gas-Oil Ratio",
    },
    WGORL: {
        type: "completion",
        description: "Gas-Oil Ratio",
    },
    COGRL: {
        type: "completion",
        description: "Oil-Gas Ratio",
    },
    WOGRL: {
        type: "completion",
        description: "Oil-Gas Ratio",
    },
    CWGRL: {
        type: "completion",
        description: "Water-Gas Ratio",
    },
    WWGRL: {
        type: "completion",
        description: "Water-Gas Ratio",
    },
    CGLRL: {
        type: "completion",
        description: "Gas-Liquid Ratio",
    },
    WGLRL: {
        type: "completion",
        description: "Gas-Liquid Ratio",
    },
    CPRL: {
        type: "completion",
        description: "Average Connection Pressure in completion",
    },
    CKFRL: {
        type: "completion",
        description: "Hydrocarbon Component",
    },
    CKFTL: {
        type: "completion",
        description: "Hydrocarbon Component",
    },
    RPR: {
        type: "region",
        description: "Pressure average value",
    },
    RPRH: {
        type: "region",
        description: "Pressure average value",
    },
    RPRP: {
        type: "region",
        description: "Pressure average value",
    },
    RPRGZ: {
        type: "region",
        description: "P/Z",
    },
    RRS: {
        type: "region",
        description: "Gas-oil ratio",
    },
    RRV: {
        type: "region",
        description: "Oil-gas ratio",
    },
    RPPC: {
        type: "region",
        description: "Initial Contact Corrected Potential",
    },
    RRPV: {
        type: "region",
        description: "Pore Volume at Reservoir conditions",
    },
    ROPV: {
        type: "region",
        description: "Pore Volume containing Oil",
    },
    RWPV: {
        type: "region",
        description: "Pore Volume containing Water",
    },
    RGIP: {
        type: "region",
        description: "Gas In Place (liquid+gas phase)",
    },
    RGIPG: {
        type: "region",
        description: "Gas In Place (gas phase)",
    },
    RGIPL: {
        type: "region",
        description: "Gas In Place (liquid phase)",
    },
    RGP: {
        type: "region",
        description: "Net Gas Production (injection subtracted)",
    },
    RGPR: {
        type: "region",
        description: "Gas Production Rate",
    },
    RGPRF: {
        type: "region",
        description: "Free Gas Production Rate",
    },
    RGPRS: {
        type: "region",
        description: "Solution Gas Production Rate",
    },
    RGPT: {
        type: "region",
        description: "Gas Production Total",
    },
    RGPTF: {
        type: "region",
        description: "Free Gas Production Total",
    },
    RGPTS: {
        type: "region",
        description: "Solution Gas Production Total",
    },
    RGPV: {
        type: "region",
        description: "Pore Volume containing Gas",
    },
    RGIR: {
        type: "region",
        description: "Gas Injection Rate",
    },
    RGIT: {
        type: "region",
        description: "Gas Injection Total",
    },
    RHPV: {
        type: "region",
        description: "Pore Volume containing Hydrocarbon",
    },
    RRTM: {
        type: "region",
        description: "Transmissibility Multiplier associated with rock compaction",
    },
    ROIP: {
        type: "region",
        description: "Oil In Place (liquid+gas phase)",
    },
    ROIPG: {
        type: "region",
        description: "Oil In Place (gas phase)",
    },
    ROIPL: {
        type: "region",
        description: "Oil In Place (liquid phase)",
    },
    ROP: {
        type: "region",
        description: "Net Oil Production",
    },
    ROPR: {
        type: "region",
        description: "Oil Production Rate",
    },
    ROPRF: {
        type: "region",
        description: "Free Oil Production Rate",
    },
    ROPRS: {
        type: "region",
        description: "Solution Oil Production Rate",
    },
    ROPT: {
        type: "region",
        description: "Oil Production Total",
    },
    ROPTF: {
        type: "region",
        description: "Free Oil Production Total",
    },
    ROPTS: {
        type: "region",
        description: "Solution Oil Production Total",
    },
    ROIR: {
        type: "region",
        description: "Oil Injection Rate",
    },
    ROIT: {
        type: "region",
        description: "Oil Injection Total",
    },
    RWP: {
        type: "region",
        description: "Net Water Production",
    },
    RWPR: {
        type: "region",
        description: "Water Production Rate",
    },
    RWPT: {
        type: "region",
        description: "Water Production Total",
    },
    RWIP: {
        type: "region",
        description: "Water In Place",
    },
    RWIR: {
        type: "region",
        description: "Water Injection Rate",
    },
    RWIT: {
        type: "region",
        description: "Water Injection Total",
    },
    ROE: {
        type: "region",
        description: "(OIP(initial) - OIP(now)) / OIP(initial)",
    },
    ROEW: {
        type: "region",
        description: "Oil Production from Wells / OIP(initial)",
    },
    ROEIW: {
        type: "region",
        description: "(OIP(initial) - OIP(now)) / Initial Mobile Oil with respect to Water",
    },
    ROEWW: {
        type: "region",
        description: "Oil Production from Wells / Initial Mobile Oil with respect to Water",
    },
    ROEIG: {
        type: "region",
        description: "(OIP(initial) - OIP(now)) / Initial Mobile Oil with respect to Gas",
    },
    ROEWG: {
        type: "region",
        description: "Oil Production from Wells / Initial Mobile Oil with respect to Gas",
    },
    RORMR: {
        type: "region",
        description: "Total stock tank oil produced by rock compaction",
    },
    RORMW: {
        type: "region",
        description: "Total stock tank oil produced by water influx",
    },
    RORMG: {
        type: "region",
        description: "Total stock tank oil produced by gas influx",
    },
    RORME: {
        type: "region",
        description: "Total stock tank oil produced by oil expansion",
    },
    RORMS: {
        type: "region",
        description: "Total stock tank oil produced by solution gas",
    },
    RORMF: {
        type: "region",
        description: "Total stock tank oil produced by free gas influx",
    },
    RORMX: {
        type: "region",
        description: "Total stock tank oil produced by 'traced' water influx",
    },
    RORMY: {
        type: "region",
        description: "Total stock tank oil produced by other water influx",
    },
    RORFR: {
        type: "region",
        description: "Fraction of total oil produced by rock compaction",
    },
    RORFW: {
        type: "region",
        description: "Fraction of total oil produced by water influx",
    },
    RORFG: {
        type: "region",
        description: "Fraction of total oil produced by gas influx",
    },
    RORFE: {
        type: "region",
        description: "Fraction of total oil produced by oil expansion",
    },
    RORFS: {
        type: "region",
        description: "Fraction of total oil produced by solution gas",
    },
    RORFF: {
        type: "region",
        description: "Fraction of total oil produced by free gas influx",
    },
    RORFX: {
        type: "region",
        description: "Fraction of total oil produced by 'traced' water influx",
    },
    RORFY: {
        type: "region",
        description: "Fraction of total oil produced by other water influx",
    },
    RTIPT: {
        type: "region",
        description: "Tracer In Place",
    },
    RTIPF: {
        type: "region",
        description: "Tracer In Place",
    },
    RTIPS: {
        type: "region",
        description: "Tracer In Place",
    },
    RAPI: {
        type: "region",
        description: "Oil API",
    },
    RSIP: {
        type: "region",
        description: "Salt In Place",
    },
    RTIPTHEA: {
        type: "region",
        description: "Difference in Energy in place between current and initial time",
    },
    "RTIP#": {
        type: "region",
        description: "Tracer In Place in phase # (1,2,3,...)",
    },
    RTADS: {
        type: "region",
        description: "Tracer Adsorption total",
    },
    RTDCY: {
        type: "region",
        description: "Decayed tracer",
    },
    RCGC: {
        type: "region",
        description: "Bulk Coal Gas Concentration",
    },
    RCSC: {
        type: "region",
        description: "Bulk Coal Solvent Concentration",
    },
    RTIPTFOA: {
        type: "region",
        description: "In Solution",
    },
    RTADSFOA: {
        type: "region",
        description: "Adsorption total",
    },
    RTDCYFOA: {
        type: "region",
        description: "Decayed tracer",
    },
    RTMOBFOA: {
        type: "region",
        description: "Gas mobility factor",
    },
    RCIP: {
        type: "region",
        description: "Polymer In Solution",
    },
    RCAD: {
        type: "region",
        description: "Polymer Adsorption total",
    },
    RNIP: {
        type: "region",
        description: "Solvent In Place",
    },
    RTIPTSUR: {
        type: "region",
        description: "In Solution",
    },
    RTADSUR: {
        type: "region",
        description: "Adsorption total",
    },
    RU: {
        type: "region",
        description: "User-defined region quantity",
    },
    ROFR: {
        type: "region2region",
        description: "Inter-region oil flow rate",
    },
    "ROFR+": {
        type: "region2region",
        description: "Inter-region oil flow rate",
    },
    "ROFR-": {
        type: "region2region",
        description: "Inter-region oil flow rate",
    },
    ROFT: {
        type: "region2region",
        description: "Inter-region oil flow total",
    },
    "ROFT+": {
        type: "region2region",
        description: "Inter-region oil flow total",
    },
    "ROFT-": {
        type: "region2region",
        description: "Inter-region oil flow total",
    },
    ROFTL: {
        type: "region2region",
        description: "Inter-region oil flow total",
    },
    ROFTG: {
        type: "region2region",
        description: "Inter-region oil flow total",
    },
    RGFR: {
        type: "region2region",
        description: "Inter-region gas flow rate",
    },
    "RGFR+": {
        type: "region2region",
        description: "Inter-region gas flow rate",
    },
    "RGFR-": {
        type: "region2region",
        description: "Inter-region gas flow rate",
    },
    RGFT: {
        type: "region2region",
        description: "Inter-region gas flow total)",
    },
    "RGFT+": {
        type: "region2region",
        description: "Inter-region gas flow total",
    },
    "RGFT-": {
        type: "region2region",
        description: "Inter-region gas flow total",
    },
    RGFTL: {
        type: "region2region",
        description: "Inter-region gas flow total",
    },
    RGFTG: {
        type: "region2region",
        description: "Inter-region gas flow total",
    },
    RWFR: {
        type: "region2region",
        description: "Inter-region water flow rate",
    },
    "RWFR+": {
        type: "region2region",
        description: "Inter-region water flow rate",
    },
    "RWFR-": {
        type: "region2region",
        description: "Inter-region water flow rate",
    },
    RWFT: {
        type: "region2region",
        description: "Inter-region water flow total",
    },
    RTFTF: {
        type: "region2region",
        description: "Tracer inter-region Flow Total",
    },
    RTFTS: {
        type: "region2region",
        description: "Tracer inter-region Flow Total",
    },
    RTFTT: {
        type: "region2region",
        description: "Tracer inter-region Flow Total",
    },
    RSFT: {
        type: "region2region",
        description: "Salt inter-region Flow Total",
    },
    "RTFT#": {
        type: "region2region",
        description: "Tracer inter-region Flow in phase # (1,2,3,...)",
    },
    RTFTTFOA: {
        type: "region2region",
        description: "Inter-region Flow Total",
    },
    RCFT: {
        type: "region2region",
        description: "Polymer inter-region Flow Total",
    },
    RNFT: {
        type: "region2region",
        description: "Solvent inter-region Flow",
    },
    RTFTTSUR: {
        type: "region2region",
        description: "Inter-region Flow Total",
    },
    BPR: {
        type: "block",
        description: "Oil phase Pressure",
    },
    BPRESSUR: {
        type: "block",
        description: "Oil phase Pressure",
    },
    BWPR: {
        type: "block",
        description: "Water phase Pressure",
    },
    BGPR: {
        type: "block",
        description: "Gas phase Pressure",
    },
    BRS: {
        type: "block",
        description: "Gas-oil ratio",
    },
    BRV: {
        type: "block",
        description: "Oil-gas ratio",
    },
    BPBUB: {
        type: "block",
        description: "Bubble point pressure",
    },
    BPDEW: {
        type: "block",
        description: "Dew point pressure",
    },
    BRSSAT: {
        type: "block",
        description: "Saturated gas-oil ratio",
    },
    BRVSAT: {
        type: "block",
        description: "Saturated oil-gas ratio",
    },
    BSTATE: {
        type: "block",
        description: "Gas-oil state indicator",
    },
    BPPC: {
        type: "block",
        description: "Initial Contact Corrected Potential",
    },
    BOIP: {
        type: "block",
        description: "Oil In Place (liquid+gas phase)",
    },
    BOIPG: {
        type: "block",
        description: "Oil In Place (gas phase)",
    },
    BOIPL: {
        type: "block",
        description: "Oil In Place (liquid phase)",
    },
    BOKR: {
        type: "block",
        description: "Oil relative permeability",
    },
    BWKR: {
        type: "block",
        description: "Water relative permeability",
    },
    BGKR: {
        type: "block",
        description: "Gas relative permeability",
    },
    BKRO: {
        type: "block",
        description: "Oil relative permeability",
    },
    BKROG: {
        type: "block",
        description: "Two-phase oil relative permeability to gas",
    },
    BKROW: {
        type: "block",
        description: "Two-phase oil relative permeability to water",
    },
    BKRG: {
        type: "block",
        description: "Gas relative permeability",
    },
    BKRGO: {
        type: "block",
        description: "Two-phase gas relative permeability to oil ",
    },
    BKRGW: {
        type: "block",
        description: "Two-phase gas relative permeability to water",
    },
    BKRW: {
        type: "block",
        description: "Water relative permeability",
    },
    BKRWG: {
        type: "block",
        description: "Two-phase water relative permeability to gas",
    },
    BKRWO: {
        type: "block",
        description: "Two-phase water relative permeability to oil",
    },
    BRK: {
        type: "block",
        description: "Water relative permeability reduction factor due to polymer",
    },
    BEWKR: {
        type: "block",
        description: "Water effective relative permeability due to polymer",
    },
    BWPC: {
        type: "block",
        description: "Water-Oil capillary pressure",
    },
    BGPC: {
        type: "block",
        description: "Gas-Oil capillary pressure",
    },
    BPCO: {
        type: "block",
        description: "Oil Capillary Pressures",
    },
    BPCG: {
        type: "block",
        description: "Gas Capillary Pressures",
    },
    BPCW: {
        type: "block",
        description: "Water Capillary Pressures",
    },
    BGTRP: {
        type: "block",
        description: "Trapped gas saturation",
    },
    BGTPD: {
        type: "block",
        description: "Dynamic trapped gas saturation",
    },
    BGSHY: {
        type: "block",
        description: "Departure saturation from drainage to imbibition for gas capillary pressure hysteresis",
    },
    BGSTRP: {
        type: "block",
        description: "Trapped gas critical saturation for gas capillary pressure hysteresis",
    },
    BWSHY: {
        type: "block",
        description: "Departure saturation from drainage to imbibition for water capillary pressure hysteresis",
    },
    BWSMA: {
        type: "block",
        description: "Maximum wetting saturation for water capillary pressure hysteresis",
    },
    BMLSC: {
        type: "block",
        description: "Hydrocarbon molar density",
    },
    BMLST: {
        type: "block",
        description: "Total hydrocarbon molar density",
    },
    BMWAT: {
        type: "block",
        description: "Water molar density",
    },
    BROMLS: {
        type: "block",
        description: "Residual oil moles/ reservoir volume",
    },
    BJV: {
        type: "block",
        description: "In",
    },
    BVMF: {
        type: "block",
        description: "Vapor mole fraction",
    },
    BPSAT: {
        type: "block",
        description: "Saturation Pressures",
    },
    BAMF: {
        type: "block",
        description: "Component aqueous mole fraction",
    },
    BXMF: {
        type: "block",
        description: "Liquid hydrocarbon component mole fraction",
    },
    BYMF: {
        type: "block",
        description: "Vapor hydrocarbon component mole fraction / vapor steam",
    },
    BSMF: {
        type: "block",
        description: "CO2STORE with SOLID option only Solid hydrocarbon component mole fraction",
    },
    BSTEN: {
        type: "block",
        description: "Surface Tension",
    },
    BFMISC: {
        type: "block",
        description: "Miscibility Factor",
    },
    BREAC: {
        type: "block",
        description: "Reaction rate. The reaction number is given as a component index",
    },
    BHD: {
        type: "block",
        description: "Hydraulic head",
    },
    BHDF: {
        type: "block",
        description: "Hydraulic head at fresh water conditions",
    },
    BPR_X: {
        type: "block",
        description: "Pressure interpolated at a defined coordinate",
    },
    BHD_X: {
        type: "block",
        description: "Hydraulic head interpolated at a defined coordinate",
    },
    BHDF_X: {
        type: "block",
        description: "Hydraulic head at fresh water conditions interpolated at a defined coordinate",
    },
    BSCN_X: {
        type: "block",
        description: "Brine concentration interpolated at a defined coordinate",
    },
    BCTRA_X: {
        type: "block",
        description: "Tracer concentration interpolated at a defined coordinate",
    },
    LBPR_X: {
        type: "block",
        description: "Pressure interpolated at a defined coordinate within a local grid",
    },
    LBHD_X: {
        type: "block",
        description: "Hydraulic head interpolated at a defined coordinate within a local grid",
    },
    LBHDF_X: {
        type: "block",
        description: "Hydraulic head at freshwater conditions interpolated at a defined coordinate within a local grid",
    },
    LBSCN_X: {
        type: "block",
        description: "Brine concentration interpolated at a defined coordinate within a local grid",
    },
    LBCTRA_X: {
        type: "block",
        description: "Tracer concentration interpolated at a defined coordinate within a local grid",
    },
    BOKRX: {
        type: "block",
        description: "Oil relative permeability in the X direction",
    },
    BOKRY: {
        type: "block",
        description: "Oil relative permeability in the Y direction",
    },
    BOKRZ: {
        type: "block",
        description: "Oil relative permeability in the Z direction",
    },
    BWKRX: {
        type: "block",
        description: "Water relative permeability in the X direction",
    },
    BWKRY: {
        type: "block",
        description: "Water relative permeability in the Y direction",
    },
    BWKRZ: {
        type: "block",
        description: "Water relative permeability in the Z direction",
    },
    BGKRX: {
        type: "block",
        description: "Gas relative permeability in the X direction",
    },
    BGKRY: {
        type: "block",
        description: "Gas relative permeability in the Y direction",
    },
    BGKRZ: {
        type: "block",
        description: "Gas relative permeability in the Z direction",
    },
    BOKRI: {
        type: "block",
        description: "Oil relative permeability in the I direction",
    },
    BOKRJ: {
        type: "block",
        description: "Oil relative permeability in the J direction",
    },
    BOKRK: {
        type: "block",
        description: "Oil relative permeability in the K direction",
    },
    BWKRI: {
        type: "block",
        description: "Water relative permeability in the I direction",
    },
    BWKRJ: {
        type: "block",
        description: "Water relative permeability in the J direction",
    },
    BWKRK: {
        type: "block",
        description: "Water relative permeability in the K direction",
    },
    BGKRI: {
        type: "block",
        description: "Gas relative permeability in the I direction",
    },
    BGKRJ: {
        type: "block",
        description: "Gas relative permeability in the J direction",
    },
    BGKRK: {
        type: "block",
        description: "Gas relative permeability in the K direction",
    },
    BOKRR: {
        type: "block",
        description: "Oil relative permeability in the R",
    },
    BOKRT: {
        type: "block",
        description: "Oil relative permeability in the T",
    },
    BWKRR: {
        type: "block",
        description: "Water relative permeability in the R",
    },
    BWKRT: {
        type: "block",
        description: "Water relative permeability in the T",
    },
    BGKRR: {
        type: "block",
        description: "Gas relative permeability in the R",
    },
    BGKRT: {
        type: "block",
        description: "Gas relative permeability in the T",
    },
    BRPV: {
        type: "block",
        description: "Pore Volume at Reservoir conditions",
    },
    BPORV: {
        type: "block",
        description: "Cell Pore Volumes at Reference conditions",
    },
    BOPV: {
        type: "block",
        description: "Pore Volume containing Oil",
    },
    BWPV: {
        type: "block",
        description: "Pore Volume containing Water",
    },
    BGPV: {
        type: "block",
        description: "Pore Volume containing Gas",
    },
    BHPV: {
        type: "block",
        description: "Pore Volume containing Hydrocarbon",
    },
    BRTM: {
        type: "block",
        description: "Transmissibility Multiplier associated with rock compaction",
    },
    BPERMMOD: {
        type: "block",
        description: "Transmissibility Multiplier associated with rock compaction",
    },
    BPERMMDX: {
        type: "block",
        description: "Directional Transmissibility Multipliers in the X direction, associated with rock compaction",
    },
    BPERMMDY: {
        type: "block",
        description: "Directional Transmissibility Multipliers in the Y direction, associated with rock compaction",
    },
    BPERMMDZ: {
        type: "block",
        description: "Directional Transmissibility Multipliers in the Z direction, associated with rock compaction",
    },
    BPORVMOD: {
        type: "block",
        description: "Pore Volume Multiplier associated with rock compaction",
    },
    BSIGMMOD: {
        type: "block",
        description: "Dual Porosity Sigma Multiplier associated with rock compaction",
    },
    BTCNF: {
        type: "block",
        description: "Tracer Concentration",
    },
    BTCNS: {
        type: "block",
        description: "Tracer Concentration",
    },
    BTCN: {
        type: "block",
        description: "Tracer Concentration",
    },
    BTIPT: {
        type: "block",
        description: "Tracer In Place",
    },
    BTIPF: {
        type: "block",
        description: "Tracer In Place",
    },
    BTIPS: {
        type: "block",
        description: "Tracer In Place",
    },
    BAPI: {
        type: "block",
        description: "Oil API",
    },
    BSCN: {
        type: "block",
        description: "Salt Cell Concentration",
    },
    BSIP: {
        type: "block",
        description: "Salt In Place",
    },
    BEWV_SAL: {
        type: "block",
        description: "Effective water viscosity due to salt concentration",
    },
    BTCNFANI: {
        type: "block",
        description: "Anion Flowing Concentration",
    },
    BTCNFCAT: {
        type: "block",
        description: "Cation Flowing Concentration",
    },
    BTRADCAT: {
        type: "block",
        description: "Cation Rock Associated Concentration",
    },
    BTSADCAT: {
        type: "block",
        description: "Cation Surfactant Associated Concentration",
    },
    BESALSUR: {
        type: "block",
        description: "Effective Salinity with respect to Surfactant",
    },
    BESALPLY: {
        type: "block",
        description: "Effective Salinity with respect to Polymer",
    },
    BTCNFHEA: {
        type: "block",
        description: "Block Temperature",
    },
    BTIPTHEA: {
        type: "block",
        description: "Difference in Energy in place between current and initial time",
    },
    "BTCN#": {
        type: "block",
        description: "Tracer concentration in phase # (1,2,3,...)",
    },
    "BTIP#": {
        type: "block",
        description: "Tracer In Place in phase # (1,2,3,...)",
    },
    BTADS: {
        type: "block",
        description: "Tracer Adsorption",
    },
    BTDCY: {
        type: "block",
        description: "Decayed tracer",
    },
    BCGC: {
        type: "block",
        description: "Bulk Coal Gas Concentration",
    },
    BCSC: {
        type: "block",
        description: "Bulk Coal Solvent Concentration",
    },
    BTCNFFOA: {
        type: "block",
        description: "Concentration",
    },
    BFOAM: {
        type: "block",
        description: "Surfactant concentration",
    },
    BTCNMFOA: {
        type: "block",
        description: "Capillary number",
    },
    BFOAMCNM: {
        type: "block",
        description: "Capillary number",
    },
    BTIPTFOA: {
        type: "block",
        description: "In Solution",
    },
    BTADSFOA: {
        type: "block",
        description: "Adsorption",
    },
    BTDCYFOA: {
        type: "block",
        description: "Decayed tracer",
    },
    BTMOBFOA: {
        type: "block",
        description: "Gas mobility factor",
    },
    BFOAMMOB: {
        type: "block",
        description: "Gas mobility factor",
    },
    BTHLFFOA: {
        type: "block",
        description: "Decay Half life",
    },
    BGI: {
        type: "block",
        description: "Block Gi value",
    },
    BGIP: {
        type: "block",
        description: "Gas In Place (liquid+gas phase)",
    },
    BGIPG: {
        type: "block",
        description: "Gas In Place (gas phase)",
    },
    BGIPL: {
        type: "block",
        description: "Gas In Place (liquid phase)",
    },
    BCCN: {
        type: "block",
        description: "Polymer Concentration",
    },
    BCIP: {
        type: "block",
        description: "Polymer In Solution",
    },
    BEPVIS: {
        type: "block",
        description: "Effective polymer solution viscosity",
    },
    BVPOLY: {
        type: "block",
        description: "Effective polymer solution viscosity",
    },
    BEMVIS: {
        type: "block",
        description: "Effective mixture",
    },
    BEWV_POL: {
        type: "block",
        description: "Effective water viscosity",
    },
    BCAD: {
        type: "block",
        description: "Polymer Adsorption concentration",
    },
    BCDCS: {
        type: "block",
        description: "Polymer thermal degradation - total mass degraded in previous timestep",
    },
    BCDCR: {
        type: "block",
        description: "Polymer thermal degradation - total degradation rate",
    },
    BCDCP: {
        type: "block",
        description: "Polymer thermal degradation solution degradation rate",
    },
    BCDCA: {
        type: "block",
        description: "Polymer thermal degradation adsorbed degradation rate",
    },
    BCABnnn: {
        type: "block",
        description: "Adsorbed polymer by highest temperature band at which RRF was calculated",
    },
    BFLOW0I: {
        type: "block",
        description:
            "Inter-block water flow rate in the positive I direction multiplied by the corresponding shear multiplier",
    },
    BFLOW0J: {
        type: "block",
        description:
            "Inter-block water flow rate in the positive J direction multiplied by the corresponding shear multiplier",
    },
    BFLOW0K: {
        type: "block",
        description:
            "Inter-block water flow rate in the positive K direction multiplied by the corresponding shear multiplier",
    },
    BVELW0I: {
        type: "block",
        description: "Water velocity in the positive I direction multiplied by the corresponding shear multiplier",
    },
    BVELW0J: {
        type: "block",
        description: "Water velocity in the positive J direction multiplied by the corresponding shear multiplier",
    },
    BVELW0K: {
        type: "block",
        description: "Water velocity in the positive K direction multiplied by the corresponding shear multiplier",
    },
    BPSHLZI: {
        type: "block",
        description: "Viscosity multiplier due to sheared water flow in the positive I direction",
    },
    BPSHLZJ: {
        type: "block",
        description: "Viscosity multiplier due to sheared water flow in the positive J direction",
    },
    BPSHLZK: {
        type: "block",
        description: "Viscosity multiplier due to sheared water flow in the positive K direction",
    },
    BSRTW0I: {
        type: "block",
        description: "Water shear rate in the positive I direction prior to shear effects",
    },
    BSRTW0J: {
        type: "block",
        description: "Water shear rate in the positive J direction prior to shear effects",
    },
    BSRTW0K: {
        type: "block",
        description: "Water shear rate in the positive K direction prior to shear effects",
    },
    BSRTWI: {
        type: "block",
        description: "Water shear rate in the positive I direction following shear effects",
    },
    BSRTWJ: {
        type: "block",
        description: "Water shear rate in the positive J direction following shear effects",
    },
    BSRTWK: {
        type: "block",
        description: "Water shear rate in the positive K direction following shear effects",
    },
    BSHWVISI: {
        type: "block",
        description:
            "Shear viscosity of the water/polymer solution due to shear thinning/thickening in the positive I direction",
    },
    BSHWVISJ: {
        type: "block",
        description:
            "Shear viscosity of the water/polymer solution due to shear thinning/thickening in the positive J direction",
    },
    BSHWVISK: {
        type: "block",
        description:
            "Shear viscosity of the water/polymer solution due to shear thinning/thickening in the positive K direction",
    },
    BNSAT: {
        type: "block",
        description: "Solvent SATuration",
    },
    BNIP: {
        type: "block",
        description: "Solvent In Place",
    },
    BNKR: {
        type: "block",
        description: "Solvent relative permeability",
    },
    BTCNFSUR: {
        type: "block",
        description: "Concentration",
    },
    BSURF: {
        type: "block",
        description: "Concentration in solution",
    },
    BTIPTSUR: {
        type: "block",
        description: "In Solution",
    },
    BTADSUR: {
        type: "block",
        description: "Adsorption",
    },
    BTCASUR: {
        type: "block",
        description: "Log",
    },
    BSURFCNM: {
        type: "block",
        description: "Log",
    },
    BTSTSUR: {
        type: "block",
        description: "Surface tension",
    },
    BSURFST: {
        type: "block",
        description: "Surface tension",
    },
    BEWV_SUR: {
        type: "block",
        description: "Effective water viscosity due to surfactant concentration",
    },
    BESVIS: {
        type: "block",
        description: "Effective water viscosity due to surfactant concentration",
    },
    BTCNFALK: {
        type: "block",
        description: "Concentration",
    },
    BTADSALK: {
        type: "block",
        description: "Adsorption",
    },
    BTSTMALK: {
        type: "block",
        description: "Surface tension multiplier",
    },
    BTSADALK: {
        type: "block",
        description: "Surfactant adsorption multiplier",
    },
    BTPADALK: {
        type: "block",
        description: "Polymer adsorption multiplier",
    },
    BKRGOE: {
        type: "block",
        description: "Equivalent relative permeability to gas for gas-oil system",
    },
    BKRGWE: {
        type: "block",
        description: "Equivalent relative permeability to gas for gas-water system",
    },
    BKRWGE: {
        type: "block",
        description: "Equivalent relative permeability to water for water-gas system",
    },
    BKROWT: {
        type: "block",
        description: "Opposite saturation direction turning point relative permeability to oil for oil-water system",
    },
    BKRWOT: {
        type: "block",
        description: "Opposite saturation direction turning point relative permeability to water for water-oil system",
    },
    BKROGT: {
        type: "block",
        description: "Opposite saturation direction turning point relative permeability to oil for oil-gas system",
    },
    BKRGOT: {
        type: "block",
        description: "Opposite saturation direction turning point relative permeability to gas for gas-oil system",
    },
    BKRGWT: {
        type: "block",
        description: "Opposite saturation direction turning point relative permeability to gas for gas-water system",
    },
    BKRWGT: {
        type: "block",
        description: "Opposite saturation direction turning point relative permeability to water for water-gas system",
    },
    BIFTOW: {
        type: "block",
        description: "Oil-water interfacial tension",
    },
    BIFTWO: {
        type: "block",
        description: "Water-oil interfacial tension",
    },
    BIFTOG: {
        type: "block",
        description: "Oil-gas interfacial tension",
    },
    BIFTGO: {
        type: "block",
        description: "Gas-oil interfacial tension",
    },
    BIFTGW: {
        type: "block",
        description: "Gas-water interfacial tension",
    },
    BIFTWG: {
        type: "block",
        description: "Water-gas interfacial tension",
    },
    BPCOWR: {
        type: "block",
        description: "Representative oil-water capillary pressure",
    },
    BPCWOR: {
        type: "block",
        description: "Representative water-oil capillary pressure",
    },
    BPCOGR: {
        type: "block",
        description: "Representative oil-gas capillary pressure",
    },
    BPCGOR: {
        type: "block",
        description: "Representative gas-oil capillary pressure",
    },
    BPCGWR: {
        type: "block",
        description: "Representative gas-water capillary pressure",
    },
    BPCWGR: {
        type: "block",
        description: "Representative water-gas capillary pressure",
    },
    SOFR: {
        type: "well_segment",
        description: "Segment Oil Flow Rate",
    },
    SOFRF: {
        type: "well_segment",
        description: "Segment Free Oil Flow Rate",
    },
    SOFRS: {
        type: "well_segment",
        description: "Segment Solution Oil Flow Rate",
    },
    SWFR: {
        type: "well_segment",
        description: "Segment Water Flow Rate",
    },
    SGFR: {
        type: "well_segment",
        description: "Segment Gas Flow Rate",
    },
    SGFRF: {
        type: "well_segment",
        description: "Segment Free Gas Flow Rate",
    },
    SGFRS: {
        type: "well_segment",
        description: "Segment Solution Gas Flow Rate",
    },
    SKFR: {
        type: "well_segment",
        description: "Segment Component Flow Rate",
    },
    SCWGFR: {
        type: "well_segment",
        description: "Segment Component Flow Rate as Wet Gas",
    },
    SHFR: {
        type: "well_segment",
        description: "Segment Enthalpy Flow Rate",
    },
    SWCT: {
        type: "well_segment",
        description: "Segment Water Cut",
    },
    SGOR: {
        type: "well_segment",
        description: "Segment Gas Oil Ratio",
    },
    SOGR: {
        type: "well_segment",
        description: "Segment Oil Gas Ratio",
    },
    SWGR: {
        type: "well_segment",
        description: "Segment Water Gas Ratio",
    },
    SPR: {
        type: "well_segment",
        description: "Segment Pressure",
    },
    SPRD: {
        type: "well_segment",
        description: "Segment Pressure Drop",
    },
    SPRDF: {
        type: "well_segment",
        description: "Segment Pressure Drop component due to Friction",
    },
    SPRDH: {
        type: "well_segment",
        description: "Segment Pressure Drop component due to Hydrostatic head",
    },
    SPRDA: {
        type: "well_segment",
        description: "Segment Pressure drop due to Acceleration head",
    },
    SPRDM: {
        type: "well_segment",
        description: "Segment frictional Pressure Drop Multiplier",
    },
    SPPOW: {
        type: "well_segment",
        description: "Working power of a pull through pump",
    },
    SOFV: {
        type: "well_segment",
        description: "Segment Oil Flow Velocity",
    },
    SWFV: {
        type: "well_segment",
        description: "Segment Water Flow Velocity",
    },
    SGFV: {
        type: "well_segment",
        description: "Segment Gas Flow Velocity",
    },
    SOHF: {
        type: "well_segment",
        description: "Segment Oil Holdup Fraction",
    },
    SWHF: {
        type: "well_segment",
        description: "Segment Water Holdup Fraction",
    },
    SGHF: {
        type: "well_segment",
        description: "Segment Gas Holdup Fraction",
    },
    SDENM: {
        type: "well_segment",
        description: "Segment fluid mixture density",
    },
    SOVIS: {
        type: "well_segment",
        description: "Segment oil viscosity",
    },
    SWVIS: {
        type: "well_segment",
        description: "Segment water viscosity",
    },
    SGVIS: {
        type: "well_segment",
        description: "Segment gas viscosity",
    },
    SEMVIS: {
        type: "well_segment",
        description: "Segment effective mixture viscosity",
    },
    SGLPP: {
        type: "well_segment",
        description: "Segment Gas-Liquid Profile Parameter, C0",
    },
    SGLVD: {
        type: "well_segment",
        description: "Segment Gas-Liquid Drift Velocity, Vd",
    },
    SOWPP: {
        type: "well_segment",
        description: "Segment Oil-Water Profile Parameter, C0",
    },
    SOWVD: {
        type: "well_segment",
        description: "Segment Oil-Water Drift Velocity, Vd",
    },
    SOIMR: {
        type: "well_segment",
        description: "Segment Oil Import Rate",
    },
    SGIMR: {
        type: "well_segment",
        description: "Segment Gas Import Rate",
    },
    SWIMR: {
        type: "well_segment",
        description: "Segment Water Import Rate",
    },
    SHIMR: {
        type: "well_segment",
        description: "Segment Enthalpy Import Rate",
    },
    SORMR: {
        type: "well_segment",
        description: "Segment Oil Removal Rate",
    },
    SGRMR: {
        type: "well_segment",
        description: "Segment Gas Removal Rate",
    },
    SWRMR: {
        type: "well_segment",
        description: "Segment Water Removal Rate",
    },
    SHRMR: {
        type: "well_segment",
        description: "Segment Enthalpy Removal Rate",
    },
    SOIMT: {
        type: "well_segment",
        description: "Segment Oil Import Total",
    },
    SGIMT: {
        type: "well_segment",
        description: "Segment Gas Import Total",
    },
    SWIMT: {
        type: "well_segment",
        description: "Segment Water Import Total",
    },
    SHIMT: {
        type: "well_segment",
        description: "Segment Enthalpy Import Total",
    },
    SORMT: {
        type: "well_segment",
        description: "Segment Oil Removal Total",
    },
    SGRMT: {
        type: "well_segment",
        description: "Segment Gas Removal Total",
    },
    SWRMT: {
        type: "well_segment",
        description: "Segment Water Removal Total",
    },
    SHRMT: {
        type: "well_segment",
        description: "Segment Enthalpy Removal Total",
    },
    SAPI: {
        type: "well_segment",
        description: "Segment API value",
    },
    SCFR: {
        type: "well_segment",
        description: "Segment polymer flow rate",
    },
    SCCN: {
        type: "well_segment",
        description: "Segment polymer concentration",
    },
    SSFR: {
        type: "well_segment",
        description: "Segment brine flow rate",
    },
    SSCN: {
        type: "well_segment",
        description: "Segment brine concentration",
    },
    STFR: {
        type: "well_segment",
        description: "Segment tracer flow rate",
    },
    STFC: {
        type: "well_segment",
        description: "Segment tracer concentration",
    },
    SFD: {
        type: "well_segment",
        description: "Segment diameter for Karst Conduit Calcite Dissolution",
    },
    SPSAT: {
        type: "well_segment",
        description: "Segment Psat",
    },
    STEM: {
        type: "well_segment",
        description: "Segment Temperature",
    },
    SENE: {
        type: "well_segment",
        description: "Segment Energy Density",
    },
    SSQU: {
        type: "well_segment",
        description: "Segment Steam Quality",
    },
    SCVPR: {
        type: "well_segment",
        description: "Segment Calorific Value Production Rate",
    },
    SGQ: {
        type: "well_segment",
        description: "Segment Gas Quality",
    },
    SCSA: {
        type: "well_segment",
        description: "Segment Cross Sectional Area",
    },
    SSTR: {
        type: "well_segment",
        description: "Strength of ICD on segment",
    },
    SFOPN: {
        type: "well_segment",
        description: "Setting of segment",
    },
    SALQ: {
        type: "well_segment",
        description: "Artificial lift quantity for segment",
    },
    SRRQR: {
        type: "well_segment",
        description: "Reach flow at current time",
    },
    SRRQT: {
        type: "well_segment",
        description: "Reach cumulative flow",
    },
    SRBQR: {
        type: "well_segment",
        description: "Branch flow at current time",
    },
    SRBQT: {
        type: "well_segment",
        description: "Branch cumulative flow",
    },
    SRTQR: {
        type: "well_segment",
        description: "River total flow at current time",
    },
    SRTQT: {
        type: "well_segment",
        description: "River total cumulative flow",
    },
    SRRFLOW: {
        type: "well_segment",
        description: "Reach flux through cross-sectional area at current time",
    },
    SRRAREA: {
        type: "well_segment",
        description: "Reach area at current time",
    },
    SRRDEPTH: {
        type: "well_segment",
        description: "Reach depth at current time",
    },
    SRREXCH: {
        type: "well_segment",
        description: "Exchange flux at current time",
    },
    SRRFRODE: {
        type: "well_segment",
        description: "Reach Froude number at current time",
    },
    SRRHEAD: {
        type: "well_segment",
        description: "Reach hydraulic head at current time",
    },
    SRTFR: {
        type: "well_segment",
        description: "Reach tracer flow rate",
    },
    SRTFC: {
        type: "well_segment",
        description: "Reach tracer concentration",
    },
    SRSFR: {
        type: "well_segment",
        description: "Reach brine flow rate through connections",
    },
    SRSFC: {
        type: "well_segment",
        description: "Reach brine concentration",
    },
    SU: {
        type: "well_segment",
        description: "User-defined segment quantity",
    },
    AAQR: {
        type: "aquifer",
        description: "Aquifer influx rate",
    },
    ALQR: {
        type: "aquifer",
        description: "Aquifer influx rate",
    },
    AAQT: {
        type: "aquifer",
        description: "Cumulative aquifer influx",
    },
    ALQT: {
        type: "aquifer",
        description: "Cumulative aquifer influx",
    },
    AAQRG: {
        type: "aquifer",
        description: "Aquifer influx rate",
    },
    ALQRG: {
        type: "aquifer",
        description: "Aquifer influx rate",
    },
    AAQTG: {
        type: "aquifer",
        description: "Cumulative aquifer influx",
    },
    ALQTG: {
        type: "aquifer",
        description: "Cumulative aquifer influx",
    },
    AACMR: {
        type: "aquifer",
        description: "Aquifer component molar influx rate",
    },
    AACMT: {
        type: "aquifer",
        description: "Aquifer component molar influx totals",
    },
    AAQP: {
        type: "aquifer",
        description: "Aquifer pressure",
    },
    AAQER: {
        type: "aquifer",
        description: "Aquifer thermal energy influx rate",
    },
    AAQET: {
        type: "aquifer",
        description: "Cumulative aquifer thermal energy influx",
    },
    AAQTEMP: {
        type: "aquifer",
        description: "Aquifer temperature",
    },
    AAQENTH: {
        type: "aquifer",
        description: "Aquifer molar enthalpy",
    },
    AAQTD: {
        type: "aquifer",
        description: "Aquifer dimensionless time",
    },
    AAQPD: {
        type: "aquifer",
        description: "Aquifer dimensionless pressure",
    },
    ANQR: {
        type: "aquifer",
        description: "Aquifer influx rate",
    },
    ANQT: {
        type: "aquifer",
        description: "Cumulative aquifer influx",
    },
    ANQP: {
        type: "aquifer",
        description: "Aquifer pressure",
    },
    CPU: {
        type: "misc",
        description: "CPU",
    },
    DATE: {
        type: "misc",
        description: "Date",
    },
    DAY: {
        type: "misc",
        description: "Day",
    },
    ELAPSED: {
        type: "misc",
        description: "Elapsed time in seconds",
    },
    MLINEARS: {
        type: "misc",
        description: "Number linear iterations for each timestep",
    },
    MONTH: {
        type: "misc",
        description: "Month",
    },
    MSUMLINS: {
        type: "misc",
        description: "Total number of linear iterations since the start of the run",
    },
    MSUMNEWT: {
        type: "misc",
        description: "Total number of Newton iterations since the start of the run",
    },
    NEWTON: {
        type: "misc",
        description: "Number of Newton iterations used for each timestep",
    },
    STEPTYPE: {
        type: "misc",
        description: "Step type",
    },
    TCPU: {
        type: "misc",
        description: "TCPU",
    },
    TCPUDAY: {
        type: "misc",
        description: "TCPUDAY",
    },
    TCPUTS: {
        type: "misc",
        description: "TCPUTS",
    },
    TELAPLIN: {
        type: "misc",
        description: "TELAPLIN",
    },
    TIME: {
        type: "misc",
        description: "Time",
    },
    TIMESTEP: {
        type: "misc",
        description: "Time step",
    },
    TIMESTRY: {
        type: "misc",
        description: "TIMESTRY",
    },
    YEAR: {
        type: "misc",
        description: "Year",
    },
    YEARS: {
        type: "misc",
        description: "Years",
    },
};

import { HydrostaticEquilibriumCheck } from "./checks/HydrostaticEquilibriumCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";

QcCheckRegistry.registerCheck("hydrostatic-equilibrium", HydrostaticEquilibriumCheck);

import { HydrostaticEquilibriumGridPropertyCheck } from "./checks/HydrostaticEquilibriumGridPropertyCheck";
import { HydrostaticEquilibriumVectorCheck } from "./checks/HydrostaticEquilibriumVectorCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";

QcCheckRegistry.registerCheck("hydrostatic-equilibrium-vector", HydrostaticEquilibriumVectorCheck);
QcCheckRegistry.registerCheck("hydrostatic-equilibrium-grid-property", HydrostaticEquilibriumGridPropertyCheck);

import { DummyRandomCheck } from "./checks/DummyRandomCheck";
import { HydrostaticEquilibriumCheck } from "./checks/HydrostaticEquilibriumCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";

QcCheckRegistry.registerCheck("hydrostatic-equilibrium", HydrostaticEquilibriumCheck);

// TEMPORARY - remove together with DummyRandomCheck.ts
QcCheckRegistry.registerCheck("dummy-random-check", DummyRandomCheck);

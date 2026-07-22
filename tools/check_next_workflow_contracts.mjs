#!/usr/bin/env node
import path from "node:path";
import { assertContractSet, loadContracts } from "./lib/next_workflow/contracts.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const contracts = await loadContracts({ repositoryRoot });
const result = assertContractSet(contracts);
console.log(`next-workflow contracts: PASS (${contracts.length}/7, ${Object.keys(result.fingerprints).length} fingerprints)`);

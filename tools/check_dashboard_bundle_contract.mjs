#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDashboardBundleStandalone } from './lib/dashboard_verification.mjs';
import { VerificationError } from './lib/verification_core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root' || arg === '--policy') {
      if (index + 1 >= argv.length) throw new VerificationError('DASHBOARD_CLI', `${arg} requires a value`);
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new VerificationError('DASHBOARD_CLI', `unknown bundle-contract option: ${arg}`);
  }
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  const result = await runDashboardBundleStandalone({ root: options.root ?? ROOT, policyPath: options.policy });
  process.stdout.write(result.result.stdout);
  process.stderr.write(result.result.stderr);
  process.stdout.write(`Dashboard Control Center bundle contract passed (${result.inspection.summary})\n`);
} catch (error) {
  process.stderr.write(`${error instanceof VerificationError ? error.message : error?.stack ?? error}\n`);
  process.exitCode = 1;
}

#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatAsBuiltStatus, loadAsBuiltIndex, validateAsBuiltIndex } from './lib/as_built_index.mjs';
import { VerificationError } from './lib/verification_core.mjs';

const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const options = { status: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--status') {
      options.status = true;
      continue;
    }
    if (['--root', '--contract', '--policy'].includes(arg)) {
      if (index + 1 >= argv.length) throw new VerificationError('AS_BUILT_CLI', `${arg} requires a value`);
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new VerificationError('AS_BUILT_CLI', `unknown as-built checker option: ${arg}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.env.AS_BUILT_SYNC_ROOT ?? TOOL_ROOT);
  const policyPath = options.policy ?? process.env.AS_BUILT_SYNC_EXECUTION_POLICY_FILE ?? path.join(TOOL_ROOT, 'docs', 'workflow', 'FINAL_GATE_EXECUTION_POLICY.tsv');
  const contractPath = options.contract ?? process.env.AS_BUILT_SYNC_CONTRACT_FILE;
  const index = await loadAsBuiltIndex({ root, policyPath, contractPath });
  if (options.status) process.stdout.write(await formatAsBuiltStatus(index));
  const errors = await validateAsBuiltIndex(index);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`${error}\n`);
    process.stderr.write('\nAs-built sync contract check failed.\n');
    return 1;
  }
  process.stdout.write('As-built sync contract check passed.\n');
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    if (error instanceof VerificationError) {
      process.stderr.write(`${error.message}\n\nAs-built sync contract check failed.\n`);
      process.exitCode = 1;
      return;
    }
    process.stderr.write(`${error?.stack ?? error}\n\nAs-built sync contract check failed.\n`);
    process.exitCode = 1;
  });

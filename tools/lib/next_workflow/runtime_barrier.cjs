#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const { readSync, writeSync } = require("node:fs");

const CONTROL_FD = 9;
const STATUS_FD = 12;
const START = 0x53; // S
const RELEASE = 0x52; // R

function status(value) {
  writeSync(STATUS_FD, `${JSON.stringify(value)}\n`);
}

function failClosed(reason, child) {
  status({ stage: "fail_closed", reason, child_pid: child?.pid ?? null });
  // Keep the Bubblewrap block pipe open. Recovery can terminate this persisted
  // process group, but controller loss alone can never become an execution
  // release through EOF.
  setInterval(() => {}, 60_000);
}

function readControlByte() {
  const byte = Buffer.alloc(1);
  const count = readSync(CONTROL_FD, byte, 0, 1, null);
  return count === 1 ? byte[0] : null;
}

const unshare = process.argv[2];
const argv = process.argv.slice(3);
if (unshare !== "/proc/self/fd/3" || argv.length === 0) process.exit(126);

if (readControlByte() !== START) failClosed("controller_lost_before_start", null);
else {
  const child = spawn(unshare, argv, {
    cwd: "/",
    env: {},
    shell: false,
    detached: false,
    windowsHide: true,
    // FD 13 carries the owner-pinned provider credential file for the
    // provider-network profile. Forward it without copying bytes through
    // JavaScript; Bubblewrap consumes the descriptor as a read-only mount.
    stdio: [0, 1, 2, 3, 4, 5, 6, 7, 8, "pipe", "ignore", "ignore", "ignore", 13],
  });
  if (!Number.isSafeInteger(child.pid) || child.pid < 1) failClosed("contained_process_spawn_failed", child);
  else {
    status({ stage: "contained_process_spawned", pid: child.pid });
    child.once("error", (error) => status({ stage: "spawn_error", code: error?.code ?? "SPAWN_ERROR" }));
    child.once("close", (code, signal) => {
      status({ stage: "contained_process_closed", code, signal: signal ?? null });
      process.exitCode = Number.isSafeInteger(code) ? code : signal ? 128 : 1;
    });

    const release = readControlByte();
    if (release !== RELEASE) failClosed("controller_lost_before_release", child);
    else {
      child.stdio[9].write("1");
      child.stdio[9].end();
      status({ stage: "execution_released", pid: child.pid });
    }
  }
}

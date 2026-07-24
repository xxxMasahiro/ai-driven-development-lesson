import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readSync, realpathSync } from "node:fs";
import path from "node:path";
import { providerDigest } from "./providers.mjs";

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
const MAX_RUNTIME_FILE_BYTES = 512 * 1024 * 1024;
const MAX_RUNTIME_FILES = 128;
const PT_LOAD = 1;
const PT_DYNAMIC = 2;
const PT_INTERP = 3;
const DT_NULL = 0;
const DT_NEEDED = 1;
const DT_STRTAB = 5;
const DT_STRSZ = 10;
const DT_RPATH = 15;
const DT_RUNPATH = 29;

const ARCHITECTURES = Object.freeze({
  x64: Object.freeze({
    elf_machine: 62,
    platform: "x86_64",
    library_paths: Object.freeze([
      "/lib/x86_64-linux-gnu",
      "/usr/lib/x86_64-linux-gnu",
      "/lib64",
      "/usr/lib64",
      "/lib",
      "/usr/lib",
    ]),
  }),
  arm64: Object.freeze({
    elf_machine: 183,
    platform: "aarch64",
    library_paths: Object.freeze([
      "/lib/aarch64-linux-gnu",
      "/usr/lib/aarch64-linux-gnu",
      "/lib64",
      "/usr/lib64",
      "/lib",
      "/usr/lib",
    ]),
  }),
});

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function safeNumber(value, code) {
  const number = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(code);
  return number;
}

function assertRange(buffer, offset, length, code) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) throw new Error(code);
}

function readPinnedBytes(fd, size, code) {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_RUNTIME_FILE_BYTES) throw new Error(`${code}_SIZE_INVALID`);
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(fd, bytes, offset, size - offset, offset);
    if (count === 0) throw new Error(`${code}_SHORT_READ`);
    offset += count;
  }
  return bytes;
}

function elfReader(buffer) {
  if (buffer.length < 64 || !buffer.subarray(0, 4).equals(ELF_MAGIC)) throw new Error("PROVIDER_RUNTIME_EXECUTABLE_ELF_REQUIRED");
  const elfClass = buffer[4];
  const dataEncoding = buffer[5];
  if (![1, 2].includes(elfClass) || ![1, 2].includes(dataEncoding)) throw new Error("PROVIDER_RUNTIME_ELF_FORMAT_UNSUPPORTED");
  const littleEndian = dataEncoding === 1;
  const u16 = (offset) => {
    assertRange(buffer, offset, 2, "PROVIDER_RUNTIME_ELF_BOUNDS_INVALID");
    return littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  };
  const u32 = (offset) => {
    assertRange(buffer, offset, 4, "PROVIDER_RUNTIME_ELF_BOUNDS_INVALID");
    return littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
  };
  const i32 = (offset) => {
    assertRange(buffer, offset, 4, "PROVIDER_RUNTIME_ELF_BOUNDS_INVALID");
    return littleEndian ? buffer.readInt32LE(offset) : buffer.readInt32BE(offset);
  };
  const u64 = (offset) => {
    assertRange(buffer, offset, 8, "PROVIDER_RUNTIME_ELF_BOUNDS_INVALID");
    return littleEndian ? buffer.readBigUInt64LE(offset) : buffer.readBigUInt64BE(offset);
  };
  const i64 = (offset) => {
    assertRange(buffer, offset, 8, "PROVIDER_RUNTIME_ELF_BOUNDS_INVALID");
    return littleEndian ? buffer.readBigInt64LE(offset) : buffer.readBigInt64BE(offset);
  };
  return { elfClass, u16, u32, i32, u64, i64 };
}

function parseElfRuntime(bytes, expectedMachine) {
  const reader = elfReader(bytes);
  const { elfClass, u16, u32, i32, u64, i64 } = reader;
  const machine = u16(18);
  if (machine !== expectedMachine) throw new Error("PROVIDER_RUNTIME_ELF_ARCHITECTURE_MISMATCH");
  const headerSize = elfClass === 2 ? 64 : 52;
  if (bytes.length < headerSize) throw new Error("PROVIDER_RUNTIME_ELF_HEADER_INVALID");
  const programOffset = safeNumber(elfClass === 2 ? u64(32) : u32(28), "PROVIDER_RUNTIME_ELF_PROGRAM_OFFSET_INVALID");
  const programEntrySize = u16(elfClass === 2 ? 54 : 42);
  const programCount = u16(elfClass === 2 ? 56 : 44);
  const minimumEntrySize = elfClass === 2 ? 56 : 32;
  if (programEntrySize < minimumEntrySize || programCount < 1 || programCount > 1024) throw new Error("PROVIDER_RUNTIME_ELF_PROGRAM_TABLE_INVALID");
  assertRange(bytes, programOffset, programEntrySize * programCount, "PROVIDER_RUNTIME_ELF_PROGRAM_TABLE_INVALID");

  const segments = [];
  for (let index = 0; index < programCount; index += 1) {
    const offset = programOffset + (index * programEntrySize);
    const type = u32(offset);
    const fileOffset = safeNumber(elfClass === 2 ? u64(offset + 8) : u32(offset + 4), "PROVIDER_RUNTIME_ELF_SEGMENT_INVALID");
    const virtualAddress = safeNumber(elfClass === 2 ? u64(offset + 16) : u32(offset + 8), "PROVIDER_RUNTIME_ELF_SEGMENT_INVALID");
    const fileSize = safeNumber(elfClass === 2 ? u64(offset + 32) : u32(offset + 16), "PROVIDER_RUNTIME_ELF_SEGMENT_INVALID");
    assertRange(bytes, fileOffset, fileSize, "PROVIDER_RUNTIME_ELF_SEGMENT_INVALID");
    segments.push({ type, fileOffset, virtualAddress, fileSize });
  }

  const interpreterSegment = segments.find((segment) => segment.type === PT_INTERP);
  let interpreter = null;
  if (interpreterSegment) {
    if (interpreterSegment.fileSize < 2 || interpreterSegment.fileSize > 4096) throw new Error("PROVIDER_RUNTIME_ELF_INTERPRETER_INVALID");
    const value = bytes.subarray(interpreterSegment.fileOffset, interpreterSegment.fileOffset + interpreterSegment.fileSize);
    const nul = value.indexOf(0);
    if (nul < 1) throw new Error("PROVIDER_RUNTIME_ELF_INTERPRETER_INVALID");
    interpreter = value.subarray(0, nul).toString("utf8");
    if (!path.isAbsolute(interpreter) || path.normalize(interpreter) !== interpreter || interpreter.includes("\0")) throw new Error("PROVIDER_RUNTIME_ELF_INTERPRETER_INVALID");
  }

  const dynamic = segments.find((segment) => segment.type === PT_DYNAMIC);
  if (!dynamic) return { interpreter, needed: [], rpath: [], runpath: [] };
  const entrySize = elfClass === 2 ? 16 : 8;
  if (dynamic.fileSize % entrySize !== 0) throw new Error("PROVIDER_RUNTIME_ELF_DYNAMIC_TABLE_INVALID");
  const stringIndexes = { needed: [], rpath: [], runpath: [] };
  let stringAddress = null;
  let stringSize = null;
  for (let offset = dynamic.fileOffset; offset < dynamic.fileOffset + dynamic.fileSize; offset += entrySize) {
    const tagValue = elfClass === 2 ? i64(offset) : BigInt(i32(offset));
    const tag = safeNumber(tagValue, "PROVIDER_RUNTIME_ELF_DYNAMIC_TAG_INVALID");
    if (tag === DT_NULL) break;
    const value = safeNumber(elfClass === 2 ? u64(offset + 8) : u32(offset + 4), "PROVIDER_RUNTIME_ELF_DYNAMIC_VALUE_INVALID");
    if (tag === DT_NEEDED) stringIndexes.needed.push(value);
    else if (tag === DT_STRTAB) stringAddress = value;
    else if (tag === DT_STRSZ) stringSize = value;
    else if (tag === DT_RPATH) stringIndexes.rpath.push(value);
    else if (tag === DT_RUNPATH) stringIndexes.runpath.push(value);
  }
  if (stringIndexes.needed.length + stringIndexes.rpath.length + stringIndexes.runpath.length === 0) return { interpreter, needed: [], rpath: [], runpath: [] };
  if (!Number.isSafeInteger(stringAddress) || !Number.isSafeInteger(stringSize) || stringSize < 1) throw new Error("PROVIDER_RUNTIME_ELF_STRING_TABLE_INVALID");
  const load = segments.find((segment) => segment.type === PT_LOAD
    && stringAddress >= segment.virtualAddress
    && stringAddress + stringSize <= segment.virtualAddress + segment.fileSize);
  if (!load) throw new Error("PROVIDER_RUNTIME_ELF_STRING_TABLE_INVALID");
  const stringOffset = load.fileOffset + (stringAddress - load.virtualAddress);
  assertRange(bytes, stringOffset, stringSize, "PROVIDER_RUNTIME_ELF_STRING_TABLE_INVALID");
  const readString = (index) => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= stringSize) throw new Error("PROVIDER_RUNTIME_ELF_STRING_INVALID");
    const start = stringOffset + index;
    const endLimit = stringOffset + stringSize;
    const end = bytes.indexOf(0, start);
    if (end < start || end >= endLimit) throw new Error("PROVIDER_RUNTIME_ELF_STRING_INVALID");
    const value = bytes.subarray(start, end).toString("utf8");
    if (!value || value.includes("\0")) throw new Error("PROVIDER_RUNTIME_ELF_STRING_INVALID");
    return value;
  };
  return {
    interpreter,
    needed: stringIndexes.needed.map(readString),
    rpath: stringIndexes.rpath.flatMap((index) => readString(index).split(":")).filter(Boolean),
    runpath: stringIndexes.runpath.flatMap((index) => readString(index).split(":")).filter(Boolean),
  };
}

function protectedCanonicalPath(candidate, allowedRoots, code) {
  if (typeof candidate !== "string" || !path.isAbsolute(candidate) || path.normalize(candidate) !== candidate) throw new Error(code);
  const canonical = realpathSync(candidate);
  if (!allowedRoots.some((root) => within(root, canonical))) throw new Error(code);
  return canonical;
}

function pinRuntimeFile(candidate, mountTarget, allowedRoots, kind) {
  const canonical = protectedCanonicalPath(candidate, allowedRoots, "PROVIDER_RUNTIME_LIBRARY_SOURCE_FORBIDDEN");
  const target = path.normalize(mountTarget);
  if (!path.isAbsolute(target) || target !== mountTarget) throw new Error("PROVIDER_RUNTIME_LIBRARY_TARGET_INVALID");
  const fd = openSync(canonical, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || (info.mode & 0o022) !== 0) throw new Error("PROVIDER_RUNTIME_LIBRARY_MODE_INVALID");
    const bytes = readPinnedBytes(fd, info.size, "PROVIDER_RUNTIME_LIBRARY");
    return {
      kind,
      fd,
      source_path: canonical,
      mount_targets: [target],
      device: String(info.dev),
      inode: String(info.ino),
      size: info.size,
      digest: providerDigest(bytes),
      bytes,
      owned: true,
    };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function expandRuntimePath(value, sourceOrigin, targetOrigin, architecture) {
  if (typeof value !== "string" || value.includes("\0")) throw new Error("PROVIDER_RUNTIME_LIBRARY_SEARCH_PATH_INVALID");
  const tokenPattern = /\$(?:\{(ORIGIN|PLATFORM)\}|(ORIGIN|PLATFORM))/gu;
  const expand = (origin) => value.replace(tokenPattern, (_match, braced, plain) => {
    const token = braced ?? plain;
    return token === "ORIGIN" ? origin : architecture.platform;
  });
  const source = expand(sourceOrigin);
  const target = expand(targetOrigin);
  if (source.includes("$") || target.includes("$")) throw new Error("PROVIDER_RUNTIME_LIBRARY_SEARCH_TOKEN_UNSUPPORTED");
  const sourcePath = path.normalize(path.isAbsolute(source) ? source : path.resolve(sourceOrigin, source));
  const targetPath = path.normalize(path.isAbsolute(target) ? target : path.resolve(targetOrigin, target));
  return { source: sourcePath, target: targetPath };
}

function permittedMountTarget(target) {
  return ["/runtime", "/lib", "/lib64", "/usr/lib", "/usr/lib64"].some((root) => within(root, target));
}

function canonicalExistingRoots(candidates) {
  const roots = [];
  for (const candidate of candidates) {
    try {
      const canonical = realpathSync(candidate);
      if (lstatSync(canonical).isDirectory()) roots.push(canonical);
    } catch {}
  }
  return [...new Set(roots)];
}

function providerEntry(executableDescriptor, architecture) {
  const fd = executableDescriptor?.fd;
  if (!Number.isSafeInteger(fd) || !/^[a-f0-9]{64}$/u.test(executableDescriptor?.digest ?? "")) throw new Error("PROVIDER_PINNED_EXECUTABLE_REQUIRED");
  const info = fstatSync(fd);
  if (!info.isFile() || (info.mode & 0o111) === 0 || (info.mode & 0o022) !== 0) throw new Error("PROVIDER_EXECUTABLE_MODE_INVALID");
  if (executableDescriptor.device !== undefined && String(info.dev) !== String(executableDescriptor.device)) throw new Error("PROVIDER_PINNED_EXECUTABLE_DRIFT");
  if (executableDescriptor.inode !== undefined && String(info.ino) !== String(executableDescriptor.inode)) throw new Error("PROVIDER_PINNED_EXECUTABLE_DRIFT");
  if (executableDescriptor.size !== undefined && info.size !== executableDescriptor.size) throw new Error("PROVIDER_PINNED_EXECUTABLE_DRIFT");
  const bytes = readPinnedBytes(fd, info.size, "PROVIDER_EXECUTABLE");
  if (providerDigest(bytes) !== executableDescriptor.digest) throw new Error("PROVIDER_PINNED_EXECUTABLE_DRIFT");
  let sourcePath;
  try {
    sourcePath = realpathSync(executableDescriptor.path ?? `/proc/self/fd/${fd}`);
  } catch {
    throw new Error("PROVIDER_PINNED_EXECUTABLE_PATH_INVALID");
  }
  const runtime = parseElfRuntime(bytes, architecture.elf_machine);
  return {
    kind: "provider",
    fd,
    source_path: sourcePath,
    mount_targets: ["/runtime/provider"],
    device: String(info.dev),
    inode: String(info.ino),
    size: info.size,
    digest: executableDescriptor.digest,
    owned: false,
    runtime,
  };
}

function closureMetadata(entries) {
  return entries.map(({ kind, source_path: sourcePath, mount_targets: mountTargets, device, inode, size, digest }) => ({
    kind,
    canonical_source_path: sourcePath,
    mount_targets: [...mountTargets].sort(),
    device,
    inode,
    size,
    sha256: digest,
  }));
}

export function resolveProviderRuntimeClosure(executableDescriptor, { architectureName = process.arch } = {}) {
  if (process.platform !== "linux") throw new Error("PROVIDER_RUNTIME_CLOSURE_UNAVAILABLE");
  const architecture = ARCHITECTURES[architectureName];
  if (!architecture) throw new Error("PROVIDER_RUNTIME_ELF_ARCHITECTURE_UNSUPPORTED");
  const allowedLibraryRoots = canonicalExistingRoots(architecture.library_paths);
  if (allowedLibraryRoots.length === 0) throw new Error("PROVIDER_RUNTIME_LIBRARY_ROOT_UNAVAILABLE");
  const entries = [];
  const bySource = new Map();
  const pending = [];
  const provider = providerEntry(executableDescriptor, architecture);
  entries.push(provider);
  pending.push(provider);

  const addPinnedFile = (candidate, mountTarget, kind) => {
    if (!permittedMountTarget(mountTarget)) throw new Error("PROVIDER_RUNTIME_LIBRARY_TARGET_FORBIDDEN");
    const pinned = pinRuntimeFile(candidate, mountTarget, allowedLibraryRoots, kind);
    const existing = bySource.get(pinned.source_path);
    if (existing) {
      closeSync(pinned.fd);
      if (!existing.mount_targets.includes(mountTarget)) existing.mount_targets.push(mountTarget);
      return existing;
    }
    if (entries.length >= MAX_RUNTIME_FILES) {
      closeSync(pinned.fd);
      throw new Error("PROVIDER_RUNTIME_CLOSURE_SIZE_INVALID");
    }
    pinned.runtime = parseElfRuntime(pinned.bytes, architecture.elf_machine);
    delete pinned.bytes;
    bySource.set(pinned.source_path, pinned);
    entries.push(pinned);
    pending.push(pinned);
    return pinned;
  };

  try {
    if (provider.runtime.interpreter) addPinnedFile(provider.runtime.interpreter, provider.runtime.interpreter, "interpreter");
    while (pending.length > 0) {
      const current = pending.shift();
      const sourceOrigin = path.dirname(current.source_path);
      const targetOrigin = path.dirname(current.mount_targets[0]);
      const configuredSearch = current.runtime.runpath.length > 0 ? current.runtime.runpath : current.runtime.rpath;
      const expandedSearch = configuredSearch.map((entry) => expandRuntimePath(entry, sourceOrigin, targetOrigin, architecture));
      const search = [
        ...expandedSearch,
        ...architecture.library_paths.map((directory) => ({ source: directory, target: directory })),
      ];
      for (const needed of current.runtime.needed) {
        if (needed.includes("\0") || (needed.includes("/") && !path.isAbsolute(needed))) throw new Error("PROVIDER_RUNTIME_LIBRARY_NAME_INVALID");
        let resolved = null;
        if (path.isAbsolute(needed)) {
          resolved = { candidate: path.normalize(needed), target: path.normalize(needed) };
        } else {
          for (const directory of search) {
            const candidate = path.join(directory.source, needed);
            try {
              const canonical = protectedCanonicalPath(candidate, allowedLibraryRoots, "PROVIDER_RUNTIME_LIBRARY_SOURCE_FORBIDDEN");
              if (lstatSync(canonical).isFile()) {
                resolved = { candidate, target: path.join(directory.target, needed) };
                break;
              }
            } catch {}
          }
        }
        if (!resolved) throw new Error(`PROVIDER_RUNTIME_LIBRARY_NOT_FOUND:${needed}`);
        addPinnedFile(resolved.candidate, path.normalize(resolved.target), "library");
      }
    }
    const metadata = closureMetadata(entries);
    const fingerprint = providerDigest({ schema_version: "1.0.0", files: metadata });
    let closed = false;
    return Object.freeze({
      schema_version: "1.0.0",
      entries,
      files: metadata,
      fingerprint,
      close() {
        if (closed) return;
        closed = true;
        for (const entry of entries) {
          if (entry.owned) closeSync(entry.fd);
        }
      },
    });
  } catch (error) {
    for (const entry of entries) {
      if (entry.owned) {
        try { closeSync(entry.fd); } catch {}
      }
    }
    throw error;
  }
}

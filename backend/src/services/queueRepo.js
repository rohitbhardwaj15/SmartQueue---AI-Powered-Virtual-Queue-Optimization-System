import crypto from "node:crypto";
import { QueueEntry } from "../models/QueueEntry.js";
import { useMemoryStore } from "../config/db.js";

const memoryEntries = [];

function matches(item, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value === undefined || value === null || value === "") return true;
    return item[key] === value;
  });
}

function sortByJoinedAtAsc(a, b) {
  return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
}

function sortByJoinedAtDesc(a, b) {
  return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
}

export async function countEntries(filter = {}) {
  if (useMemoryStore) {
    return memoryEntries.filter((item) => matches(item, filter)).length;
  }
  return QueueEntry.countDocuments(filter);
}

export async function findEntries(filter = {}, { sort = "asc", limit = 500 } = {}) {
  if (useMemoryStore) {
    const items = memoryEntries.filter((item) => matches(item, filter));
    const sorted = [...items].sort(sort === "asc" ? sortByJoinedAtAsc : sortByJoinedAtDesc);
    return sorted.slice(0, limit);
  }

  const order = sort === "asc" ? 1 : -1;
  return QueueEntry.find(filter).sort({ joinedAt: order }).limit(limit);
}

export async function createEntry(payload) {
  if (useMemoryStore) {
    const entry = {
      _id: crypto.randomUUID(),
      ...payload,
      joinedAt: payload.joinedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryEntries.push(entry);
    return entry;
  }

  return QueueEntry.create(payload);
}

export async function findLatestTokenBySector(sector) {
  if (useMemoryStore) {
    const tokens = memoryEntries
      .filter((item) => item.sector === sector && typeof item.tokenNumber === "string")
      .map((item) => item.tokenNumber)
      .sort((a, b) => b.localeCompare(a));
    return tokens[0] ?? null;
  }

  const latest = await QueueEntry.findOne({ sector }).sort({ tokenNumber: -1 }).select({ tokenNumber: 1 });
  return latest?.tokenNumber ?? null;
}

export async function findEntryById(id) {
  if (useMemoryStore) {
    return memoryEntries.find((item) => item._id === id) ?? null;
  }

  return QueueEntry.findById(id);
}

export async function updateEntryById(id, patch) {
  if (useMemoryStore) {
    const idx = memoryEntries.findIndex((item) => item._id === id);
    if (idx < 0) return null;

    memoryEntries[idx] = {
      ...memoryEntries[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    return memoryEntries[idx];
  }

  return QueueEntry.findByIdAndUpdate(id, patch, { new: true });
}

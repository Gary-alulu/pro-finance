// lib/invoices/localDrafts.js
// Browser-only draft + issuer settings store for Stage 1.
//
// This is an explicit integration boundary, not a pretend database. When the
// server invoice engine lands (Stage 2), swap these helpers for API calls with
// the same shape. Nothing here is authoritative, shared across devices, or
// visible to the server.

import { defaultInvoiceSettings } from "./constants.js";
import { duplicateInvoice } from "./factories.js";

const DRAFTS_KEY = "pf.invoices.drafts.v1";
const SETTINGS_KEY = "pf.invoices.settings.v1";
const CHANGE_EVENT = "pf:invoices-changed";

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJSON(key, fallback) {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (err) {
    console.error("[Invoices] Could not write local draft data", err);
  }
}

function mergeSettings(raw) {
  const base = defaultInvoiceSettings();
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...base,
    ...source,
    issuer: { ...base.issuer, ...(source.issuer || {}) },
    numbering: { ...base.numbering, ...(source.numbering || {}) },
  };
}

export function readInvoiceSettings() {
  return mergeSettings(readJSON(SETTINGS_KEY, {}));
}

export function saveInvoiceSettings(settings) {
  const merged = mergeSettings(settings);
  writeJSON(SETTINGS_KEY, merged);
  return merged;
}

export function readDrafts() {
  const list = readJSON(DRAFTS_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && typeof item === "object" && item.id);
}

export function getDraft(id) {
  return readDrafts().find((item) => item.id === id) || null;
}

export function saveDraft(invoice) {
  if (!invoice?.id) throw new Error("A draft needs an id");
  const now = new Date().toISOString();
  const next = { ...invoice, updatedAt: now };
  const list = readDrafts();
  const index = list.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    list[index] = next;
  } else {
    list.unshift(next);
  }
  writeJSON(DRAFTS_KEY, list);
  return next;
}

export function deleteDraft(id) {
  writeJSON(
    DRAFTS_KEY,
    readDrafts().filter((item) => item.id !== id)
  );
}

export function duplicateDraft(id) {
  const source = getDraft(id);
  if (!source) return null;
  const copy = duplicateInvoice(source);
  saveDraft(copy);
  return copy;
}

export function clearDrafts() {
  writeJSON(DRAFTS_KEY, []);
}

/**
 * Notify the current tab immediately and other tabs through the storage event.
 * Returns an unsubscribe function.
 */
export function subscribeToInvoiceChanges(callback) {
  if (!hasWindow()) return () => {};
  const onStorage = (event) => {
    if (!event.key || event.key === DRAFTS_KEY || event.key === SETTINGS_KEY) {
      callback();
    }
  };
  const onLocalChange = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onLocalChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onLocalChange);
  };
}

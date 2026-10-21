// lib/audit/logAudit.js
// Append-only audit logging for important financial changes.
// Never throws — an audit failure must not roll back a successful user action,
// but it is logged loudly so it can be investigated.
//
// Usage (inside a route handler that already has `userId`):
//   await logAudit(userId, "create", "asset", asset.id, null, after, "Created asset X");

import AuditEvent from "@/lib/db/models/AuditEvent";

/** Fields that must never be written into an audit trail. */
const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "storageKey",
  "secret",
  "apiKey",
  "token",
]);

function redact(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return "[depth-limited]";
  if (Array.isArray(value)) return value.slice(0, 25).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    // Decimal128 / BSON types
    if (typeof value.toString === "function" && value._bsontype) {
      return value.toString();
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACT_KEYS.has(k)) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) {
    return value.slice(0, 500) + "…";
  }
  return value;
}

/**
 * Record an audit event. Call after the mutation has succeeded.
 *
 * @param {string} ownerId   - the account owner (session user id)
 * @param {string} action    - create | update | delete | approve | reject | export | login
 * @param {string} entityType- entity kind, see AuditEvent schema enum
 * @param {string|null} entityId
 * @param {object|null} before - redacted prior state (omit for create)
 * @param {object|null} after  - redacted new state (omit for delete)
 * @param {string} [summary]   - human-readable one-liner
 * @param {object} [meta]      - { actorId, ip, userAgent }
 */
export async function logAudit(
  ownerId,
  action,
  entityType,
  entityId = null,
  before = null,
  after = null,
  summary = "",
  meta = {}
) {
  try {
    await AuditEvent.create({
      ownerId,
      actorId: meta.actorId || ownerId,
      action,
      entityType,
      entityId: entityId || undefined,
      before: before ? redact(before) : undefined,
      after: after ? redact(after) : undefined,
      summary: summary ? String(summary).slice(0, 1000) : undefined,
      ip: meta.ip,
      userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 500) : undefined,
    });
  } catch (err) {
    console.error("[Audit] Failed to persist audit event", {
      ownerId,
      action,
      entityType,
      entityId,
      error: err?.message,
    });
  }
}

/**
 * Extract request metadata for the audit trail.
 * M-9: trust the RIGHTMOST x-forwarded-for hop — that is the one appended by
 * the nearest (trusted) proxy. Leftmost entries are client-controlled and
 * spoofable. x-real-ip is only consulted when the trusted proxy sets it.
 */
export function requestMeta(request) {
  const forwarded = request?.headers?.get?.("x-forwarded-for");
  let ip;
  if (forwarded) {
    const hops = forwarded.split(",");
    ip = hops[hops.length - 1].trim() || undefined;
  }
  if (!ip) {
    ip = request?.headers?.get?.("x-real-ip") || undefined;
  }
  return {
    ip,
    userAgent: request?.headers?.get?.("user-agent") || undefined,
  };
}

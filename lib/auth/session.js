// lib/auth/session.js
// Server-side session helpers — call these from Route Handlers and Server Components.

import { auth } from "@/auth";

/**
 * Get the current session. Throws if unauthenticated.
 * Use in Server Components and Route Handlers.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

/**
 * Get the current user ID. Throws if unauthenticated.
 */
export async function requireUserId() {
  const session = await requireSession();
  return session.user.id;
}

/**
 * Assert that a record belongs to the current user.
 * Throws an authorization error if ownership does not match.
 * @param {string|object} recordOwnerId - the ownerId stored on the record
 * @param {string} userId - the authenticated user ID
 */
export function assertOwnership(recordOwnerId, userId) {
  const ownerId = recordOwnerId?.toString();
  if (ownerId !== userId) {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Assert that a referenced document exists and is owned by the current user.
 * Use for any client-supplied foreign key (linked asset/account ids, etc.)
 * so a user can never attach or traverse another user's records.
 * Throws NOT_FOUND if missing, FORBIDDEN if owned by someone else.
 * @returns the lean {_id, ownerId} doc.
 */
export async function assertOwnedRef(Model, id, userId) {
  const doc = await Model.findById(id).select("_id ownerId").lean();
  if (!doc) {
    throw new Error("NOT_FOUND");
  }
  assertOwnership(doc.ownerId, userId);
  return doc;
}

/**
 * Standard JSON error response factory for API routes.
 */
export function apiError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Standard validation-failure response from a zod SafeParse result.
 */
export function validationError(result) {
  return Response.json(
    {
      error: "Validation failed",
      issues: result.error.flatten().fieldErrors,
    },
    { status: 400 }
  );
}

/**
 * Wrap a route handler with standard error handling.
 * Catches UNAUTHENTICATED and FORBIDDEN errors and returns appropriate status codes.
 */
export function withErrorHandling(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err.message === "UNAUTHENTICATED") {
        return apiError("Authentication required", 401);
      }
      if (err.message === "FORBIDDEN") {
        return apiError("Access denied", 403);
      }
      if (err.message === "NOT_FOUND") {
        return apiError("Resource not found", 404);
      }
      if (err.name === "ValidationError") {
        return apiError(err.message, 400);
      }
      if (err.name === "CastError") {
        return apiError("Invalid identifier", 400);
      }
      if (err instanceof SyntaxError && /JSON/i.test(err.message)) {
        return apiError("Invalid JSON body", 400);
      }
      console.error("[API Error]", err);
      return apiError("An unexpected error occurred", 500);
    }
  };
}

// tests/profile-schemas.test.mjs
// Validates the profile-change schemas (changeProfileSchema) used by
// PATCH /api/user/profile.
import test from "node:test";
import assert from "node:assert/strict";
import { changeProfileSchema } from "../lib/validations/schemas.js";

test("details mode accepts a name change with current password", () => {
  const r = changeProfileSchema.safeParse({
    mode: "details",
    currentPassword: "Secret123",
    name: "Jane Doe",
  });
  assert.equal(r.success, true);
  assert.equal(r.data.name, "Jane Doe");
});

test("details mode accepts an email change with current password", () => {
  const r = changeProfileSchema.safeParse({
    mode: "details",
    currentPassword: "Secret123",
    email: "new@example.com",
  });
  assert.equal(r.success, true);
  assert.equal(r.data.email, "new@example.com");
});

test("details mode rejects a malformed email", () => {
  const r = changeProfileSchema.safeParse({
    mode: "details",
    currentPassword: "Secret123",
    email: "not-an-email",
  });
  assert.equal(r.success, false);
});

test("details mode requires the current password", () => {
  const r = changeProfileSchema.safeParse({ mode: "details", name: "Jane Doe" });
  assert.equal(r.success, false);
});

test("details mode rejects a too-short name", () => {
  const r = changeProfileSchema.safeParse({
    mode: "details",
    currentPassword: "Secret123",
    name: "J",
  });
  assert.equal(r.success, false);
});

test("password mode accepts a strong new password", () => {
  const r = changeProfileSchema.safeParse({
    mode: "password",
    currentPassword: "OldSecret1",
    newPassword: "NewSecret1",
  });
  assert.equal(r.success, true);
});

test("password mode rejects weak new passwords", () => {
  const weak = [
    "short1A", // under 8
    "alllowercase1", // no uppercase
    "NoNumberHere", // no number
  ];
  for (const newPassword of weak) {
    const r = changeProfileSchema.safeParse({
      mode: "password",
      currentPassword: "OldSecret1",
      newPassword,
    });
    assert.equal(r.success, false, `expected "${newPassword}" to be rejected`);
  }
});

test("unknown mode is rejected by the discriminated union", () => {
  const r = changeProfileSchema.safeParse({
    mode: "delete-everything",
    currentPassword: "OldSecret1",
  });
  assert.equal(r.success, false);
});

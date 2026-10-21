// lib/storage/storage.js
// Private file storage adapter.
// In development / on-prem, stores files in a private workspace storage directory.
// Files are NEVER accessible via public URLs; access is mediated by /api/documents/[id]/file.

import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "private_storage", "uploads");

/**
 * Save an uploaded file buffer securely.
 * @param {string} ownerId
 * @param {string} documentId
 * @param {string} filename
 * @param {Buffer} buffer
 * @returns {Promise<string>} storageKey
 */
export async function saveFile(ownerId, documentId, filename, buffer) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(STORAGE_ROOT, ownerId.toString(), documentId.toString());
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, sanitizedFilename);
  await fs.writeFile(filePath, buffer);

  // Return relative storageKey
  return `${ownerId}/${documentId}/${sanitizedFilename}`;
}

/**
 * Read a file buffer securely.
 * @param {string} storageKey
 * @returns {Promise<Buffer>}
 */
export async function getFile(storageKey) {
  const safePath = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.join(STORAGE_ROOT, safePath);
  return await fs.readFile(fullPath);
}

/**
 * Delete a file securely.
 * @param {string} storageKey
 */
export async function deleteFile(storageKey) {
  try {
    const safePath = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(STORAGE_ROOT, safePath);
    await fs.unlink(fullPath);
  } catch (err) {
    console.warn("Could not delete file:", storageKey, err.message);
  }
}

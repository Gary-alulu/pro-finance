// lib/storage/storage.js
// Private file storage adapter.
// Uses S3-compatible object storage when configured (AWS S3, Cloudflare R2),
// otherwise falls back to a private local directory for development / on-prem.
// Files are NEVER accessible via public URLs; access is mediated by /api/documents/[id]/file.

import fs from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const STORAGE_ROOT = path.join(process.cwd(), "private_storage", "uploads");
const BUCKET = process.env.STORAGE_BUCKET;
const USE_S3 = Boolean(
  BUCKET &&
    process.env.STORAGE_ACCESS_KEY_ID &&
    process.env.STORAGE_SECRET_ACCESS_KEY
);

let s3Client;
function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.STORAGE_REGION || "us-east-1",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildStorageKey(ownerId, documentId, filename) {
  return `${ownerId}/${documentId}/${sanitizeFilename(filename)}`;
}

/**
 * Save an uploaded file buffer securely.
 * @param {string} ownerId
 * @param {string} documentId
 * @param {string} filename
 * @param {Buffer} buffer
 * @returns {Promise<string>} storageKey
 */
export async function saveFile(ownerId, documentId, filename, buffer) {
  const storageKey = buildStorageKey(ownerId, documentId, filename);

  if (USE_S3) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: storageKey,
        Body: buffer,
      })
    );
    return storageKey;
  }

  const dir = path.join(STORAGE_ROOT, ownerId.toString(), documentId.toString());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, sanitizeFilename(filename)), buffer);

  return storageKey;
}

/**
 * Read a file buffer securely.
 * @param {string} storageKey
 * @returns {Promise<Buffer>}
 */
export async function getFile(storageKey) {
  if (USE_S3) {
    const response = await getS3Client().send(
      new GetObjectCommand({ Bucket: BUCKET, Key: storageKey })
    );
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  const safePath = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.join(STORAGE_ROOT, safePath);
  return await fs.readFile(fullPath);
}

/**
 * Delete a file securely.
 * @param {string} storageKey
 */
export async function deleteFile(storageKey) {
  if (USE_S3) {
    try {
      await getS3Client().send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey })
      );
    } catch (err) {
      console.warn("Could not delete file:", storageKey, err.message);
    }
    return;
  }

  try {
    const safePath = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(STORAGE_ROOT, safePath);
    await fs.unlink(fullPath);
  } catch (err) {
    console.warn("Could not delete file:", storageKey, err.message);
  }
}

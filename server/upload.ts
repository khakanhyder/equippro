import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

const s3Client = new S3Client({
  region: process.env.WASABI_REGION || 'us-east-1',
  endpoint: process.env.WASABI_ENDPOINT,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR;

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB

export function validateFileType(mimetype: string, type: 'image' | 'document'): boolean {
  if (type === 'image') {
    return ALLOWED_IMAGE_TYPES.includes(mimetype);
  }
  return ALLOWED_DOCUMENT_TYPES.includes(mimetype);
}

export function validateFileSize(size: number, type: 'image' | 'document'): boolean {
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
  return size <= maxSize;
}

export async function uploadFile(
  file: Express.Multer.File,
  type: 'image' | 'document'
): Promise<UploadResult> {
  if (!validateFileType(file.mimetype, type)) {
    throw new Error(`Invalid file type. Expected ${type}, got ${file.mimetype}`);
  }

  if (!validateFileSize(file.size, type)) {
    const maxSizeMB = type === 'image' ? 10 : 25;
    throw new Error(`File too large. Maximum size is ${maxSizeMB}MB`);
  }

  const timestamp = Date.now();
  const randomId = randomUUID().substring(0, 8);
  const ext = path.extname(file.originalname);
  const filename = `equipment_${timestamp}_${randomId}${ext}`;
  
  const key = `${PRIVATE_DIR}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_ID,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const url = `https://${BUCKET_ID}.s3.amazonaws.com${key}`;

  return {
    url,
    filename,
    size: file.size,
    contentType: file.mimetype,
  };
}

export async function uploadMultipleFiles(
  files: Express.Multer.File[],
  type: 'image' | 'document'
): Promise<UploadResult[]> {
  return Promise.all(files.map(file => uploadFile(file, type)));
}

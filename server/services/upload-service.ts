import { Client } from "@replit/object-storage";
import { randomUUID } from "crypto";
import path from "path";

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (!BUCKET_ID) {
  throw new Error('DEFAULT_OBJECT_STORAGE_BUCKET_ID environment variable is required');
}

const client = new Client({ bucketId: BUCKET_ID });

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
  
  const { ok, error } = await client.uploadFromBytes(filename, file.buffer);
  
  if (!ok) {
    throw new Error(error?.message || 'Upload failed');
  }

  const baseUrl = process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : 'http://localhost:5000';
  const url = `${baseUrl}/api/files/${filename}`;

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

export async function downloadFile(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { ok, value, error } = await client.downloadAsBytes(filename);
  
  if (!ok) {
    console.error('Download failed:', error);
    return null;
  }

  const ext = path.extname(filename).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  return {
    buffer: value[0],
    contentType,
  };
}

/**
 * File Upload Service
 * 
 * Supports dual storage backends:
 * - Development (Replit): Uses Replit Object Storage
 * - Production: Uses Wasabi S3-compatible storage
 * 
 * Automatically selects the appropriate backend based on NODE_ENV
 */
import { Client as ReplitClient } from "@replit/object-storage";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Replit Object Storage client (for development)
let replitClient: ReplitClient | null = null;
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (!isProduction && BUCKET_ID) {
  replitClient = new ReplitClient({ bucketId: BUCKET_ID });
  console.log('[Storage] Using Replit Object Storage (development)');
}

// Wasabi S3 client (for production)
let s3Client: S3Client | null = null;
const WASABI_BUCKET = process.env.WASABI_BUCKET_NAME;
const WASABI_ENDPOINT = process.env.WASABI_ENDPOINT;
const WASABI_REGION = process.env.WASABI_REGION;
const WASABI_ACCESS_KEY = process.env.WASABI_ACCESS_KEY_ID;
const WASABI_SECRET_KEY = process.env.WASABI_SECRET_ACCESS_KEY;

if (isProduction && WASABI_ACCESS_KEY && WASABI_SECRET_KEY && WASABI_BUCKET) {
  // Build endpoint URL - ensure https:// prefix
  let endpoint = WASABI_ENDPOINT || `s3.${WASABI_REGION || 'us-east-1'}.wasabisys.com`;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }
  
  s3Client = new S3Client({
    endpoint,
    region: WASABI_REGION || 'us-east-1',
    credentials: {
      accessKeyId: WASABI_ACCESS_KEY,
      secretAccessKey: WASABI_SECRET_KEY,
    },
    forcePathStyle: true, // Required for Wasabi and S3-compatible storage
  });
  console.log(`[Storage] Using Wasabi S3 Storage (production) - Bucket: ${WASABI_BUCKET}, Endpoint: ${endpoint}`);
}

// Validate storage is configured
if (!isProduction && !replitClient) {
  console.warn('[Storage] Warning: Replit Object Storage not configured (DEFAULT_OBJECT_STORAGE_BUCKET_ID missing)');
}

if (isProduction && !s3Client) {
  console.warn('[Storage] Warning: Wasabi S3 not configured - check WASABI_* environment variables');
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export function getBaseUrl(protocol?: string, host?: string): string {
  if (protocol && host) {
    return `${protocol}://${host}`;
  }
  
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    if (domains.length > 0 && domains[0]) {
      return `https://${domains[0]}`;
    }
  }
  
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  
  return 'http://localhost:5000';
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

// Upload to Replit Object Storage
async function uploadToReplit(filename: string, buffer: Buffer): Promise<void> {
  if (!replitClient) {
    throw new Error('Replit Object Storage not configured');
  }
  
  const { ok, error } = await replitClient.uploadFromBytes(filename, buffer);
  
  if (!ok) {
    throw new Error(error?.message || 'Replit upload failed');
  }
}

// Upload to Wasabi S3
async function uploadToWasabi(filename: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!s3Client || !WASABI_BUCKET) {
    throw new Error('Wasabi S3 not configured');
  }
  
  const command = new PutObjectCommand({
    Bucket: WASABI_BUCKET,
    Key: `uploads/${filename}`,
    Body: buffer,
    ContentType: contentType,
  });
  
  await s3Client.send(command);
  
  // Return the public URL for the file
  let endpoint = WASABI_ENDPOINT || `s3.${WASABI_REGION || 'us-east-1'}.wasabisys.com`;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }
  return `${endpoint}/${WASABI_BUCKET}/uploads/${filename}`;
}

export async function uploadFile(
  file: Express.Multer.File,
  type: 'image' | 'document',
  protocol?: string,
  host?: string
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
  
  let url: string;
  
  if (isProduction) {
    // Production: Upload to Wasabi S3
    url = await uploadToWasabi(filename, file.buffer, file.mimetype);
  } else {
    // Development: Upload to Replit Object Storage
    await uploadToReplit(filename, file.buffer);
    const baseUrl = getBaseUrl(protocol, host);
    url = `${baseUrl}/api/files/${filename}`;
  }

  return {
    url,
    filename,
    size: file.size,
    contentType: file.mimetype,
  };
}

export async function uploadMultipleFiles(
  files: Express.Multer.File[],
  type: 'image' | 'document',
  protocol?: string,
  host?: string
): Promise<UploadResult[]> {
  return Promise.all(files.map(file => uploadFile(file, type, protocol, host)));
}

// Download from Replit Object Storage
async function downloadFromReplit(filename: string): Promise<Buffer | null> {
  if (!replitClient) {
    return null;
  }
  
  const { ok, value, error } = await replitClient.downloadAsBytes(filename);
  
  if (!ok) {
    console.error('Replit download failed:', error);
    return null;
  }
  
  return value[0];
}

// Download from Wasabi S3
async function downloadFromWasabi(filename: string): Promise<Buffer | null> {
  if (!s3Client || !WASABI_BUCKET) {
    return null;
  }
  
  try {
    const command = new GetObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: `uploads/${filename}`,
    });
    
    const response = await s3Client.send(command);
    
    if (response.Body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    
    return null;
  } catch (error) {
    console.error('Wasabi download failed:', error);
    return null;
  }
}

export async function downloadFile(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  let buffer: Buffer | null = null;
  
  if (isProduction) {
    buffer = await downloadFromWasabi(filename);
  } else {
    buffer = await downloadFromReplit(filename);
  }
  
  if (!buffer) {
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
    buffer,
    contentType,
  };
}

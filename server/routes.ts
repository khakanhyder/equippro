import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { uploadFile, uploadMultipleFiles, validateFileType, validateFileSize } from "./upload";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload single file (image or document)
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const type = (req.body.type || 'image') as 'image' | 'document';
      
      if (!validateFileType(req.file.mimetype, type)) {
        return res.status(400).json({ 
          message: `Invalid file type for ${type}. Expected ${type} file.` 
        });
      }

      if (!validateFileSize(req.file.size, type)) {
        const maxSizeMB = type === 'image' ? 10 : 25;
        return res.status(400).json({ 
          message: `File too large. Maximum size is ${maxSizeMB}MB` 
        });
      }

      const result = await uploadFile(req.file, type);
      res.json(result);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  // Upload multiple files
  app.post("/api/upload-multiple", upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const type = (req.body.type || 'image') as 'image' | 'document';
      
      for (const file of req.files) {
        if (!validateFileType(file.mimetype, type)) {
          return res.status(400).json({ 
            message: `Invalid file type for ${type}: ${file.originalname}` 
          });
        }

        if (!validateFileSize(file.size, type)) {
          const maxSizeMB = type === 'image' ? 10 : 25;
          return res.status(400).json({ 
            message: `File too large: ${file.originalname}. Maximum size is ${maxSizeMB}MB` 
          });
        }
      }

      const results = await uploadMultipleFiles(req.files, type);
      res.json(results);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

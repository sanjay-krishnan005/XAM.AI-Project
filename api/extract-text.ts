import { VercelRequest, VercelResponse } from '@vercel/node';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');
// @ts-ignore
const pdf = typeof pdfModule === 'function' ? pdfModule : (pdfModule.PDFParse || pdfModule.default);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_SIZE = 500 * 1024; // 500KB

// Create temp directory for uploads
const uploadsDir = '/tmp/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle multer middleware
  return new Promise((resolve) => {
    upload.single('file')(req as any, res as any, async (err: any) => {
      try {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
            return resolve(undefined);
          }
          res.status(400).json({ error: 'File upload error: ' + err.message });
          return resolve(undefined);
        } else if (err) {
          res.status(400).json({ error: 'Upload error: ' + err.message });
          return resolve(undefined);
        }

        const file = (req as any).file;
        if (!file) {
          res.status(400).json({ error: 'No file uploaded' });
          return resolve(undefined);
        }

        const filePath = file.path;
        let text = '';

        try {
          const dataBuffer = fs.readFileSync(filePath);

          if (file.mimetype === 'application/pdf') {
            try {
              const fontsPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');
              const cmapsPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/cmaps/');

              const instance = new pdf(new Uint8Array(dataBuffer), {
                standardFontDataUrl: fontsPath,
                cMapUrl: cmapsPath,
                cMapPacked: true,
                max: 100
              });

              const result = await instance.getText();
              text = typeof result === 'string' ? result : (result.text || '');
            } catch (pdfError: any) {
              console.error('PDF parsing error:', pdfError.message);
              res.status(400).json({ error: 'Failed to parse PDF: ' + pdfError.message });
              return resolve(undefined);
            }
          } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv') {
            text = dataBuffer.toString('utf-8');
          } else {
            res.status(400).json({ error: 'Unsupported file type. Only PDF and text files allowed.' });
            return resolve(undefined);
          }

          // Truncate if too large
          if (text.length > MAX_TEXT_SIZE) {
            text = text.substring(0, MAX_TEXT_SIZE) + '\n[... truncated due to size limit ...]';
          }

          res.status(200).json({ text });
        } catch (error: any) {
          console.error('File processing error:', error);
          res.status(500).json({ error: 'Failed to process file: ' + error.message });
        } finally {
          // Cleanup
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (e) {
            console.error('Cleanup error:', e);
          }
        }

        resolve(undefined);
      } catch (error: any) {
        console.error('Handler error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
        resolve(undefined);
      }
    });
  });
}

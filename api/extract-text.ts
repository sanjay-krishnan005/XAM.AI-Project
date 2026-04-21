import type { VercelRequest, VercelResponse } from '@vercel/node';
import multer from 'multer';

// CRITICAL: Disable Vercel's built-in body parser.
// Without this, Vercel consumes the request body before multer can parse it,
// causing the file upload to silently fail with a 500 error.
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (Vercel payload limit is 4.5MB)
const MAX_TEXT_SIZE = 500 * 1024; // 500KB

// Use memory storage — no filesystem writes needed, works in serverless
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// Promisify the multer middleware for use in a serverless handler
function runMulter(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    try {
      await runMulter(req, res);
    } catch (multerErr: any) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 4MB.' });
      }
      return res.status(400).json({ error: 'File upload error: ' + multerErr.message });
    }

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const buffer: Buffer = file.buffer;
    let text = '';

    if (file.mimetype === 'application/pdf') {
      try {
        const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
        const pdfParseFn = pdfParseModule.default || pdfParseModule;
        const data = await pdfParseFn(buffer, { max: 100 });
        text = data.text || '';
      } catch (pdfError: any) {
        console.error('PDF parsing error:', pdfError);
        return res.status(400).json({ error: 'Failed to parse PDF: ' + pdfError.message });
      }
    } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv') {
      text = buffer.toString('utf-8');
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Only PDF and text files allowed.',
      });
    }

    // Truncate if too large
    if (text.length > MAX_TEXT_SIZE) {
      text = text.substring(0, MAX_TEXT_SIZE) + '\n[... truncated due to size limit ...]';
    }

    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Server error: ' + (error.message || 'Unknown error'),
    });
  }
}

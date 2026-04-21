import { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const MAX_TEXT_SIZE = 500 * 1024; // 500KB

// Vercel free tier body limit is 4.5MB
// We handle raw body parsing manually since multer can be unreliable in serverless

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseMultipart(body: Buffer, boundary: string) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts: { name: string; filename?: string; mimetype?: string; data: Buffer }[] = [];

  let start = body.indexOf(boundaryBuffer) + boundaryBuffer.length;

  while (start < body.length) {
    const nextBoundary = body.indexOf(boundaryBuffer, start);
    if (nextBoundary === -1) break;

    const part = body.slice(start, nextBoundary);

    // Find the header/body separator (double CRLF)
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      start = nextBoundary + boundaryBuffer.length;
      continue;
    }

    const headerStr = part.slice(0, headerEnd).toString('utf-8');
    // Remove trailing \r\n from data
    let data = part.slice(headerEnd + 4);
    if (data.length >= 2 && data[data.length - 2] === 0x0d && data[data.length - 1] === 0x0a) {
      data = data.slice(0, data.length - 2);
    }

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    const mimeMatch = headerStr.match(/Content-Type:\s*(.+)/i);

    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch?.[1],
        mimetype: mimeMatch?.[1]?.trim(),
        data,
      });
    }

    start = nextBoundary + boundaryBuffer.length;
  }

  return parts;
}

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
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
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);

    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid content type. Expected multipart/form-data.' });
    }

    const rawBody = await getRawBody(req);
    const parts = parseMultipart(rawBody, boundaryMatch[1]);
    const filePart = parts.find((p) => p.name === 'file');

    if (!filePart || !filePart.data || filePart.data.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let text = '';
    const mimetype = filePart.mimetype || '';
    const filename = filePart.filename || '';

    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse');
        const result = await pdfParse(filePart.data);
        text = result.text || '';
      } catch (pdfError: any) {
        console.error('PDF parsing error:', pdfError.message);
        return res.status(400).json({ error: 'Failed to parse PDF: ' + pdfError.message });
      }
    } else if (
      mimetype === 'text/plain' ||
      mimetype === 'text/csv' ||
      filename.endsWith('.txt') ||
      filename.endsWith('.csv')
    ) {
      text = filePart.data.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Only PDF and text files allowed.' });
    }

    // Truncate if too large
    if (text.length > MAX_TEXT_SIZE) {
      text = text.substring(0, MAX_TEXT_SIZE) + '\n[... truncated due to size limit ...]';
    }

    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Failed to process file: ' + (error.message || 'Unknown error') });
  }
}

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Upload as UploadIcon, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { motion } from 'motion/react';
import { saveDocument } from '../lib/firebase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'text/csv'];

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addDocument, user } = useStore();

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is 10MB.`;
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
      return 'Only PDF and text files are supported.';
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validationError = validateFile(selectedFile);

      if (validationError) {
        setError(validationError);
        setFile(null);
      } else {
        setFile(selectedFile);
        setError(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/extract-text', formData, {
        timeout: 60000, // 60 second timeout
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      const docData = {
        name: file.name,
        content: response.data.text,
      };

      await saveDocument(user.id, docData);

      addDocument({
        id: Math.random().toString(36).substr(2, 9), // Local ID placeholder
        ...docData
      });

      setFile(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      
      // Provide specific error messages
      if (err.response?.status === 413) {
        setError('File is too large. Maximum size is 10MB.');
      } else if (err.response?.status === 504) {
        setError('Processing timed out. Please try with a smaller file.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Upload timed out. Please try with a smaller file or a faster connection.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        // Fallback: try client-side extraction for PDFs if server API fails (useful on limited hosting)
        if (file.type === 'application/pdf') {
          try {
            const text = await extractTextFromPDFInBrowser(file, 5);
            const docData = { name: file.name, content: text };
            await saveDocument(user.id, docData);
            addDocument({ id: Math.random().toString(36).substr(2, 9), ...docData });
            setFile(null);
            setError(null);
            return;
          } catch (browserErr) {
            console.error('Client-side PDF extraction failed:', browserErr);
            setError('Failed to process file. Please try again or use a different host.');
            return;
          }
        }

        setError('Failed to process file. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Client-side PDF text extraction using pdfjs-dist (fallback when server is unavailable)
  const extractTextFromPDFInBrowser = async (file: File, maxPages = 5): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
    // Worker not needed for small client-side extraction; use default
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    let fullText = '';

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str).join(' ');
      fullText += pageText + '\n\n';
      // Quick bail-out if text is already large
      if (fullText.length > 200 * 1024) {
        fullText = fullText.substring(0, 200 * 1024) + '\n\n[Truncated]';
        break;
      }
    }

    return fullText;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-white tracking-tight uppercase italic">Knowledge Ingestion</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Synchronize external data vectors into your neural knowledge base.</p>
      </div>

      <motion.div 
        layout
        className="bg-white/5 border-2 border-dashed border-white/10 rounded-[3rem] p-16 transition-all backdrop-blur-xl relative group hover:border-indigo-500/50 shadow-2xl"
      >
        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]"></div>
        <div className="flex flex-col items-center gap-8 relative z-10">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
            <UploadIcon className="w-10 h-10 text-indigo-400" />
          </div>

          <div className="text-center space-y-6">
            <label className="relative cursor-pointer bg-white text-neutral-950 font-black uppercase tracking-[0.3em] text-xs py-5 px-12 rounded-[2rem] transition-all inline-block hover:scale-105 active:scale-95 shadow-2xl shadow-white/10">
              <span>{file ? 'Replace Target' : 'Select Vector'}</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt" 
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">Universal PDF/TXT Extraction Active</p>
          </div>

          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                   <File className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                </div>
                <span className="font-bold text-slate-200 truncate pr-4">{file.name}</span>
              </div>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all disabled:opacity-50 active:scale-95"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Ingest'
                )}
              </button>
            </motion.div>
          )}

          {error && (
            <div className="flex items-center gap-3 text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
               <CheckCircle2 className="text-emerald-400 w-5 h-5" />
            </div>
            <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Neural Extraction</span>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-loose">
            Synthetically reconstruct document architectures for seamless integration into high-dimensional vector memory.
          </p>
        </div>
        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
               <BrainCircuit className="text-indigo-400 w-5 h-5" />
             </div>
            <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Matrix Linking</span>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-loose">
            Generate conceptual nexus points in your knowledge graph to activate adaptive cognitive assessments.
          </p>
        </div>
      </div>
    </div>
  );
}

const BrainCircuit = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 4.5V4a2 2 0 0 0-4 0v4.5"/><path d="m3 21 3-3"/><path d="M14 22V12"/><path d="M21 15V9"/><path d="M18 11V6"/><path d="M18 19v-2"/><path d="M20 7a2 2 0 0 0-3.3-1.54"/><path d="M5 21a2 2 0 0 0 4 0"/><path d="M4 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M14 4h-2"/><path d="M10 8h2"/><path d="M10 12h2"/><path d="M10 16h2"/><path d="M10 20h2"/></svg>
);

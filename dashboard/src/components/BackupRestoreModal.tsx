import React, { useState, useRef } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export function BackupRestoreModal({ onClose }: { onClose: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('backup', file);

    try {
      const res = await axios.post(`${API_URL}/backup/restore`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message || 'Database restored successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Failed to restore backup');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#1A1D30] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
      >
        <h2 id="backup-modal-title" className="text-xl font-bold text-white mb-2">Restore Backup</h2>
        <p className="text-sm text-slate-400 mb-6">
          Upload a <code className="text-blue-400">wa.db</code> or <code className="text-blue-400">.sqlite</code> backup file to restore your entire dashboard state.
        </p>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload backup file area"
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : file
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".db,.sqlite,.bak"
          />
          
          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                  <FileType className="text-green-400" size={24} />
                </div>
                <p className="text-white font-medium text-sm">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDragging ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                  <UploadCloud className={isDragging ? 'text-blue-400' : 'text-slate-400'} size={24} />
                </div>
                <p className="text-white font-medium text-sm">
                  Click or drag and drop to upload
                </p>
                <p className="text-xs text-slate-500 mt-1">SQLite Database (.db, .sqlite)</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Warning Note */}
        <div className="mt-4 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-yellow-500/90 leading-relaxed">
            Restoring a backup will overwrite your current database. The active server will automatically back up your current state before proceeding.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            aria-label="Cancel restore"
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={!file || isUploading}
            aria-busy={isUploading}
            className="px-6 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Confirm Restore
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

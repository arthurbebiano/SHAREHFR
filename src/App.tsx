/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileText,
  X,
  Share2,
  Trash2,
  Download,
  Phone,
  MonitorUp,
  Files
} from "lucide-react";
import { cn } from "./lib/utils";

type FileInfo = {
  filename: string;
  size: number;
  createdAt: number;
  downloadUrl: string;
};

export default function App() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch files", error);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("File is too large. Max size is 50MB.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        fetchFiles();
        // Extract the uploaded file details and select it immediately for sharing
        const downloadedFile = {
            filename: data.file.filename,
            size: data.file.size,
            downloadUrl: data.file.downloadUrl,
            createdAt: Date.now(),
        };
        setSelectedFile(downloadedFile);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error", error);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this file?")) return;

    try {
      const res = await fetch(`/api/files/${filename}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchFiles();
        if (selectedFile?.filename === filename) {
          setSelectedFile(null);
        }
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getAbsoluteUrl = (path: string) => {
    return window.location.origin + path;
  };

  const cleanFilename = (filename: string) => {
    const parts = filename.split('-');
    if (parts.length > 1) {
        parts.shift();
        return parts.join('-');
    }
    return filename;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                PDF Drop
              </h1>
              <p className="text-sm text-gray-500 font-medium tracking-wide border-gray-200">
                Quick local network sharing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            <MonitorUp className="w-4 h-4 text-blue-500" />
            <span>Upload here</span>
            <div className="w-1 h-1 rounded-full bg-gray-300 mx-1" />
            <Phone className="w-4 h-4 text-green-500" />
            <span>Open on phone</span>
          </div>
        </header>

        {/* Upload Area */}
        <section>
          <div
            className={cn(
              "relative group border-2 border-dashed rounded-3xl p-12 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden",
              dragActive
                ? "border-blue-500 bg-blue-50 scale-[1.02]"
                : "border-gray-300 bg-white hover:border-blue-400 hover:shadow-xl hover:shadow-blue-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf"
              onChange={handleFileChange}
            />
            {isUploading ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-lg font-medium text-blue-600">
                  Uploading Document...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Drop your PDF here
                </h3>
                <p className="text-gray-500 max-w-sm">
                  Drag & drop your file or click to browse. Max file size: 50MB.
                </p>
              </>
            )}
          </div>
        </section>

        {/* File List */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Files className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-700">
              Recent Uploads
            </h2>
          </div>
          
          {files.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-3xl bg-white/50">
              <p className="text-gray-400">No PDFs uploaded yet. Upload one above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.filename}
                    layoutId={file.filename}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedFile(file)}
                    className="group flex flex-col bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-50 text-red-500 rounded-xl shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 truncate" title={cleanFilename(file.filename)}>
                          {cleanFilename(file.filename)}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{formatSize(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover Actions */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => deleteFile(file.filename, e)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-blue-600 text-sm font-medium">
                      <span>Click to get QR Code</span>
                      <Share2 className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {/* Share Dialog */}
      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFile(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 truncate pr-4">
                  {cleanFilename(selectedFile.filename)}
                </h3>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 pb-10 flex flex-col items-center min-w-0">
                <div className="text-center mb-6">
                  <span className="inline-flex items-center justify-center w-12 h-12 bg-green-50 text-green-600 rounded-full mb-3">
                    <Phone className="w-5 h-5" />
                  </span>
                  <p className="text-sm text-gray-600">
                    Scan with your phone's camera to open this PDF instantly.
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <QRCodeSVG
                    value={getAbsoluteUrl(selectedFile.downloadUrl)}
                    size={200}
                    level="H"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                </div>
                
                <div className="mt-8 flex gap-3 w-full">
                  <a
                    href={selectedFile.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button
                    onClick={() => {
                        navigator.clipboard.writeText(getAbsoluteUrl(selectedFile.downloadUrl));
                        alert('Link copied to clipboard!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-200"
                  >
                    <Share2 className="w-4 h-4" />
                    Copy Link
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

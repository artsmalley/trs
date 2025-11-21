"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { upload } from "@vercel/blob/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type QualityTier } from "@/lib/classify-documents";
import { Label } from "@/components/ui/label";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  rawFile?: File;
  status: "queued" | "pending" | "processing" | "complete" | "error" | "approved";
  progress: number;
  metadata?: any;
  fileId?: string; // Gemini File API ID for approval
}

interface UrlQueueItem {
  id: string;
  url: string;
  status: "pending" | "processing" | "complete" | "error" | "duplicate";
  title?: string;
  error?: string;
  fileId?: string;
}

// Size categories for concurrency limits
const SIZE_SMALL = 10 * 1024 * 1024; // 10MB
const SIZE_MEDIUM = 30 * 1024 * 1024; // 30MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function UploadAgent() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [warningMessage, setWarningMessage] = useState("");
  const [editingMetadata, setEditingMetadata] = useState<{fileId: string; title: string; summary: string; authors: string; year: string; track: string} | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<Map<string, QualityTier>>(new Map()); // Track tier selection for each file
  const processingRef = useRef(false);
  const filesRef = useRef<UploadedFile[]>([]); // Track current files state for processQueue

  // URL ingestion state
  const [urlInput, setUrlInput] = useState("");
  const [urlQueue, setUrlQueue] = useState<UrlQueueItem[]>([]);

  // Sync filesRef with files state (so processQueue can access current state)
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Load pending files from Redis on mount (Option 1: Persistence)
  useEffect(() => {
    const loadPendingFiles = async () => {
      try {
        const response = await fetch('/api/corpus/list?status=pending_review');
        const data = await response.json();

        if (data.documents && data.documents.length > 0) {
          const pendingFiles: UploadedFile[] = data.documents.map((doc: any) => ({
            id: doc.fileId,
            name: doc.fileName,
            size: 0,
            status: 'complete' as const, // Always "complete" for pending_review files
            progress: 100,
            metadata: doc,
            fileId: doc.fileId,
          }));

          setFiles(pendingFiles);
          console.log(`✅ Loaded ${pendingFiles.length} pending files from previous sessions`);
        }
      } catch (error) {
        console.error('Failed to load pending files:', error);
      }
    };

    loadPendingFiles();
  }, []);

  // Get concurrency limit based on file sizes being processed
  const getConcurrencyLimit = (currentlyProcessing: UploadedFile[]): number => {
    const largeFiles = currentlyProcessing.filter(f => f.size > SIZE_MEDIUM);
    const mediumFiles = currentlyProcessing.filter(f => f.size > SIZE_SMALL && f.size <= SIZE_MEDIUM);

    if (largeFiles.length > 0) return 2; // Max 2 large files
    if (mediumFiles.length > 0) return 3; // Max 3 medium files
    return 5; // Max 5 small files
  };

  // Process queue with smart concurrency limits
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (true) {
      // Use filesRef to get current state (not stale closure!)
      const currentFiles = filesRef.current;
      const processing = currentFiles.filter(f => f.status === 'processing');
      const queued = currentFiles.filter(f => f.status === 'queued');

      if (queued.length === 0) break;

      const limit = getConcurrencyLimit(processing);
      const canProcess = limit - processing.length;

      if (canProcess <= 0) {
        // Wait a bit and check again
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // Start processing the next files
      const toProcess = queued.slice(0, canProcess);
      for (const queuedFile of toProcess) {
        if (queuedFile.rawFile) {
          processFile(queuedFile.rawFile, queuedFile.id);
        }
      }

      await new Promise(r => setTimeout(r, 500));
    }

    processingRef.current = false;
  }, []); // No dependencies - uses refs instead

  // Process individual file
  const processFile = async (file: File, fileId: string) => {
    // Update to processing
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: "processing" as const, progress: 10 } : f))
    );

    try {
      // PHASE 1: Upload to Blob storage (client-side, direct)
      console.log(`📤 Uploading to Blob: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob-token',
        multipart: file.size > 5 * 1024 * 1024, // Use multipart for files > 5MB
        onUploadProgress: ({ percentage }) => {
          // Upload phase is 10-50% of total progress
          const uploadPhase = 10 + (percentage / 100) * 40;
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, progress: uploadPhase } : f))
          );
        },
      });

      console.log(`✅ Blob uploaded: ${blob.url}`);

      // PHASE 2: Process with AI on server (50-100% progress)
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 50 } : f))
      );

      const response = await fetch("/api/process-blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobUrl: blob.url,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const data = await response.json();

      console.log(`✅ Processing complete: ${file.name}`);

      // Update to complete with fileId for approval
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "complete" as const,
                progress: 100,
                metadata: data.extractedMetadata,
                fileId: data.fileId,
                rawFile: undefined, // Clear raw file to save memory
              }
            : f
        )
      );
    } catch (error) {
      console.error(`❌ Upload failed for ${file.name}:`, error);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "error" as const, progress: 0 } : f))
      );
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Check for oversized files
    const oversized = acceptedFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      const names = oversized.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ');
      alert(`❌ Files too large (max 100MB):\n\n${names}\n\nPlease compress or split these files.`);
      acceptedFiles = acceptedFiles.filter(f => f.size <= MAX_FILE_SIZE);
      if (acceptedFiles.length === 0) return;
    }

    // Check for bulk large files (mizen boushi warning)
    const largeFiles = acceptedFiles.filter(f => f.size > SIZE_MEDIUM);
    const totalSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);

    if (largeFiles.length >= 3 || totalSize > 100 * 1024 * 1024) {
      const fileCount = acceptedFiles.length;
      const sizeMB = (totalSize / 1024 / 1024).toFixed(1);
      const estTime = Math.ceil((totalSize / 1024 / 1024) / 10); // ~10MB per minute estimate

      setWarningMessage(
        `You're uploading ${fileCount} file(s) (${sizeMB}MB total).\n\n` +
        `⏱️ Estimated time: ${estTime}-${estTime * 2} minutes\n` +
        `🔄 Large files will be queued (max 2 processed simultaneously)\n\n` +
        `Continue?`
      );
      setPendingFiles(acceptedFiles);
      setShowWarning(true);
      return;
    }

    // Small batch - process immediately
    addFilesToQueue(acceptedFiles);
  }, []);

  const addFilesToQueue = (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Date.now() + Math.random().toString(),
      name: file.name,
      size: file.size,
      rawFile: file,
      status: "queued" as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Start processing queue
    setTimeout(() => processQueue(), 100);
  };

  const handleWarningConfirm = () => {
    setShowWarning(false);
    addFilesToQueue(pendingFiles);
    setPendingFiles([]);
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
    setPendingFiles([]);
  };

  const handleApprove = async (fileId: string, localId: string) => {
    // Get selected tier (default to Tier 2 if not selected)
    const selectedTier = selectedTiers.get(fileId) || "Tier 2";
    const tierLabel = selectedTier === "Tier 1" ? "Authoritative" :
                      selectedTier === "Tier 2" ? "High Quality" :
                      selectedTier === "Tier 3" ? "Supporting" : "Background";

    // Optimistically remove file from UI immediately
    setFiles((prev) => prev.filter((f) => f.id !== localId));

    try {
      const response = await fetch("/api/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          action: "approve",
          updates: {
            qualityTier: selectedTier,
            tierLabel: tierLabel,
            autoClassified: false, // Manual classification during upload
            classifiedAt: new Date().toISOString()
          }
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Approval failed:", data.error);
        alert(`Failed to approve: ${data.error}\n\nThe file has been removed from the review queue. Please check the Browse tab to verify.`);
      } else {
        console.log(`✅ Document approved: ${fileId} as ${selectedTier}`);
        // Clean up tier selection
        setSelectedTiers(prev => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }
    } catch (error) {
      console.error("Error approving document:", error);
      alert("Failed to approve document. The file has been removed from the review queue. Please check the Browse tab to verify.");
    }
  };

  const handleReject = async (fileId: string, localId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?\n\nThis will permanently remove the file from Blob storage, File Search, and Redis.`)) {
      return;
    }

    // Optimistically remove file from UI immediately
    setFiles((prev) => prev.filter((f) => f.id !== localId));

    try {
      const response = await fetch("/api/corpus/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      if (response.ok) {
        console.log(`🗑️ File deleted: ${fileId}`);
      } else {
        const data = await response.json();
        console.error("Delete failed:", data.error);
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handleSaveMetadata = async () => {
    if (!editingMetadata) return;

    try {
      const response = await fetch("/api/corpus/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: editingMetadata.fileId,
          updates: {
            title: editingMetadata.title,
            summary: editingMetadata.summary,
            authors: editingMetadata.authors.split(',').map(a => a.trim()).filter(a => a),
            year: editingMetadata.year ? parseInt(editingMetadata.year) : null,
            track: editingMetadata.track,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local files state with new metadata
        setFiles((prev) =>
          prev.map((f) =>
            f.fileId === editingMetadata.fileId
              ? { ...f, metadata: { ...f.metadata, ...data.metadata } }
              : f
          )
        );

        // Close dialog
        setEditDialogOpen(false);
        setEditingMetadata(null);
        console.log(`✅ Metadata updated: ${editingMetadata.fileId}`);
      } else {
        console.error("Update failed:", data.error);
        alert(`Failed to update metadata: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating metadata:", error);
      alert("Failed to update metadata. Please try again.");
    }
  };

  // URL ingestion functions
  const addUrlToQueue = () => {
    if (!urlInput.trim()) return;

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      alert("Please enter a valid URL");
      return;
    }

    const newItem: UrlQueueItem = {
      id: `url-${Date.now()}`,
      url: urlInput.trim(),
      status: "pending",
    };

    setUrlQueue((prev) => [...prev, newItem]);
    setUrlInput("");
  };

  const processUrl = async (id: string) => {
    const item = urlQueue.find((u) => u.id === id);
    if (!item) return;

    // Update status to processing
    setUrlQueue((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "processing" as const } : u))
    );

    try {
      const response = await fetch("/api/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: item.url,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update to complete and add title
        setUrlQueue((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: "complete" as const, title: data.title, fileId: data.fileId }
              : u
          )
        );

        // Add to files list for review dashboard
        const newFile: UploadedFile = {
          id: data.fileId,
          name: data.title || "Web Page",
          size: 0,
          status: "complete",
          progress: 100,
          metadata: data.extractedMetadata,
          fileId: data.fileId,
        };

        setFiles((prev) => [...prev, newFile]);

        console.log(`✅ URL processed: ${item.url}`);
      } else if (data.duplicate) {
        // Handle duplicate
        setUrlQueue((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: "duplicate" as const,
                  error: `Already processed: ${data.existingDocument.title}`,
                }
              : u
          )
        );
      } else {
        throw new Error(data.error || "Processing failed");
      }
    } catch (error) {
      console.error("URL processing error:", error);
      setUrlQueue((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Processing failed",
              }
            : u
        )
      );
    }
  };

  const processAllUrls = async () => {
    const pending = urlQueue.filter((u) => u.status === "pending");
    for (const item of pending) {
      await processUrl(item.id);
      // Small delay between requests to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  const removeUrlFromQueue = (id: string) => {
    setUrlQueue((prev) => prev.filter((u) => u.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
  });

  // Count files by status
  const queuedCount = files.filter(f => f.status === 'queued').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const completedCount = files.filter(f => f.status === 'complete' && f.metadata).length;

  return (
    <div className="space-y-6">
      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Large Upload Detected</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {warningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWarningCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningConfirm}>
              Continue Upload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents & Images</CardTitle>
          <CardDescription>
            Upload documents (PDF, DOCX, TXT) or images (JPG, PNG, GIF). AI will automatically extract metadata and analyze content for your review.
            <br />
            <span className="text-xs text-muted-foreground mt-1">
              Max file size: 100MB • Large files are queued automatically
            </span>
            <br />
            <span className="text-xs text-amber-600 dark:text-amber-500 mt-2 block">
              ⚠️ Note: Files larger than ~50MB will upload successfully and be fully searchable, but automatic metadata extraction may fail due to processing constraints. You can manually enter metadata using the &quot;Edit Metadata&quot; button if this occurs.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop files here..." : "Drag & drop files here"}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground">Documents: PDF, DOCX, TXT • Images: JPG, PNG, GIF, WEBP</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* URL Ingestion Section */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌐 Ingest Web Pages
          </CardTitle>
          <CardDescription>
            Convert web pages to PDFs and add them to your corpus. Paste URLs from Toyota history, J-STAGE articles, or any web content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              placeholder="https://www.toyota.co.jp/jpn/company/history/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addUrlToQueue();
              }}
              className="flex-1"
            />
            <Button onClick={addUrlToQueue} disabled={!urlInput.trim()}>
              Add to Queue
            </Button>
          </div>

          {/* URL Queue */}
          {urlQueue.length > 0 && (
            <>
              <div className="space-y-2">
                {urlQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {/* Status Icon */}
                    {item.status === "complete" && (
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-xs">✓</span>
                      </div>
                    )}
                    {item.status === "processing" && (
                      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    {item.status === "error" && (
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-600 text-xs">!</span>
                      </div>
                    )}
                    {item.status === "duplicate" && (
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-amber-600 text-xs">⚠</span>
                      </div>
                    )}
                    {item.status === "pending" && (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}

                    {/* URL Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.title || new URL(item.url).pathname.split('/').pop() || item.url}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.url}
                      </div>
                      {item.error && (
                        <div className="text-xs text-red-600 mt-1">
                          {item.error}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <Badge
                      variant={
                        item.status === "complete"
                          ? "default"
                          : item.status === "error"
                          ? "destructive"
                          : item.status === "duplicate"
                          ? "outline"
                          : "secondary"
                      }
                      className={
                        item.status === "duplicate"
                          ? "border-amber-300 text-amber-700 bg-amber-50"
                          : ""
                      }
                    >
                      {item.status}
                    </Badge>

                    {/* Remove Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeUrlFromQueue(item.id)}
                      disabled={item.status === "processing"}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={processAllUrls}
                  disabled={urlQueue.every((u) => u.status !== "pending")}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Process All ({urlQueue.filter((u) => u.status === "pending").length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUrlQueue([])}
                >
                  Clear Queue
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Queue Status Summary */}
      {(queuedCount > 0 || processingCount > 0) && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {processingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">
                      Processing: {processingCount}
                    </span>
                  </div>
                )}
                {queuedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Queued: {queuedCount}
                    </span>
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                Max {getConcurrencyLimit(files.filter(f => f.status === 'processing'))} concurrent
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Queue */}
      {files.filter(f => f.status !== 'complete' && f.status !== 'approved').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Queue</CardTitle>
            <CardDescription>
              Active uploads and processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {files.filter(f => f.status !== 'complete' && f.status !== 'approved').map((file) => (
                  <div key={file.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{file.name}</span>
                          {file.size > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          file.status === "complete"
                            ? "default"
                            : file.status === "error"
                            ? "destructive"
                            : file.status === "queued"
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {file.status}
                      </Badge>
                    </div>
                    {(file.status === "processing" || file.status === "pending") && (
                      <Progress value={file.progress} className="h-1" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Review Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Review Dashboard</CardTitle>
          <CardDescription>Review and approve AI-extracted metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {files
                .filter((f) => f.status === "complete" && f.metadata)
                .map((file) => (
                  <Card key={file.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {/* Image Preview for images */}
                        {file.metadata.fileType === "image" && file.metadata.blobUrl && (
                          <div className="w-full max-w-md mx-auto">
                            <img
                              src={file.metadata.blobUrl}
                              alt={file.metadata.title}
                              className="w-full h-auto max-h-64 object-contain rounded border"
                            />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{file.metadata.fileType === "image" ? "🖼️" : "📄"}</span>
                            <h4 className="font-semibold">{file.metadata.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {file.metadata.summary}
                          </p>
                        </div>

                        {/* Show vision analysis for images */}
                        {file.metadata.fileType === "image" && file.metadata.visionAnalysis && (
                          <div className="space-y-2">
                            {file.metadata.visionAnalysis.extractedText && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Extracted Text:</p>
                                <p className="text-xs bg-muted p-2 rounded font-mono">
                                  {file.metadata.visionAnalysis.extractedText}
                                </p>
                              </div>
                            )}
                            {file.metadata.visionAnalysis.objects.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Objects:</p>
                                <div className="flex gap-1 flex-wrap">
                                  {file.metadata.visionAnalysis.objects.map((obj: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {obj}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-4 text-sm flex-wrap">
                          {file.metadata.year && (
                            <div>
                              <span className="text-muted-foreground">Year:</span>{" "}
                              <span className="font-medium">{file.metadata.year}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Track:</span>{" "}
                            <Badge variant="outline">{file.metadata.track}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Language:</span>{" "}
                            <Badge variant="secondary">{file.metadata.language}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span>{" "}
                            <Badge variant="secondary">{file.metadata.documentType}</Badge>
                          </div>
                        </div>
                        {/* Quality Tier Selection */}
                        <div className="flex gap-4 items-center p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <label className="text-sm font-medium mb-1 block">Quality Tier</label>
                            <Select
                              value={selectedTiers.get(file.fileId || '') || "Tier 2"}
                              onValueChange={(value) => {
                                if (file.fileId) {
                                  setSelectedTiers(prev => {
                                    const newMap = new Map(prev);
                                    newMap.set(file.fileId!, value as QualityTier);
                                    return newMap;
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Tier 1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="font-medium">Tier 1</span> - Authoritative
                                  </div>
                                </SelectItem>
                                <SelectItem value="Tier 2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="font-medium">Tier 2</span> - High Quality (Default)
                                  </div>
                                </SelectItem>
                                <SelectItem value="Tier 3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="font-medium">Tier 3</span> - Supporting
                                  </div>
                                </SelectItem>
                                <SelectItem value="Tier 4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                                    <span className="font-medium">Tier 4</span> - Background
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedTiers.get(file.fileId || '') === "Tier 1" && "Primary sources from ex-Toyota authors and top experts"}
                              {(selectedTiers.get(file.fileId || '') === "Tier 2" || !selectedTiers.get(file.fileId || '')) && "Academic papers, high-quality analyses, and detailed technical documents"}
                              {selectedTiers.get(file.fileId || '') === "Tier 3" && "Supporting materials, web articles, and general references"}
                              {selectedTiers.get(file.fileId || '') === "Tier 4" && "Background materials, timelines, and historical context"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Dialog open={editDialogOpen && editingMetadata?.fileId === file.fileId} onOpenChange={setEditDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingMetadata({
                                    fileId: file.fileId || '',
                                    title: file.metadata.title || '',
                                    summary: file.metadata.summary || '',
                                    authors: Array.isArray(file.metadata.authors) ? file.metadata.authors.join(', ') : '',
                                    year: file.metadata.year?.toString() || '',
                                    track: file.metadata.track || 'Unknown',
                                  });
                                  setEditDialogOpen(true);
                                }}
                              >
                                Edit Metadata
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Metadata</DialogTitle>
                                <DialogDescription>
                                  Review and correct the AI-extracted metadata
                                </DialogDescription>
                              </DialogHeader>
                              {editingMetadata && (
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Title</label>
                                    <Input
                                      value={editingMetadata.title}
                                      onChange={(e) => setEditingMetadata({ ...editingMetadata, title: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Authors (comma-separated)</label>
                                    <Input
                                      value={editingMetadata.authors}
                                      onChange={(e) => setEditingMetadata({ ...editingMetadata, authors: e.target.value })}
                                      placeholder="e.g., John Smith, Jane Doe"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Year</label>
                                    <Input
                                      type="number"
                                      value={editingMetadata.year}
                                      onChange={(e) => setEditingMetadata({ ...editingMetadata, year: e.target.value })}
                                      placeholder="e.g., 2024"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Track</label>
                                    <select
                                      className="w-full px-3 py-2 border border-input rounded-md"
                                      value={editingMetadata.track}
                                      onChange={(e) => setEditingMetadata({ ...editingMetadata, track: e.target.value })}
                                    >
                                      <option value="TPS">TPS</option>
                                      <option value="PE">PE</option>
                                      <option value="PD">PD</option>
                                      <option value="Cross-Cutting">Cross-Cutting</option>
                                      <option value="Unknown">Unknown</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Summary</label>
                                    <Textarea
                                      value={editingMetadata.summary}
                                      onChange={(e) => setEditingMetadata({ ...editingMetadata, summary: e.target.value })}
                                      rows={4}
                                    />
                                  </div>
                                </div>
                              )}
                              <Button onClick={handleSaveMetadata}>Save Changes</Button>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => file.fileId && handleReject(file.fileId, file.id, file.name)}
                            disabled={!file.fileId}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => file.fileId && handleApprove(file.fileId, file.id)}
                            disabled={!file.fileId}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              {files.filter((f) => f.status === "complete").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents to review yet. Upload files to get started.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

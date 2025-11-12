"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface UploadedFile {
  id: string;
  name: string;
  status: "pending" | "processing" | "complete" | "error";
  progress: number;
  metadata?: any;
}

export function UploadAgent() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Date.now() + Math.random().toString(),
      name: file.name,
      status: "pending",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Process each file
    for (const [index, file] of acceptedFiles.entries()) {
      const fileId = newFiles[index].id;

      // Update to processing
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "processing", progress: 30 } : f))
      );

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        // Update to complete
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "complete",
                  progress: 100,
                  metadata: data.extractedMetadata,
                }
              : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "error", progress: 0 } : f))
        );
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
  });

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload PDF, DOCX, or TXT files. AI will automatically extract metadata for your review.
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
              <p className="text-xs text-muted-foreground">Supports: PDF, DOCX, TXT</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Queue */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                      <Badge
                        variant={
                          file.status === "complete"
                            ? "default"
                            : file.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {file.status}
                      </Badge>
                    </div>
                    {file.status === "processing" && (
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
                        <div>
                          <h4 className="font-semibold">{file.metadata.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {file.metadata.summary}
                          </p>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Year:</span>{" "}
                            <span className="font-medium">{file.metadata.year}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Track:</span>{" "}
                            <Badge variant="outline">{file.metadata.track}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Language:</span>{" "}
                            <Badge variant="secondary">{file.metadata.language}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
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
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Title</label>
                                  <Input defaultValue={file.metadata.title} />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Summary</label>
                                  <Textarea defaultValue={file.metadata.summary} rows={3} />
                                </div>
                                {/* Add more fields as needed */}
                              </div>
                              <Button>Save Changes</Button>
                            </DialogContent>
                          </Dialog>
                          <Button size="sm">Approve</Button>
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

"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ImageFile {
  id: string;
  name: string;
  preview: string;
  status: "pending" | "processing" | "complete" | "error";
  progress: number;
  analysis?: any;
}

export function ImageUploadAgent() {
  const [images, setImages] = useState<ImageFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newImages: ImageFile[] = acceptedFiles.map((file) => ({
      id: Date.now() + Math.random().toString(),
      name: file.name,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));

    setImages((prev) => [...prev, ...newImages]);

    // Process each image
    for (const [index, file] of acceptedFiles.entries()) {
      const imageId = newImages[index].id;

      setImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, status: "processing", progress: 50 } : img))
      );

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/images", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, status: "complete", progress: 100, analysis: data }
              : img
          )
        );
      } catch (error) {
        setImages((prev) =>
          prev.map((img) => (img.id === imageId ? { ...img, status: "error", progress: 0 } : img))
        );
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Upload Agent</CardTitle>
          <CardDescription>
            Upload images for Gemini 2.5 Flash vision analysis. Extracted text will be stored in File Search.
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
                {isDragActive ? "Drop images here..." : "Drag & drop images here"}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground">
                Supports: PNG, JPG, JPEG, GIF, WEBP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Image Gallery & Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {images.map((image) => (
                  <Card key={image.id}>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Image Preview */}
                        <div>
                          <img
                            src={image.preview}
                            alt={image.name}
                            className="w-full h-auto rounded-lg border"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-medium truncate">{image.name}</span>
                            <Badge
                              variant={
                                image.status === "complete"
                                  ? "default"
                                  : image.status === "error"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {image.status}
                            </Badge>
                          </div>
                          {image.status === "processing" && (
                            <Progress value={image.progress} className="mt-2" />
                          )}
                        </div>

                        {/* Analysis Results */}
                        <div className="space-y-3">
                          {image.analysis && (
                            <>
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Vision Analysis</h4>
                                <p className="text-sm text-muted-foreground">
                                  {image.analysis.analysis}
                                </p>
                              </div>

                              {image.analysis.extractedText && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-semibold text-sm mb-1">Extracted Text (OCR)</h4>
                                    <p className="text-xs font-mono bg-muted p-2 rounded">
                                      {image.analysis.extractedText}
                                    </p>
                                  </div>
                                </>
                              )}

                              <Separator />
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                  {image.analysis.tags?.map((tag: string, i: number) => (
                                    <Badge key={i} variant="secondary">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <Separator />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  Edit Metadata
                                </Button>
                                <Button size="sm">Store in Corpus</Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

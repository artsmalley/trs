"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ImageUploadAgent() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-3xl">
              🖼️
            </div>
          </div>
          <CardTitle className="text-2xl">Images Agent</CardTitle>
          <CardDescription className="text-base">
            Vision analysis and OCR for diagrams, charts, and technical drawings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm px-4 py-1">
              Coming Soon
            </Badge>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The Images Agent will provide advanced vision analysis capabilities for technical diagrams,
              workflow charts, and engineering drawings commonly found in Toyota research materials.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-foreground">Planned Features:</h4>
              <ul className="space-y-2 list-disc list-inside">
                <li>Gemini Vision API integration for diagram analysis</li>
                <li>OCR text extraction (Japanese and English)</li>
                <li>Automatic metadata generation and tagging</li>
                <li>Text-based corpus integration for RAG queries</li>
                <li>Review and approval workflow</li>
              </ul>
            </div>

            <p className="text-xs bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-3">
              <span className="font-semibold">Note:</span> Implementation pending Gemini 3.0 release
              and enhanced image handling capabilities in File Search. Current focus is on text-based
              document processing (PDF, DOCX, TXT).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

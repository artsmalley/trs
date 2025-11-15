"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, Copy, Download } from "lucide-react";
import { useDropzone } from "react-dropzone";

export function AnalyzeAgent() {
  const [article, setArticle] = useState("");
  const [feedback, setFeedback] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [sourcesReferenced, setSourcesReferenced] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setArticle(text);
      setAnalyzed(false);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    multiple: false,
  });

  const analyzeArticle = async () => {
    if (!article.trim()) {
      setError("Please enter or drop an article to analyze");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze article");
      }

      const data = await response.json();
      setFeedback(data.feedback || "");
      setWordCount(data.wordCount || 0);
      setSourcesReferenced(data.sourcesReferenced || []);
      setAnalyzed(true);

      // Debug logging
      console.log('Analysis response:', {
        feedbackLength: data.feedback?.length || 0,
        wordCount: data.wordCount,
        sourcesCount: data.sourcesReferenced?.length || 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyFeedback = () => {
    navigator.clipboard.writeText(feedback);
  };

  const downloadFeedback = () => {
    const blob = new Blob([feedback], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `article-analysis-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setArticle("");
    setFeedback("");
    setWordCount(0);
    setSourcesReferenced([]);
    setAnalyzed(false);
    setError("");
  };

  return (
    <div className="space-y-6">
      {/* Article Input */}
      <Card>
        <CardHeader>
          <CardTitle>Analyze & Cite Agent</CardTitle>
          <CardDescription>
            Upload or paste your article for corpus-based analysis and citation suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag/Drop Zone */}
          {!analyzed && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-sm text-muted-foreground">Drop your article here...</p>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1">
                    Drag and drop your article (.txt or .md)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse files
                  </p>
                </>
              )}
            </div>
          )}

          {/* Or Paste Text */}
          {!analyzed && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-muted" />
                <span className="text-xs text-muted-foreground">OR PASTE TEXT</span>
                <div className="flex-1 border-t border-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="article">Article Text</Label>
                <Textarea
                  id="article"
                  placeholder="Paste your article here for analysis..."
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                {article && (
                  <p className="text-xs text-muted-foreground">
                    {article.split(/\s+/).length.toLocaleString()} words
                  </p>
                )}
              </div>
            </>
          )}

          {/* Article Preview (when analyzed) */}
          {analyzed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Original Article</Label>
                <Badge variant="secondary">{wordCount.toLocaleString()} words</Badge>
              </div>
              <div className="bg-slate-50 border rounded-md p-4 max-h-[200px] overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                  {article}
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          {!analyzed ? (
            <Button
              onClick={analyzeArticle}
              disabled={loading || !article.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Article...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Analyze Against Corpus
                </>
              )}
            </Button>
          ) : (
            <Button onClick={reset} variant="outline" className="w-full">
              Analyze Another Article
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Analysis Feedback */}
      {analyzed && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analysis Feedback</CardTitle>
                <CardDescription>
                  Corpus-based review with fact-checking, examples, and citation suggestions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyFeedback}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadFeedback}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feedback Content */}
            {feedback ? (
              <div className="bg-slate-50 border rounded-md p-6 prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap">{feedback}</div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
                <p className="text-sm text-yellow-800">
                  <strong>No feedback generated.</strong><br/>
                  The analysis completed but didn't return any feedback. This might indicate an issue with the AI response.
                  Please try again or check the browser console for details.
                </p>
              </div>
            )}

            {/* Sources Referenced */}
            {sourcesReferenced.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Corpus Sources Referenced in Analysis:</Label>
                <div className="flex flex-wrap gap-2">
                  {sourcesReferenced.map((source, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2 mt-4">
              <h4 className="font-medium text-sm text-blue-900">💡 Next Steps:</h4>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Review the categorized feedback above</li>
                <li>Implement suggested improvements and citations</li>
                <li>Use <strong>Editorial</strong> agent for final polish</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions (when no article yet) */}
      {!article && !analyzed && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">How the Analyze & Cite Agent Works:</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>1. Fact-Checking</strong> - Verifies claims against your corpus</p>
                <p><strong>2. Better Examples</strong> - Suggests stronger evidence from corpus documents</p>
                <p><strong>3. Citation Suggestions</strong> - Identifies where citations would strengthen your article</p>
                <p><strong>4. Unsupported Claims</strong> - Flags statements lacking corpus evidence</p>
                <p><strong>5. Coverage Gaps</strong> - Recommends additional perspectives from corpus</p>
              </div>
              <p className="text-xs text-muted-foreground italic pt-2">
                This agent reviews articles you've edited offline (after using the Draft Agent) to validate them against your corpus and strengthen your arguments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

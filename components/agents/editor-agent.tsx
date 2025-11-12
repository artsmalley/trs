"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Suggestion {
  type: "terminology" | "citation" | "clarity" | "structure" | "style";
  line?: number;
  suggestion: string;
  original?: string;
  suggested?: string;
}

export function EditorAgent() {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const analyzeText = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    if (suggestion.original && suggestion.suggested) {
      const original = suggestion.original;
      const suggested = suggestion.suggested;
      setText((prev) => prev.replace(original, suggested));
    }
  };

  const applyAll = () => {
    let updatedText = text;
    suggestions.forEach((suggestion) => {
      if (suggestion.original && suggestion.suggested) {
        const original = suggestion.original;
        const suggested = suggestion.suggested;
        updatedText = updatedText.replace(original, suggested);
      }
    });
    setText(updatedText);
    setSuggestions([]);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "terminology":
        return "default";
      case "citation":
        return "destructive";
      case "clarity":
        return "secondary";
      case "structure":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "terminology":
        return "📖";
      case "citation":
        return "📚";
      case "clarity":
        return "💡";
      case "structure":
        return "🏗️";
      case "style":
        return "✨";
      default:
        return "📝";
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left: Text Editor */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Editor Agent</CardTitle>
          <CardDescription>
            Refine your writing and check Toyota terminology consistency
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          <Textarea
            placeholder="Paste your text here for review..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 min-h-[400px] font-mono text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={analyzeText} disabled={loading || !text.trim()} className="flex-1">
              {loading ? "Analyzing..." : "Analyze Text"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setText("");
                setSuggestions([]);
              }}
              disabled={!text}
            >
              Clear
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Word count: {text.split(/\s+/).filter((w) => w.length > 0).length}
          </div>
        </CardContent>
      </Card>

      {/* Right: Suggestions Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suggestions</CardTitle>
              <CardDescription>
                {suggestions.length > 0
                  ? `${suggestions.length} improvement${suggestions.length !== 1 ? "s" : ""} found`
                  : "Analyze text to see suggestions"}
              </CardDescription>
            </div>
            {suggestions.length > 0 && (
              <Button size="sm" variant="outline" onClick={applyAll}>
                Apply All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No suggestions yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter text and click "Analyze Text"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                          <Badge variant={getTypeColor(suggestion.type)} className="text-xs">
                            {suggestion.type}
                          </Badge>
                        </div>
                        {suggestion.line && (
                          <span className="text-xs text-muted-foreground">Line {suggestion.line}</span>
                        )}
                      </div>

                      {/* Suggestion */}
                      <p className="text-sm">{suggestion.suggestion}</p>

                      {/* Original vs Suggested */}
                      {suggestion.original && suggestion.suggested && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="bg-destructive/10 p-2 rounded border-l-2 border-destructive">
                              <p className="text-xs font-semibold text-destructive mb-1">Original:</p>
                              <p className="text-xs font-mono">{suggestion.original}</p>
                            </div>
                            <div className="bg-primary/10 p-2 rounded border-l-2 border-primary">
                              <p className="text-xs font-semibold text-primary mb-1">Suggested:</p>
                              <p className="text-xs font-mono">{suggestion.suggested}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Actions */}
                      {suggestion.original && suggestion.suggested && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            Apply
                          </Button>
                          <Button size="sm" variant="ghost">
                            Ignore
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

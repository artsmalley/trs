"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Message } from "@/lib/types";

interface Citation {
  documentId: string;
  title: string;
  excerpt: string;
  source?: string;
}

export function WebSearchAgent() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("standard");
  const [length, setLength] = useState("medium");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          mode,
          length,
          customInstructions,
          history,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();

      // Update conversation history
      setHistory([
        ...history,
        { role: "user", content: query },
        { role: "model", content: data.answer },
      ]);

      setAnswer(data.answer);
      setCitations(data.citations || []);
      setQuery(""); // Clear input for next query
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Web search error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearConversation = () => {
    setHistory([]);
    setAnswer("");
    setCitations([]);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Search className="h-5 w-5" />
            Search Web
          </CardTitle>
          <CardDescription className="text-blue-700">
            Search the internet using Google Search for general knowledge and publicly available information
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Query Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <div>
            <Input
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-base"
            />
          </div>

          {/* Mode and Length Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mode</label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="find-examples">Find Examples</SelectItem>
                  <SelectItem value="find-people">Find People</SelectItem>
                  <SelectItem value="compare">Compare Approaches</SelectItem>
                  <SelectItem value="timeline">Timeline/History</SelectItem>
                  <SelectItem value="technical">Technical Deep-Dive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Length</label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief (2-3 sentences)</SelectItem>
                  <SelectItem value="medium">Medium (2-3 paragraphs)</SelectItem>
                  <SelectItem value="detailed">Detailed (4-6 paragraphs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Instructions (Collapsible) */}
          <Collapsible open={isCustomOpen} onOpenChange={setIsCustomOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Custom Instructions (Optional)
                <ChevronDown className={`h-4 w-4 transition-transform ${isCustomOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Textarea
                placeholder="Add specific context or requirements for your search..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-[100px]"
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Web
                </>
              )}
            </Button>
            {history.length > 0 && (
              <Button onClick={clearConversation} variant="outline">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {answer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Results</CardTitle>
            <CardDescription>From Google Search</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Answer */}
            <ScrollArea className="h-[400px] rounded border p-4 bg-slate-50">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {answer}
              </div>
            </ScrollArea>

            {/* Citations */}
            {citations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-900">
                    {citations.length}
                  </Badge>
                  Sources
                </h3>
                <div className="space-y-2">
                  {citations.map((citation, idx) => (
                    <Card key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 bg-blue-100 text-blue-900 border-blue-300">
                            🌐 Web
                          </Badge>
                          <div className="flex-1 space-y-1">
                            <p className="font-medium text-sm text-blue-900">{citation.title}</p>
                            {citation.excerpt && (
                              <p className="text-xs text-blue-700 break-all">
                                {citation.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conversation History */}
      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversation History</CardTitle>
            <CardDescription>{Math.floor(history.length / 2)} exchanges</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {history.map((msg, idx) => (
                  <div key={idx} className={msg.role === "user" ? "text-right" : "text-left"}>
                    <Badge variant={msg.role === "user" ? "default" : "secondary"} className="mb-2">
                      {msg.role === "user" ? "You" : "AI"}
                    </Badge>
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

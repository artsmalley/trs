"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Citation {
  text: string;
  source: string;
  page?: number;
  relevanceScore: number;
  context: string;
}

export function AnalyzeAgent() {
  const [claim, setClaim] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [citationType, setCitationType] = useState<"quote" | "example" | "data">("quote");

  const findCitations = async () => {
    if (!claim.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim,
          count: 5,
          citationType,
        }),
      });

      const data = await response.json();
      setCitations(data.citations || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportCitations = () => {
    const markdown = `# Citations for: ${claim}\n\n` +
      citations
        .map((citation, i) => {
          return `## Citation ${i + 1}\n\n` +
            `**Source:** ${citation.source}${citation.page ? ` (p.${citation.page})` : ""}\n\n` +
            `**Relevance:** ${(citation.relevanceScore * 100).toFixed(0)}%\n\n` +
            `> ${citation.text}\n\n` +
            `**Context:** ${citation.context}\n\n`;
        })
        .join("---\n\n");

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citations-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyze Agent</CardTitle>
          <CardDescription>
            Find specific citations and evidence to support your claims
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Claim or Statement</label>
            <Input
              placeholder="e.g., Toyota designs critical equipment in-house"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && findCitations()}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Citation Type</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={citationType === "quote" ? "default" : "outline"}
                onClick={() => setCitationType("quote")}
              >
                Quotes
              </Button>
              <Button
                size="sm"
                variant={citationType === "example" ? "default" : "outline"}
                onClick={() => setCitationType("example")}
              >
                Examples
              </Button>
              <Button
                size="sm"
                variant={citationType === "data" ? "default" : "outline"}
                onClick={() => setCitationType("data")}
              >
                Data/Statistics
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={findCitations} disabled={loading || !claim.trim()} className="flex-1">
              {loading ? "Searching..." : "Find Citations"}
            </Button>
            {citations.length > 0 && (
              <Button variant="outline" onClick={exportCitations}>
                Export
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Citation Results */}
      {citations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Found Citations ({citations.length})</CardTitle>
            <CardDescription>Ranked by relevance to your claim</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {citations.map((citation, i) => (
                  <Card key={i} className="border-2">
                    <CardContent className="pt-6 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge variant="secondary" className="mb-2">
                            Citation {i + 1}
                          </Badge>
                          <p className="text-sm font-semibold">{citation.source}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Relevance:</span>
                            <Badge
                              variant={
                                citation.relevanceScore > 0.8
                                  ? "default"
                                  : citation.relevanceScore > 0.6
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {(citation.relevanceScore * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          {citation.page && (
                            <p className="text-xs text-muted-foreground mt-1">Page {citation.page}</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Quote */}
                      <div className="bg-muted p-4 rounded-lg border-l-4 border-primary">
                        <p className="text-sm italic">{citation.text}</p>
                      </div>

                      {/* Context */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Context:</p>
                        <p className="text-xs text-muted-foreground">{citation.context}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline">
                          Copy Citation
                        </Button>
                        <Button size="sm" variant="ghost">
                          View Full Document
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {citations.length === 0 && claim && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Enter a claim and click "Find Citations" to search your corpus
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

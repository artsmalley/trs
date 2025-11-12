"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ResearchAgent() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerms, setSearchTerms] = useState<any>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await response.json();
      setSearchTerms(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Research Agent</CardTitle>
          <CardDescription>
            Generate Japanese and English search terms for J-STAGE, patents, and technical literature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter research topic (e.g., kosaku-zumen, production engineering)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button onClick={handleGenerate} disabled={loading || !topic.trim()}>
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchTerms && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Suggested Search Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Japanese Terms (日本語)</h3>
                <div className="flex flex-wrap gap-2">
                  {searchTerms.searchTerms?.japanese?.map((term: string, i: number) => (
                    <Badge key={i} variant="secondary">{term}</Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">English Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {searchTerms.searchTerms?.english?.map((term: string, i: number) => (
                    <Badge key={i} variant="outline">{term}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Research Priorities</CardTitle>
              <CardDescription>Suggested research order and tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {searchTerms.priorities?.map((priority: any) => (
                    <Card key={priority.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{priority.topic}</h4>
                            <div className="flex gap-2 flex-wrap">
                              {priority.searchTerms.map((term: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {term}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Badge variant={priority.priority === "high" ? "default" : "outline"}>
                            {priority.priority}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {searchTerms.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {searchTerms.recommendations}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

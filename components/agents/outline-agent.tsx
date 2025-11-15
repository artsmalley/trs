"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { OutlineNode } from "@/lib/types";

export function OutlineAgent() {
  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const generateOutline = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, action: "generate" }),
      });

      const data = await response.json();
      setOutline(data.outline || []);

      setChatMessages([
        {
          role: "model",
          content: `I've generated an outline for "${topic}". Review the structure on the left. Ask me to refine sections or draft content.`,
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setLoading(true);

    try {
      // Simulate chat response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "I can help you refine that section. Which part would you like to expand?",
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportMarkdown = () => {
    let markdown = `# ${topic}\n\n`;
    outline.forEach((node) => {
      markdown += `${"#".repeat(node.level + 1)} ${node.title}\n`;
      if (node.content) {
        markdown += `${node.content}\n\n`;
      }
    });

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.toLowerCase().replace(/\s+/g, "-")}-outline.md`;
    a.click();
  };

  const getCoverageColor = (coverage?: string) => {
    switch (coverage) {
      case "strong":
        return "default";
      case "moderate":
        return "secondary";
      case "weak":
        return "outline";
      default:
        return "destructive";
    }
  };

  return (
    <div className="space-y-6">
      {/* Topic Input */}
      <Card>
        <CardHeader>
          <CardTitle>Outline Agent</CardTitle>
          <CardDescription>
            Generate article outlines based on corpus coverage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter article topic (e.g., PE#1 Machine Tool Design)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateOutline()}
            />
            <Button onClick={generateOutline} disabled={loading || !topic.trim()}>
              {outline.length > 0 ? "Regenerate" : "Generate"}
            </Button>
            {outline.length > 0 && (
              <Button variant="outline" onClick={exportMarkdown}>
                Export MD
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Split View: Outline + Chat */}
      {outline.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Outline Tree */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outline Structure</CardTitle>
              <CardDescription>Coverage assessment included</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {outline.map((node) => (
                    <div
                      key={node.id}
                      className="p-3 border rounded hover:bg-accent cursor-pointer"
                      style={{ marginLeft: `${(node.level - 1) * 1}rem` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{node.title}</p>
                          {node.content && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {node.content}
                            </p>
                          )}
                        </div>
                        {node.coverage && (
                          <Badge variant={getCoverageColor(node.coverage)} className="text-xs">
                            {node.coverage}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Chat */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Refine & Draft</CardTitle>
              <CardDescription>
                Chat with AI to refine sections or draft content
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4 mb-4">
                <div className="space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              <div className="flex gap-2">
                <Input
                  placeholder="Ask to refine or draft a section..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChat()}
                  disabled={loading}
                />
                <Button onClick={handleChat} disabled={loading || !chatInput.trim()}>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

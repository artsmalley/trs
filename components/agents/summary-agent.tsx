"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Message } from "@/lib/types";

export function SummaryAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [referencedDocs, setReferencedDocs] = useState<string[]>([]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input,
          history: messages,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
        citations: data.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setReferencedDocs(data.referencedDocuments || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadConversation = () => {
    const markdown = messages
      .map((msg) => {
        const header = msg.role === "user" ? "**You:**" : "**Agent:**";
        let content = `${header} ${msg.content}\n\n`;
        if (msg.citations && msg.citations.length > 0) {
          content += "**Sources:**\n";
          msg.citations.forEach((citation) => {
            content += `- ${citation.title} (p.${citation.pageNumber})\n`;
          });
          content += "\n";
        }
        return content;
      })
      .join("\n");

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trs-conversation-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
  };

  return (
    <div className="grid md:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
      {/* Sidebar - Documents */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription>Referenced in conversation</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {referencedDocs.length > 0 ? (
              <div className="space-y-2">
                {referencedDocs.map((docId, i) => (
                  <div key={i} className="p-2 border rounded text-xs">
                    <p className="font-medium truncate">Doc {docId}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">
                No documents referenced yet
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="md:col-span-3 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Summary Agent</CardTitle>
              <CardDescription>Query your corpus with RAG-powered answers</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadConversation}
              disabled={messages.length === 0}
            >
              Download Conversation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground">
                    Ask questions about your Toyota research corpus
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, i) => (
                  <div key={i}>
                    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-2 ml-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Sources:</p>
                        {message.citations.map((citation, j) => (
                          <Card key={j} className="p-3">
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium">{citation.title}</p>
                                {citation.pageNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    p.{citation.pageNumber}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground italic">
                                "{citation.excerpt}"
                              </p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <Separator className="my-4" />

          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your corpus..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

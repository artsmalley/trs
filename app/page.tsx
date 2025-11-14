"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ResearchAgent } from "@/components/agents/research-agent";
import { UploadAgent } from "@/components/agents/upload-agent";
import { BrowseQueryAgent } from "@/components/agents/browse-query-agent";
import { OutlineAgent } from "@/components/agents/outline-agent";
import { AnalyzeAgent } from "@/components/agents/analyze-agent";
import { EditorAgent } from "@/components/agents/editor-agent";

export default function Home() {
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending review count for badge (Option 4)
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/corpus/list?status=pending_review');
        const data = await response.json();
        setPendingCount(data.documents?.length || 0);
      } catch (error) {
        console.error('Failed to fetch pending count:', error);
      }
    };

    fetchPendingCount();

    // Refresh count every 10 seconds
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-primary to-blue-600 text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center font-bold text-lg">
              T
            </div>
            <div>
              <h1 className="text-2xl font-bold">Toyota Research System</h1>
              <p className="text-xs text-primary-foreground/80">Multi-Agent AI Research Platform</p>
            </div>
          </div>
          <div className="text-sm bg-white/20 backdrop-blur px-3 py-1 rounded-full font-medium">
            V2.0
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="flex-1 container mx-auto px-4 py-6 bg-slate-50">
        <Tabs defaultValue="research" className="h-full">
          <TabsList className="grid w-full grid-cols-6 mb-6 bg-white shadow-sm p-1">
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="upload" className="relative">
              Upload
              {pendingCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 min-w-5 px-1.5 text-xs"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="outline">Outline</TabsTrigger>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="research" className="space-y-4">
            <ResearchAgent />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <UploadAgent />
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <BrowseQueryAgent />
          </TabsContent>

          <TabsContent value="outline" className="space-y-4">
            <OutlineAgent />
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4">
            <AnalyzeAgent />
          </TabsContent>

          <TabsContent value="editor" className="space-y-4">
            <EditorAgent />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

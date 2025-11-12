import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResearchAgent } from "@/components/agents/research-agent";
import { UploadAgent } from "@/components/agents/upload-agent";
import { ImageUploadAgent } from "@/components/agents/image-upload-agent";
import { SummaryAgent } from "@/components/agents/summary-agent";
import { OutlineAgent } from "@/components/agents/outline-agent";
import { AnalyzeAgent } from "@/components/agents/analyze-agent";
import { EditorAgent } from "@/components/agents/editor-agent";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Toyota Research System</h1>
          <div className="text-sm text-muted-foreground">V2.0</div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs defaultValue="research" className="h-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
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

          <TabsContent value="images" className="space-y-4">
            <ImageUploadAgent />
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <SummaryAgent />
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

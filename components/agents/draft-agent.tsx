"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Copy, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ArticleSetup {
  topic: string;
  articleType: string;
  length: number;
  tone: string;
  citationStyle: string;
  targetAudience: string;
  keyPoints: string;
}

type Step = "setup" | "outline" | "draft";

export function DraftAgent() {
  const [currentStep, setCurrentStep] = useState<Step>("setup");
  const [setup, setSetup] = useState<ArticleSetup>({
    topic: "",
    articleType: "research",
    length: 1200,
    tone: "academic",
    citationStyle: "inline",
    targetAudience: "",
    keyPoints: "",
  });
  const [outline, setOutline] = useState("");
  const [draft, setDraft] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [sourcesUsed, setSourcesUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditingSetup, setIsEditingSetup] = useState(false);
  const [isEditingOutline, setIsEditingOutline] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const generateOutline = async () => {
    if (!setup.topic.trim()) {
      setError("Please enter a topic or research question");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-outline",
          setup,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate outline");
      }

      const data = await response.json();
      setOutline(data.outline);
      setCurrentStep("outline");
      setIsEditingSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const generateDraft = async () => {
    if (!outline.trim()) {
      setError("Outline is empty");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-draft",
          setup,
          outline,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate draft");
      }

      const data = await response.json();
      setDraft(data.draft);
      setWordCount(data.wordCount || 0);
      setSourcesUsed(data.sourcesUsed || []);
      setCurrentStep("draft");
      setIsEditingOutline(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const skipToDirectDraft = async () => {
    if (!setup.topic.trim()) {
      setError("Please enter a topic or research question");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Generate a basic outline first
      const outlineResponse = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-outline",
          setup,
        }),
      });

      if (!outlineResponse.ok) {
        const errorData = await outlineResponse.json();
        throw new Error(errorData.error || "Failed to generate outline");
      }

      const outlineData = await outlineResponse.json();
      setOutline(outlineData.outline);

      // Immediately generate draft
      const draftResponse = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-draft",
          setup,
          outline: outlineData.outline,
        }),
      });

      if (!draftResponse.ok) {
        const errorData = await draftResponse.json();
        throw new Error(errorData.error || "Failed to generate draft");
      }

      const draftData = await draftResponse.json();
      setDraft(draftData.draft);
      setWordCount(draftData.wordCount || 0);
      setSourcesUsed(draftData.sourcesUsed || []);
      setCurrentStep("draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([draft], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${setup.topic.toLowerCase().replace(/\s+/g, "-").slice(0, 50)}-draft.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backToSetup = () => {
    setIsEditingSetup(true);
    setCurrentStep("setup");
  };

  const backToOutline = () => {
    setIsEditingOutline(true);
    setCurrentStep("outline");
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Article Setup */}
      {currentStep === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle>① Article Setup</CardTitle>
            <CardDescription>
              Configure your article parameters and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topic/Question */}
            <div className="space-y-2">
              <Label htmlFor="topic">
                Topic / Research Question <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="topic"
                placeholder="Example: The role of research and development and technology has long been underappreciated as part of the Toyota system strengths."
                value={setup.topic}
                onChange={(e) => setSetup({ ...setup, topic: e.target.value })}
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {setup.topic.length}/500 characters
              </p>
            </div>

            {/* Core Settings Row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Article Type */}
              <div className="space-y-2">
                <Label htmlFor="articleType">
                  Article Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={setup.articleType}
                  onValueChange={(value) => setSetup({ ...setup, articleType: value })}
                >
                  <SelectTrigger id="articleType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="research">Research Article</SelectItem>
                    <SelectItem value="opinion">Opinion/Argument</SelectItem>
                    <SelectItem value="technical">Technical Deep-Dive</SelectItem>
                    <SelectItem value="historical">Historical Analysis</SelectItem>
                    <SelectItem value="case-study">Case Study</SelectItem>
                    <SelectItem value="executive">Executive Brief</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Length */}
              <div className="space-y-2">
                <Label htmlFor="length">
                  Length <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={setup.length.toString()}
                  onValueChange={(value) => setSetup({ ...setup, length: parseInt(value) })}
                >
                  <SelectTrigger id="length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500 words (short)</SelectItem>
                    <SelectItem value="800">800 words (medium)</SelectItem>
                    <SelectItem value="1200">1200 words (standard)</SelectItem>
                    <SelectItem value="1500">1500 words (long)</SelectItem>
                    <SelectItem value="2000">2000 words (comprehensive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label htmlFor="tone">
                  Tone <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={setup.tone}
                  onValueChange={(value) => setSetup({ ...setup, tone: value })}
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="journalistic">Journalistic</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="executive">Executive Brief</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Options (Collapsible) */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {isAdvancedOpen ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Hide Advanced Options
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Show Advanced Options
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Citation Style */}
                <div className="space-y-2">
                  <Label htmlFor="citationStyle">Citation Style</Label>
                  <Select
                    value={setup.citationStyle}
                    onValueChange={(value) => setSetup({ ...setup, citationStyle: value })}
                  >
                    <SelectTrigger id="citationStyle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline">Inline (Author, Year)</SelectItem>
                      <SelectItem value="footnotes">Footnotes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience (optional)</Label>
                  <Input
                    id="targetAudience"
                    placeholder="Example: Academic researchers, Toyota practitioners"
                    value={setup.targetAudience}
                    onChange={(e) => setSetup({ ...setup, targetAudience: e.target.value })}
                  />
                </div>

                {/* Key Points */}
                <div className="space-y-2">
                  <Label htmlFor="keyPoints">Key Points to Include (optional)</Label>
                  <Textarea
                    id="keyPoints"
                    placeholder="Example:&#10;- Focus on 1990s-2000s period&#10;- Include PE examples&#10;- Highlight set-based concurrent engineering"
                    value={setup.keyPoints}
                    onChange={(e) => setSetup({ ...setup, keyPoints: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={generateOutline}
                disabled={loading || !setup.topic.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Outline...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Outline
                  </>
                )}
              </Button>
              <Button
                onClick={skipToDirectDraft}
                disabled={loading || !setup.topic.trim()}
                variant="outline"
              >
                Skip to Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Summary (when not on setup step) */}
      {currentStep !== "setup" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">① Article Setup</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {setup.topic.slice(0, 100)}
                  {setup.topic.length > 100 && "..."}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={backToSetup}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{setup.articleType}</Badge>
              <Badge variant="secondary">{setup.length} words</Badge>
              <Badge variant="secondary">{setup.tone}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Outline Review */}
      {currentStep === "outline" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>② Outline Review</CardTitle>
                <CardDescription>
                  Review and edit the generated outline before proceeding to full draft
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={generateOutline}
                disabled={loading}
              >
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Editable Outline */}
            <div className="space-y-2">
              <Label htmlFor="outline">Outline (editable)</Label>
              <Textarea
                id="outline"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                You can edit the outline directly. Reorder sections, adjust word counts, or add notes.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={backToSetup}>
                ← Back to Setup
              </Button>
              <Button
                onClick={generateDraft}
                disabled={loading || !outline.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Draft...
                  </>
                ) : (
                  <>
                    Generate Draft →
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outline Summary (when on draft step) */}
      {currentStep === "draft" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">② Outline</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Outline approved and used for draft generation
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={backToOutline}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Step 3: Generated Draft */}
      {currentStep === "draft" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>③ Generated Draft</CardTitle>
                <CardDescription>
                  Your complete article is ready. Download or copy to continue editing offline.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Draft Content */}
            <div className="bg-slate-50 border rounded-md p-6 prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{draft}</div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
              <div>
                <span className="font-medium">Word Count:</span> {wordCount.toLocaleString()}
              </div>
              {sourcesUsed.length > 0 && (
                <div>
                  <span className="font-medium">Sources Used:</span> {sourcesUsed.length}
                </div>
              )}
            </div>

            {/* Sources List */}
            {sourcesUsed.length > 0 && (
              <div className="space-y-2">
                <Label>Sources Referenced in Draft:</Label>
                <div className="flex flex-wrap gap-2">
                  {sourcesUsed.map((source, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
              <h4 className="font-medium text-sm text-blue-900">💡 Next Steps:</h4>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Edit offline with your own insights and experiences</li>
                <li>Use <strong>Analyze & Cite</strong> agent to validate against corpus</li>
                <li>Use <strong>Editorial</strong> agent for final polish</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={backToOutline}>
                ← Edit Outline
              </Button>
              <Button variant="outline" onClick={backToSetup}>
                Start New Article
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

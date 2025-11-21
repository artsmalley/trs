"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Message } from "@/lib/types";
import { QualityReview } from "@/components/ui/quality-review";

interface Document {
  fileId: string;
  fileName: string;
  mimeType: string;
  blobUrl: string;
  fileType: "document" | "image";
  title: string;
  authors: string[];
  year: number;
  track: string;
  language: string;
  keywords: string[];
  summary: string;
  documentType: string;
  confidence: string;
  source?: string; // Source URL for URL-ingested documents
  status: string;
  uploadedAt: string;
  approvedAt: string | null;
  visionAnalysis?: {
    description: string;
    extractedText: string;
    objects: string[];
    concepts: string[];
  };
}

export function BrowseQueryAgent() {
  // Query Corpus state (from old Summary Agent)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [referencedDocs, setReferencedDocs] = useState<string[]>([]);
  const [selectedBackend, setSelectedBackend] = useState<"file_search" | "supabase">("file_search");

  // Browse Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");
  const [trackFilter, setTrackFilter] = useState("all");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("uploadedAt-desc");
  const [displayCount, setDisplayCount] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filter and sort documents when filters change
  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, statusFilter, trackFilter, fileTypeFilter, sortBy]);

  const fetchDocuments = async () => {
    setDocsLoading(true);
    try {
      const response = await fetch(`/api/corpus/list?status=${statusFilter}`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setDocsLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    // Track filter
    if (trackFilter !== "all") {
      filtered = filtered.filter((doc) => doc.track === trackFilter);
    }

    // File type filter
    if (fileTypeFilter !== "all") {
      console.log(`🔍 Filtering by fileType: ${fileTypeFilter}`);
      console.log(`📊 Sample document data:`, documents[0]);

      filtered = filtered.filter((doc) => {
        console.log(`  Checking ${doc.fileName}: fileType=${doc.fileType}, mimeType=${doc.mimeType}`);

        // Check fileType field if it exists (new uploads)
        if (doc.fileType) {
          const match = doc.fileType === fileTypeFilter;
          console.log(`    ✓ Has fileType field, match=${match}`);
          return match;
        }

        // Fallback: detect from mimeType (backward compatibility)
        if (doc.mimeType) {
          if (fileTypeFilter === "image") {
            const match = doc.mimeType.startsWith("image/");
            console.log(`    ✓ Has mimeType, checking for image: ${match}`);
            return match;
          } else if (fileTypeFilter === "document") {
            const match = doc.mimeType.startsWith("application/") || doc.mimeType.startsWith("text/");
            console.log(`    ✓ Has mimeType, checking for document: ${match}`);
            return match;
          }
        }

        console.log(`    ✗ No fileType or mimeType field - filtered out`);
        return false;
      });

      console.log(`📈 Filter result: ${filtered.length} of ${documents.length} documents`);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.authors.some((author) => author.toLowerCase().includes(query)) ||
          doc.keywords.some((keyword) => keyword.toLowerCase().includes(query))
      );
    }

    // Sorting
    const [sortField, sortDirection] = sortBy.split("-");
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "uploadedAt":
          aVal = new Date(a.uploadedAt).getTime();
          bVal = new Date(b.uploadedAt).getTime();
          break;
        case "approvedAt":
          aVal = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
          bVal = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
          break;
        case "year":
          aVal = a.year || 0;
          bVal = b.year || 0;
          break;
        case "author":
          aVal = a.authors[0]?.toLowerCase() || "";
          bVal = b.authors[0]?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredDocs(filtered);
    setDisplayCount(20); // Reset display count when filters change
  };

  const deleteDocument = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch("/api/corpus/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.fileId !== fileId));
        setSelectedDoc(null);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  // Query Corpus handlers (from old Summary Agent)
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
          backend: selectedBackend,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: "model",
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

  // Get corpus statistics
  const corpusStats = {
    total: filteredDocs.length,
    byTrack: filteredDocs.reduce((acc, doc) => {
      acc[doc.track] = (acc[doc.track] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byLanguage: filteredDocs.reduce((acc, doc) => {
      acc[doc.language] = (acc[doc.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Browse & Query Corpus</CardTitle>
          <CardDescription>Explore your document collection and query it with AI</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="browse">Browse Documents</TabsTrigger>
              <TabsTrigger value="query">Query Corpus</TabsTrigger>
              <TabsTrigger value="quality">Quality Review</TabsTrigger>
            </TabsList>

            {/* BROWSE DOCUMENTS TAB */}
            <TabsContent value="browse" className="space-y-4">
              {/* Filters and Search */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <Input
                    placeholder="Search by title, author, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="w-48">
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <label className="text-sm font-medium mb-2 block">Track</label>
                  <Select value={trackFilter} onValueChange={setTrackFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tracks</SelectItem>
                      <SelectItem value="PD">Product Development</SelectItem>
                      <SelectItem value="PE">Production Engineering</SelectItem>
                      <SelectItem value="TPS">Toyota Production System</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Cross-Cutting">Cross-Cutting</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Files</SelectItem>
                      <SelectItem value="document">📄 Documents</SelectItem>
                      <SelectItem value="image">🖼️ Images</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-56">
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uploadedAt-desc">Date Uploaded (Newest)</SelectItem>
                      <SelectItem value="uploadedAt-asc">Date Uploaded (Oldest)</SelectItem>
                      <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                      <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                      <SelectItem value="year-desc">Year (Newest)</SelectItem>
                      <SelectItem value="year-asc">Year (Oldest)</SelectItem>
                      <SelectItem value="author-asc">Author (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchDocuments} variant="outline">
                  Refresh
                </Button>
              </div>

              {/* Corpus Statistics */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-2xl font-bold text-primary">{corpusStats.total}</p>
                      <p className="text-sm text-muted-foreground">Total Documents</p>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">By Track:</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(corpusStats.byTrack).map(([track, count]) => (
                          <Badge key={track} variant="secondary">
                            {track}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div>
                      <p className="text-sm font-medium mb-2">By Language:</p>
                      <div className="flex gap-2">
                        {Object.entries(corpusStats.byLanguage).map(([lang, count]) => (
                          <Badge key={lang} variant="outline">
                            {lang}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Count Indicator */}
              {!docsLoading && filteredDocs.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(displayCount, filteredDocs.length)} of {filteredDocs.length} documents
                </div>
              )}

              {/* Document List */}
              {docsLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading documents...</div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No documents found. Try adjusting your filters or upload some documents.
                </div>
              ) : (
                <ScrollArea
                  className="h-[500px]"
                  onScrollCapture={(e) => {
                    const target = e.target as HTMLDivElement;
                    const bottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
                    if (bottom && displayCount < filteredDocs.length) {
                      setDisplayCount(prev => Math.min(prev + 20, filteredDocs.length));
                    }
                  }}
                >
                  <div className="space-y-3">
                    {filteredDocs.slice(0, displayCount).map((doc) => (
                      <Card
                        key={doc.fileId}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setModalOpen(true);
                        }}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            {/* Image thumbnail for images */}
                            {(doc.fileType === "image" || doc.mimeType?.startsWith("image/")) && doc.blobUrl && (
                              <div className="w-32 h-24 flex-shrink-0">
                                <img
                                  src={doc.blobUrl}
                                  alt={doc.title}
                                  className="w-full h-full object-cover rounded border"
                                />
                              </div>
                            )}

                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-lg">{(doc.fileType === "image" || doc.mimeType?.startsWith("image/")) ? "🖼️" : "📄"}</span>
                                <h4 className="font-semibold text-base flex-1">{doc.title}</h4>
                                <Badge variant={doc.status === "approved" ? "default" : "secondary"}>
                                  {doc.status === "approved" ? "Approved" : "Pending"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{doc.summary}</p>
                              {doc.source && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">🌐 Source:</span>
                                  <a
                                    href={doc.source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate max-w-md"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {doc.source}
                                  </a>
                                </div>
                              )}
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                {doc.authors.length > 0 && (
                                  <>
                                    <span>{doc.authors.join(", ")}</span>
                                    <span>•</span>
                                  </>
                                )}
                                {doc.year && (
                                  <>
                                    <span>{doc.year}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {doc.track}
                                </Badge>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.language}
                                </Badge>
                              </div>
                              {doc.keywords.length > 0 && (
                                <div className="flex gap-1 flex-wrap mt-2">
                                  {doc.keywords.slice(0, 5).map((keyword, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {displayCount < filteredDocs.length && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Loading more...
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Document/Image Detail Modal */}
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  {selectedDoc && (
                    <>
                      <DialogHeader>
                        <DialogTitle>
                          {(selectedDoc.fileType === "image" || selectedDoc.mimeType?.startsWith("image/")) ? "🖼️" : "📄"} {selectedDoc.title}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedDoc.authors.join(", ") || "No author"}
                          {selectedDoc.year && ` • ${selectedDoc.year}`}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        {/* Status Badge */}
                        <div>
                          <Badge variant={selectedDoc.status === "approved" ? "default" : "secondary"}>
                            {selectedDoc.status === "approved" ? "Approved" : "Pending Review"}
                          </Badge>
                        </div>

                        {/* Image Preview (for images) */}
                        {(selectedDoc.fileType === "image" || selectedDoc.mimeType?.startsWith("image/")) && selectedDoc.blobUrl && (
                          <div className="rounded-lg overflow-hidden border">
                            <img
                              src={selectedDoc.blobUrl}
                              alt={selectedDoc.title}
                              className="w-full h-auto max-h-96 object-contain bg-muted"
                            />
                          </div>
                        )}

                        {/* Summary / Description */}
                        <div>
                          <h5 className="font-semibold text-sm mb-2">
                            {(selectedDoc.fileType === "image" || selectedDoc.mimeType?.startsWith("image/")) ? "Description" : "Summary"}
                          </h5>
                          <p className="text-sm text-muted-foreground leading-relaxed">{selectedDoc.summary}</p>
                        </div>

                        {/* Vision Analysis (for images) */}
                        {(selectedDoc.fileType === "image" || selectedDoc.mimeType?.startsWith("image/")) && selectedDoc.visionAnalysis && (
                          <>
                            {selectedDoc.visionAnalysis.extractedText && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2">Extracted Text (OCR)</h5>
                                <p className="text-sm text-muted-foreground leading-relaxed font-mono bg-muted p-3 rounded">
                                  {selectedDoc.visionAnalysis.extractedText}
                                </p>
                              </div>
                            )}

                            {selectedDoc.visionAnalysis.objects.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2">Detected Objects</h5>
                                <div className="flex gap-2 flex-wrap">
                                  {selectedDoc.visionAnalysis.objects.map((obj, i) => (
                                    <Badge key={i} variant="outline">
                                      {obj}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedDoc.visionAnalysis.concepts.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2">Concepts</h5>
                                <div className="flex gap-2 flex-wrap">
                                  {selectedDoc.visionAnalysis.concepts.map((concept, i) => (
                                    <Badge key={i} variant="secondary">
                                      {concept}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-semibold">Track:</span>{" "}
                            <Badge variant="outline">{selectedDoc.track}</Badge>
                          </div>
                          <div>
                            <span className="font-semibold">Language:</span>{" "}
                            <Badge variant="outline">{selectedDoc.language}</Badge>
                          </div>
                          <div>
                            <span className="font-semibold">Type:</span> {selectedDoc.documentType}
                          </div>
                          <div>
                            <span className="font-semibold">Confidence:</span> {selectedDoc.confidence}
                          </div>
                          <div>
                            <span className="font-semibold">Uploaded:</span>{" "}
                            {new Date(selectedDoc.uploadedAt).toLocaleDateString()}
                          </div>
                          {selectedDoc.approvedAt && (
                            <div>
                              <span className="font-semibold">Approved:</span>{" "}
                              {new Date(selectedDoc.approvedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Keywords */}
                        {selectedDoc.keywords.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-sm mb-2">Keywords</h5>
                            <div className="flex gap-2 flex-wrap">
                              {selectedDoc.keywords.map((keyword, i) => (
                                <Badge key={i} variant="secondary">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* File Information */}
                        <div>
                          <h5 className="font-semibold text-sm mb-2">File Information</h5>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground"><span className="font-semibold">Filename:</span> {selectedDoc.fileName}</p>
                            <p className="text-xs text-muted-foreground font-mono"><span className="font-semibold">File ID:</span> {selectedDoc.fileId}</p>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Download from Blob storage (URL-encode fileId to handle slashes)
                            window.open(`/api/corpus/download/${encodeURIComponent(selectedDoc.fileId)}`, '_blank');
                          }}
                          title={`Download ${(selectedDoc.fileType === "image" || selectedDoc.mimeType?.startsWith("image/")) ? "image" : "document"}`}
                        >
                          Download {(selectedDoc.fileType === "image" || selectedDoc.mimeType?.startsWith("image/")) ? "Image" : "Document"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await deleteDocument(selectedDoc.fileId);
                            setModalOpen(false);
                          }}
                        >
                          Delete {(selectedDoc.fileType === "image" || selectedDoc.mimeType?.startsWith("image/")) ? "Image" : "Document"}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* QUERY CORPUS TAB */}
            <TabsContent value="query" className="space-y-4">
              {/* Backend Selection */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Query Backend</CardTitle>
                  <CardDescription className="text-sm">
                    Select which corpus to query
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedBackend}
                    onValueChange={(value) => setSelectedBackend(value as "file_search" | "supabase")}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="file_search" id="query_file_search" />
                      <Label htmlFor="query_file_search" className="flex-1 cursor-pointer">
                        <div className="font-semibold text-sm">File Search Store (241 documents)</div>
                        <div className="text-xs text-muted-foreground">
                          Current production corpus • All approved documents
                        </div>
                      </Label>
                      <Badge variant="default">Current</Badge>
                    </div>
                    <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="supabase" id="query_supabase" />
                      <Label htmlFor="query_supabase" className="flex-1 cursor-pointer">
                        <div className="font-semibold text-sm">Supabase PostgreSQL (Testing subset)</div>
                        <div className="text-xs text-muted-foreground">
                          Testing phase • 100% reliable citations via SQL JOIN
                        </div>
                      </Label>
                      <Badge variant="secondary">Testing</Badge>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-4 gap-6 h-[600px]">
                {/* Sidebar - Referenced Documents */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Documents</CardTitle>
                    <CardDescription>Referenced in conversation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[450px]">
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
                        <div className="flex items-center gap-2">
                          <CardTitle>Query Corpus</CardTitle>
                          <Badge variant={selectedBackend === "supabase" ? "secondary" : "default"}>
                            {selectedBackend === "supabase" ? "Supabase" : "File Search"}
                          </Badge>
                        </div>
                        <CardDescription>Ask questions and get RAG-powered answers</CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadConversation}
                        disabled={messages.length === 0}
                      >
                        Download
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {/* Simplified - no mode/length dropdowns */}

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
                                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
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
                                    <Card
                                      key={j}
                                      className={`p-3 ${
                                        citation.source === 'web'
                                          ? 'border-blue-200 bg-blue-50/50'
                                          : 'border-green-200 bg-green-50/50'
                                      }`}
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-2 flex-1">
                                            <Badge
                                              variant={citation.source === 'web' ? 'default' : 'secondary'}
                                              className={`text-xs ${
                                                citation.source === 'web'
                                                  ? 'bg-blue-600'
                                                  : 'bg-green-600 text-white'
                                              }`}
                                            >
                                              {citation.source === 'web' ? '🌐 Web' : '📄 Corpus'}
                                            </Badge>
                                            <p className="text-xs font-medium flex-1">{citation.title}</p>
                                          </div>
                                          {citation.pageNumber && (
                                            <Badge variant="outline" className="text-xs">
                                              p.{citation.pageNumber}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground italic">"{citation.excerpt}"</p>
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
                      <Textarea
                        placeholder="Ask a question about your corpus..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        disabled={loading}
                        rows={3}
                        className="resize-none"
                      />
                      <Button onClick={handleSend} disabled={loading || !input.trim()}>
                        Search
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* QUALITY REVIEW TAB */}
            <TabsContent value="quality">
              <QualityReview />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

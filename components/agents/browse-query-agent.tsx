"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Message } from "@/lib/types";

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
      filtered = filtered.filter((doc) => {
        // Check fileType field if it exists (new uploads)
        if (doc.fileType) {
          return doc.fileType === fileTypeFilter;
        }

        // Fallback: detect from mimeType (backward compatibility)
        if (fileTypeFilter === "image") {
          return doc.mimeType?.startsWith("image/");
        } else if (fileTypeFilter === "document") {
          return doc.mimeType?.startsWith("application/") || doc.mimeType?.startsWith("text/");
        }

        return false;
      });
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
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="browse">Browse Documents</TabsTrigger>
              <TabsTrigger value="query">Query Corpus</TabsTrigger>
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
                      <SelectItem value="PE">Production Engineering</SelectItem>
                      <SelectItem value="PD">Product Development</SelectItem>
                      <SelectItem value="TPS">Toyota Production System</SelectItem>
                      <SelectItem value="Ops">Operations</SelectItem>
                      <SelectItem value="Supplier">Supplier Development</SelectItem>
                      <SelectItem value="General">General</SelectItem>
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
            <TabsContent value="query">
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
                        <CardTitle>Query Corpus</CardTitle>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

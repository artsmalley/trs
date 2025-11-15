"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Save, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTierColor, getTierPriority, type QualityTier } from "@/lib/classify-documents";

interface Document {
  fileId: string;
  fileName: string;
  title: string;
  track: string;
  summary: string;
  qualityTier?: QualityTier;
  tierLabel?: string;
  autoClassified?: boolean;
  documentType?: string;
  uploadedAt: string;
}

interface TierChange {
  fileId: string;
  qualityTier: QualityTier;
  tierLabel: string;
}

const TIER_LABELS: Record<QualityTier, string> = {
  "Tier 1": "Authoritative",
  "Tier 2": "High Quality",
  "Tier 3": "Supporting",
  "Tier 4": "Background"
};

const TIER_DESCRIPTIONS: Record<QualityTier, string> = {
  "Tier 1": "Primary sources from ex-Toyota authors and top experts",
  "Tier 2": "Academic papers, high-quality analyses, and detailed technical documents",
  "Tier 3": "Supporting materials, web articles, and general references",
  "Tier 4": "Background materials, timelines, and historical context"
};

export function QualityReview() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [changes, setChanges] = useState<Map<string, TierChange>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(["Tier 2"])); // Expand Tier 2 by default
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/corpus/list?status=approved");
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/corpus/classify-all");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const runClassification = async () => {
    if (!confirm("Run auto-classification on all unclassified documents? This will not override manual classifications.")) {
      return;
    }

    setClassifying(true);
    try {
      const response = await fetch("/api/corpus/classify-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "CLASSIFY_ALL_DOCUMENTS" })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Classification complete!\n${data.message}\n\nDistribution:\n${Object.entries(data.summary.distribution).map(([tier, count]) => `${tier}: ${count}`).join('\n')}`);
        await fetchDocuments();
        await fetchStats();
        setChanges(new Map()); // Clear pending changes
      } else {
        alert(`Classification failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Classification error:", error);
      alert("Classification failed. Check console for details.");
    } finally {
      setClassifying(false);
    }
  };

  const handleTierChange = (fileId: string, newTier: QualityTier) => {
    const doc = documents.find(d => d.fileId === fileId);
    if (!doc) return;

    const newChanges = new Map(changes);
    newChanges.set(fileId, {
      fileId,
      qualityTier: newTier,
      tierLabel: TIER_LABELS[newTier]
    });
    setChanges(newChanges);
  };

  const saveChanges = async () => {
    if (changes.size === 0) {
      alert("No changes to save");
      return;
    }

    if (!confirm(`Save ${changes.size} tier change(s)?`)) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [fileId, change] of changes.entries()) {
      try {
        const response = await fetch("/api/corpus/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId,
            updates: {
              qualityTier: change.qualityTier,
              tierLabel: change.tierLabel,
              autoClassified: false, // Mark as manual
              classifiedAt: new Date().toISOString()
            }
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error updating ${fileId}:`, error);
        errorCount++;
      }
    }

    setLoading(false);
    alert(`Saved ${successCount} of ${changes.size} changes${errorCount > 0 ? `\n${errorCount} failed` : ''}`);

    if (successCount > 0) {
      await fetchDocuments();
      await fetchStats();
      setChanges(new Map());
    }
  };

  const getClassificationReason = (doc: Document): string => {
    if (!doc.autoClassified) return "Manual classification";

    // Infer reason from document metadata (matches classify-documents.ts logic)
    if (doc.track === "History" && doc.summary?.toLowerCase().includes("timeline")) {
      return "History track + timeline keywords";
    }
    if (doc.documentType?.toLowerCase().includes("academic")) {
      return "Academic paper";
    }
    if (doc.documentType?.toLowerCase().includes("web page")) {
      return "Web page";
    }
    if (doc.track === "History") {
      return "History track (no timeline keywords)";
    }
    return "Default classification - needs review";
  };

  // Group documents by tier
  const groupedDocs = documents.reduce((acc, doc) => {
    // Apply pending change if exists
    const pendingChange = changes.get(doc.fileId);
    const tier = pendingChange?.qualityTier || doc.qualityTier || "Unclassified";

    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Filter documents
  const filterDocs = (docs: Document[]) => {
    return docs.filter(doc => {
      // Track filter
      if (trackFilter !== "all" && doc.track !== trackFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!doc.title.toLowerCase().includes(query) &&
            !doc.fileName.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  };

  const toggleTier = (tier: string) => {
    const newExpanded = new Set(expandedTiers);
    if (newExpanded.has(tier)) {
      newExpanded.delete(tier);
    } else {
      newExpanded.add(tier);
    }
    setExpandedTiers(newExpanded);
  };

  const getBadgeColor = (tier: string) => {
    const color = getTierColor(tier as QualityTier);
    switch (color) {
      case "blue": return "bg-blue-500";
      case "green": return "bg-green-500";
      case "amber": return "bg-amber-500";
      case "gray": return "bg-gray-500";
      default: return "bg-gray-300";
    }
  };

  // Sort tiers by priority
  const sortedTiers = Object.keys(groupedDocs).sort((a, b) => {
    if (a === "Unclassified") return 1;
    if (b === "Unclassified") return -1;
    return getTierPriority(a as QualityTier) - getTierPriority(b as QualityTier);
  });

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Quality Review</h3>
          <p className="text-sm text-muted-foreground">
            Review and adjust document quality tiers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runClassification}
            disabled={classifying}
            variant="outline"
          >
            {classifying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Classifying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Auto-Classification
              </>
            )}
          </Button>
          <Button
            onClick={saveChanges}
            disabled={changes.size === 0 || loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Save {changes.size > 0 && `(${changes.size})`}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex gap-8 text-sm">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-muted-foreground">Total Documents</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.distribution?.["Tier 1"] || 0}</p>
                <p className="text-muted-foreground">Tier 1 - Authoritative</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.distribution?.["Tier 2"] || 0}</p>
                <p className="text-muted-foreground">Tier 2 - High Quality</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.distribution?.["Tier 3"] || 0}</p>
                <p className="text-muted-foreground">Tier 3 - Supporting</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{stats.distribution?.["Tier 4"] || 0}</p>
                <p className="text-muted-foreground">Tier 4 - Background</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.distribution?.["Unclassified"] || 0}</p>
                <p className="text-muted-foreground">Unclassified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by title or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              <SelectItem value="PD">Product Development</SelectItem>
              <SelectItem value="PE">Production Engineering</SelectItem>
              <SelectItem value="TPS">Toyota Production System</SelectItem>
              <SelectItem value="History">History</SelectItem>
              <SelectItem value="Cross-Cutting">Cross-Cutting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tier Groups */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {sortedTiers.map(tier => {
            const docs = filterDocs(groupedDocs[tier]);
            if (docs.length === 0) return null;

            const isExpanded = expandedTiers.has(tier);

            return (
              <Collapsible key={tier} open={isExpanded} onOpenChange={() => toggleTier(tier)}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <Badge className={`${getBadgeColor(tier)} text-white`}>
                            {tier}
                          </Badge>
                          <span className="font-semibold">{TIER_LABELS[tier as QualityTier] || tier}</span>
                          <span className="text-sm text-muted-foreground">({docs.length} documents)</span>
                        </div>
                        {tier !== "Unclassified" && (
                          <span className="text-xs text-muted-foreground italic">
                            {TIER_DESCRIPTIONS[tier as QualityTier]}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {docs.map(doc => {
                        const pendingChange = changes.get(doc.fileId);
                        const currentTier = pendingChange?.qualityTier || doc.qualityTier || "Tier 2";
                        const hasChange = pendingChange !== undefined;

                        return (
                          <div key={doc.fileId} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium">{doc.fileName}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{doc.title}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">{doc.track}</Badge>
                                  {doc.autoClassified && (
                                    <Badge variant="secondary" className="text-xs">Auto</Badge>
                                  )}
                                  {hasChange && (
                                    <Badge className="text-xs bg-orange-500 text-white">Pending Change</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Reason: {getClassificationReason(doc)}
                                </p>
                              </div>

                              <div className="w-48">
                                <Select
                                  value={currentTier}
                                  onValueChange={(value) => handleTierChange(doc.fileId, value as QualityTier)}
                                >
                                  <SelectTrigger className={hasChange ? "border-orange-500" : ""}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Tier 1">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        Tier 1 - Authoritative
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Tier 2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Tier 2 - High Quality
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Tier 3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        Tier 3 - Supporting
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Tier 4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                                        Tier 4 - Background
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Changes Summary */}
      {changes.size > 0 && (
        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium">
              {changes.size} pending change{changes.size > 1 ? 's' : ''} - Click "Save" to apply
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

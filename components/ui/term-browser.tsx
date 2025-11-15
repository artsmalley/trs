"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResearchTerm,
  ALL_TRACKS,
  getTermsForTrack,
  getTermsForSubcategory,
  getTermsForSubArea,
} from "@/lib/research-terms-data";

type LanguageFilter = "english" | "japanese" | "both";

interface TermBrowserProps {
  selectedTerms: ResearchTerm[];
  onTermsChange: (terms: ResearchTerm[]) => void;
}

export function TermBrowser({ selectedTerms, onTermsChange }: TermBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("both");
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set(["pd", "pe", "tps"]));
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [selectedFilters, setSelectedFilters] = useState<{
    tracks: Set<string>;
    subcategories: Set<string>;
    subAreas: Set<string>;
  }>({
    tracks: new Set(),
    subcategories: new Set(),
    subAreas: new Set(),
  });

  // Toggle functions for collapsibles
  const toggleTrack = (trackId: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
      } else {
        next.add(subcategoryId);
      }
      return next;
    });
  };

  // Filter toggle functions
  const toggleTrackFilter = (trackId: string) => {
    setSelectedFilters((prev) => {
      const next = { ...prev, tracks: new Set(prev.tracks) };
      if (next.tracks.has(trackId)) {
        next.tracks.delete(trackId);
      } else {
        next.tracks.add(trackId);
      }
      return next;
    });
  };

  const toggleSubcategoryFilter = (subcategoryId: string) => {
    setSelectedFilters((prev) => {
      const next = { ...prev, subcategories: new Set(prev.subcategories) };
      if (next.subcategories.has(subcategoryId)) {
        next.subcategories.delete(subcategoryId);
      } else {
        next.subcategories.add(subcategoryId);
      }
      return next;
    });
  };

  // Term selection functions
  const isTermSelected = (term: ResearchTerm) => {
    return selectedTerms.some(
      (t) => t.english === term.english && t.japanese === term.japanese
    );
  };

  const toggleTerm = (term: ResearchTerm) => {
    if (isTermSelected(term)) {
      onTermsChange(
        selectedTerms.filter(
          (t) => !(t.english === term.english && t.japanese === term.japanese)
        )
      );
    } else {
      onTermsChange([...selectedTerms, term]);
    }
  };

  const removeTerm = (term: ResearchTerm) => {
    onTermsChange(
      selectedTerms.filter(
        (t) => !(t.english === term.english && t.japanese === term.japanese)
      )
    );
  };

  // Format term display based on language filter
  const formatTerm = (term: ResearchTerm): string => {
    if (languageFilter === "english") {
      return term.english;
    } else if (languageFilter === "japanese") {
      return term.japanese;
    } else {
      return `${term.english} (${term.japanese})`;
    }
  };

  // Search and filter terms
  const matchesSearch = (term: ResearchTerm): boolean => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    if (languageFilter === "english") {
      return term.english.toLowerCase().includes(query);
    } else if (languageFilter === "japanese") {
      return term.japanese.includes(searchQuery);
    } else {
      return (
        term.english.toLowerCase().includes(query) ||
        term.japanese.includes(searchQuery)
      );
    }
  };

  const matchesFilters = (term: ResearchTerm): boolean => {
    // If no filters selected, show all
    if (
      selectedFilters.tracks.size === 0 &&
      selectedFilters.subcategories.size === 0 &&
      selectedFilters.subAreas.size === 0
    ) {
      return true;
    }

    // Check track filter
    if (selectedFilters.tracks.size > 0) {
      const trackId = ALL_TRACKS.find((t) => t.name === term.track)?.id;
      if (!trackId || !selectedFilters.tracks.has(trackId)) return false;
    }

    // Check subcategory filter
    if (selectedFilters.subcategories.size > 0) {
      const track = ALL_TRACKS.find((t) => t.name === term.track);
      if (!track) return false;
      const subcategory = track.subcategories.find(
        (s) => s.name === term.subcategory
      );
      if (!subcategory || !selectedFilters.subcategories.has(subcategory.id))
        return false;
    }

    // Check sub-area filter
    if (selectedFilters.subAreas.size > 0 && term.subArea) {
      if (!selectedFilters.subAreas.has(term.subArea)) return false;
    }

    return true;
  };

  // Get filtered terms
  const filteredTerms = useMemo(() => {
    const allTerms: Array<{
      term: ResearchTerm;
      trackName: string;
      subcategoryName: string;
      subAreaName?: string;
    }> = [];

    for (const track of ALL_TRACKS) {
      for (const subcategory of track.subcategories) {
        if (subcategory.terms) {
          for (const term of subcategory.terms) {
            allTerms.push({
              term,
              trackName: track.name,
              subcategoryName: subcategory.name,
            });
          }
        }
        if (subcategory.subAreas) {
          for (const subArea of subcategory.subAreas) {
            for (const term of subArea.terms) {
              allTerms.push({
                term,
                trackName: track.name,
                subcategoryName: subcategory.name,
                subAreaName: subArea.name,
              });
            }
          }
        }
      }
    }

    return allTerms.filter(
      ({ term }) => matchesSearch(term) && matchesFilters(term)
    );
  }, [searchQuery, selectedFilters, languageFilter]);

  // Count statistics
  const termStats = useMemo(() => {
    const stats = new Map<string, { total: number; selected: number }>();

    for (const track of ALL_TRACKS) {
      const trackTerms = getTermsForTrack(track.id);
      const selectedCount = trackTerms.filter((t) => isTermSelected(t)).length;
      stats.set(track.id, {
        total: trackTerms.length,
        selected: selectedCount,
      });
    }

    return stats;
  }, [selectedTerms]);

  return (
    <div className="space-y-4">
      {/* Search and Language Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">
            Search Research Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Language Toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={languageFilter === "english" ? "default" : "outline"}
              onClick={() => setLanguageFilter("english")}
              className={cn(
                "flex-1",
                languageFilter === "english" &&
                  "bg-blue-600 hover:bg-blue-700"
              )}
            >
              English Only
            </Button>
            <Button
              size="sm"
              variant={languageFilter === "japanese" ? "default" : "outline"}
              onClick={() => setLanguageFilter("japanese")}
              className={cn(
                "flex-1",
                languageFilter === "japanese" &&
                  "bg-blue-600 hover:bg-blue-700"
              )}
            >
              日本語 Only
            </Button>
            <Button
              size="sm"
              variant={languageFilter === "both" ? "default" : "outline"}
              onClick={() => setLanguageFilter("both")}
              className={cn(
                "flex-1",
                languageFilter === "both" && "bg-blue-600 hover:bg-blue-700"
              )}
            >
              Both
            </Button>
          </div>

          {/* Results count */}
          <div className="text-xs text-gray-500 text-center">
            {filteredTerms.length} term{filteredTerms.length !== 1 ? "s" : ""}{" "}
            {searchQuery || selectedFilters.tracks.size > 0
              ? "found"
              : "available"}
          </div>
        </CardContent>
      </Card>

      {/* Selected Terms Display */}
      {selectedTerms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Selected Terms ({selectedTerms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedTerms.map((term, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-blue-100 text-blue-900 hover:bg-blue-200 pl-3 pr-1 py-1 flex items-center gap-2"
                >
                  <span className="font-medium">{formatTerm(term)}</span>
                  <button
                    onClick={() => removeTerm(term)}
                    className="ml-1 rounded-full hover:bg-blue-300 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-Column Layout: Filters + Terms */}
      <div className="grid grid-cols-[250px_1fr] gap-4">
        {/* Left: Category Filters */}
        <Card className="h-fit sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Filter by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {ALL_TRACKS.map((track) => {
                  const stats = termStats.get(track.id);
                  return (
                    <Collapsible
                      key={track.id}
                      open={expandedTracks.has(track.id)}
                      onOpenChange={() => toggleTrack(track.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedFilters.tracks.has(track.id)}
                            onCheckedChange={() => toggleTrackFilter(track.id)}
                            className="h-4 w-4"
                          />
                          <CollapsibleTrigger className="flex items-center gap-1 hover:text-blue-600 flex-1">
                            {expandedTracks.has(track.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {track.name}
                            </span>
                          </CollapsibleTrigger>
                          <span className="text-xs text-gray-500">
                            {stats?.selected || 0}/{stats?.total || 0}
                          </span>
                        </div>
                        <CollapsibleContent className="ml-6 space-y-1">
                          {track.subcategories.map((subcategory) => {
                            const subTerms = getTermsForSubcategory(
                              track.id,
                              subcategory.id
                            );
                            const selectedCount = subTerms.filter((t) =>
                              isTermSelected(t)
                            ).length;

                            return (
                              <div
                                key={subcategory.id}
                                className="flex items-center gap-2 py-1"
                              >
                                <Checkbox
                                  checked={selectedFilters.subcategories.has(
                                    subcategory.id
                                  )}
                                  onCheckedChange={() =>
                                    toggleSubcategoryFilter(subcategory.id)
                                  }
                                  className="h-3 w-3"
                                />
                                <span className="text-xs text-gray-700 flex-1">
                                  {subcategory.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {selectedCount}/{subTerms.length}
                                </span>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Clear Filters */}
            {(selectedFilters.tracks.size > 0 ||
              selectedFilters.subcategories.size > 0) && (
              <div className="mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelectedFilters({
                      tracks: new Set(),
                      subcategories: new Set(),
                      subAreas: new Set(),
                    })
                  }
                  className="w-full text-xs text-gray-600 hover:text-blue-600"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Terms List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              All Research Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-1">
                {filteredTerms.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-8">
                    No terms found matching your search
                  </div>
                ) : (
                  filteredTerms.map(
                    ({ term, trackName, subcategoryName, subAreaName }, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 border border-transparent hover:border-blue-100 transition-colors"
                      >
                        <Checkbox
                          checked={isTermSelected(term)}
                          onCheckedChange={() => toggleTerm(term)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">
                            {formatTerm(term)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {trackName} → {subcategoryName}
                            {subAreaName && ` → ${subAreaName}`}
                          </div>
                          {term.notes && (
                            <div className="text-xs text-blue-600 italic mt-0.5">
                              {term.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

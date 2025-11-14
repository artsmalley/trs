"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, X, ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESEARCH_CATEGORIES, getTermsForCategory, getSubcategoriesForTrack, getTermsForSubcategory, ResearchTerm } from "@/lib/research-terms-data";
import { generateSearchUrls } from "@/lib/google-search";

interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export function ResearchAgent() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedTerms, setSelectedTerms] = useState<ResearchTerm[]>([]);
  const [termPickerOpen, setTermPickerOpen] = useState(false);
  const [freeFormTopic, setFreeFormTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerms, setSearchTerms] = useState<any>(null);

  // Web search state
  const [webSearchResults, setWebSearchResults] = useState<WebSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalResults, setTotalResults] = useState("0");
  const [nextStartIndex, setNextStartIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Get available subcategories and terms based on selections
  const availableSubcategories = selectedCategory ? getSubcategoriesForTrack(selectedCategory) : [];
  const availableTerms = selectedCategory && selectedSubcategory && selectedSubcategory !== "all"
    ? getTermsForSubcategory(selectedCategory, selectedSubcategory)
    : selectedCategory
      ? getTermsForCategory(selectedCategory)
      : [];

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory("all"); // Reset to all subcategories when track changes
    setSelectedTerms([]); // Clear selected terms when category changes
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    setSelectedTerms([]); // Clear selected terms when subcategory changes
  };

  const toggleTerm = (term: ResearchTerm) => {
    setSelectedTerms((prev) => {
      const exists = prev.find(
        (t) => t.english === term.english && t.japanese === term.japanese
      );
      if (exists) {
        return prev.filter(
          (t) => !(t.english === term.english && t.japanese === term.japanese)
        );
      }
      return [...prev, term];
    });
  };

  const removeTerm = (term: ResearchTerm) => {
    setSelectedTerms((prev) =>
      prev.filter(
        (t) => !(t.english === term.english && t.japanese === term.japanese)
      )
    );
  };

  const isTermSelected = (term: ResearchTerm) => {
    return selectedTerms.some(
      (t) => t.english === term.english && t.japanese === term.japanese
    );
  };

  const handleGenerateFromGuided = async () => {
    if (selectedTerms.length === 0) return;

    const combinedTopic = selectedTerms
      .map((term) => `${term.english} (${term.japanese})`)
      .join(", ");

    setLoading(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: combinedTopic }),
      });
      const data = await response.json();
      setSearchTerms(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromFreeForm = async () => {
    if (!freeFormTopic.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: freeFormTopic }),
      });
      const data = await response.json();
      setSearchTerms(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Web search functions
  const performWebSearch = async (query: string, startIndex: number = 1) => {
    setIsSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, startIndex }),
      });
      const data = await response.json();

      if (data.success) {
        if (startIndex === 1) {
          setWebSearchResults(data.results);
          setSearchQuery(query);
        } else {
          setWebSearchResults((prev) => [...prev, ...data.results]);
        }
        setTotalResults(data.totalResults);
        setNextStartIndex(data.nextStartIndex);
      }
    } catch (error) {
      console.error("Web search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleWebSearchFromGuided = () => {
    if (selectedTerms.length === 0) return;
    const query = selectedTerms
      .map((term) => `${term.english} ${term.japanese}`)
      .join(" ");
    performWebSearch(query);
  };

  const handleWebSearchFromFreeForm = () => {
    if (!freeFormTopic.trim()) return;
    performWebSearch(freeFormTopic);
  };

  const handleLoadMore = () => {
    if (nextStartIndex && searchQuery) {
      performWebSearch(searchQuery, nextStartIndex);
    }
  };

  const targetedSearchUrls = searchQuery ? generateSearchUrls(searchQuery) : null;

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-blue-900">Research Agent</CardTitle>
          <CardDescription className="text-blue-700">
            Generate Japanese and English search terms for J-STAGE, patents, and technical literature
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Guided Search Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px bg-gradient-to-r from-blue-200 to-transparent flex-1" />
              <span className="text-sm font-medium text-blue-700">Guided Search</span>
              <div className="h-px bg-gradient-to-l from-blue-200 to-transparent flex-1" />
            </div>

            {/* Track Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                1. Select Research Track
              </label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Choose a track (PD, PE, TPS, or Cross-Cutting)" />
                </SelectTrigger>
                <SelectContent>
                  {RESEARCH_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory Selector */}
            {selectedCategory && availableSubcategories.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  2. Select Subcategory <span className="text-xs text-gray-500">(optional - leave blank for all)</span>
                </label>
                <Select value={selectedSubcategory} onValueChange={handleSubcategoryChange}>
                  <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                    <SelectValue placeholder="Choose a subcategory or select all" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subcategories</SelectItem>
                    {availableSubcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Term Multi-Selector */}
            {selectedCategory && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  3. Select Research Terms
                </label>
                <Popover open={termPickerOpen} onOpenChange={setTermPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={termPickerOpen}
                      className="w-full justify-between border-blue-200 hover:bg-blue-50"
                    >
                      {selectedTerms.length === 0
                        ? "Select terms to search..."
                        : `${selectedTerms.length} term${selectedTerms.length > 1 ? "s" : ""} selected`}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (searchable)
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[600px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search terms in English or Japanese..." />
                      <CommandList>
                        <CommandEmpty>No terms found.</CommandEmpty>
                        <ScrollArea className="h-[300px]">
                          {RESEARCH_CATEGORIES.find((c) => c.id === selectedCategory)?.subcategories
                            .filter((subcategory) => selectedSubcategory === "all" || subcategory.id === selectedSubcategory)
                            .map((subcategory) => (
                              <CommandGroup key={subcategory.id} heading={subcategory.name}>
                                {subcategory.terms.map((term) => (
                                  <CommandItem
                                    key={`${term.english}-${term.japanese}`}
                                    value={`${term.english} ${term.japanese}`}
                                    onSelect={() => toggleTerm(term)}
                                  >
                                    <div
                                      className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        isTermSelected(term)
                                          ? "bg-primary text-primary-foreground"
                                          : "opacity-50 [&_svg]:invisible"
                                      )}
                                    >
                                      <Check className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium">{term.english}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {term.japanese}
                                        {term.notes && (
                                          <span className="ml-2 text-xs italic">
                                            ({term.notes})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )
                          )}
                        </ScrollArea>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Selected Terms Display */}
            {selectedTerms.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Selected Terms ({selectedTerms.length})
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  {selectedTerms.map((term, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-blue-100 text-blue-900 hover:bg-blue-200 pl-3 pr-1 py-1 flex items-center gap-2"
                    >
                      <span className="font-medium">{term.english}</span>
                      <span className="text-xs text-blue-700">({term.japanese})</span>
                      <button
                        onClick={() => removeTerm(term)}
                        className="ml-1 rounded-full hover:bg-blue-300 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedTerms.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleWebSearchFromGuided}
                  disabled={isSearching}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isSearching ? "Searching..." : "Web Search"}
                </Button>
                <Button
                  onClick={handleGenerateFromGuided}
                  disabled={loading}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {loading ? "Generating..." : "Generate Terms"}
                </Button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Free-form Search Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px bg-gradient-to-r from-gray-200 to-transparent flex-1" />
              <span className="text-sm font-medium text-gray-600">Free-form Search</span>
              <div className="h-px bg-gradient-to-l from-gray-200 to-transparent flex-1" />
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Or type any research topic freely..."
                value={freeFormTopic}
                onChange={(e) => setFreeFormTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleWebSearchFromFreeForm();
                  }
                }}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleWebSearchFromFreeForm}
                  disabled={isSearching || !freeFormTopic.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isSearching ? "Searching..." : "Web Search"}
                </Button>
                <Button
                  onClick={handleGenerateFromFreeForm}
                  disabled={loading || !freeFormTopic.trim()}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {loading ? "Generating..." : "Generate Terms"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Web Search Results */}
      {webSearchResults.length > 0 && (
        <>
          <Card className="border-blue-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-900">Web Search Results</CardTitle>
              <CardDescription className="text-blue-700">
                Found {parseInt(totalResults).toLocaleString()} results for "{searchQuery}"
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {webSearchResults.map((result, index) => (
                <div
                  key={index}
                  className="p-4 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 flex items-start gap-2">
                      {result.title}
                      <ExternalLink className="w-4 h-4 mt-1 flex-shrink-0" />
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{result.displayLink}</p>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                      {result.snippet}
                    </p>
                  </a>
                </div>
              ))}

              {/* Load More Button */}
              {nextStartIndex && (
                <Button
                  onClick={handleLoadMore}
                  disabled={isSearching}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {isSearching ? "Loading..." : `Load More Results (${webSearchResults.length + 1}-${webSearchResults.length + 5})`}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Targeted Search Buttons */}
          {targetedSearchUrls && (
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-blue-900">Search Specific Sites</CardTitle>
                <CardDescription className="text-blue-700">
                  Open targeted searches in academic databases and patent archives
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <a
                      href={targetedSearchUrls.jstage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      🔬 J-STAGE
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <a
                      href={targetedSearchUrls.patents}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      📄 Patents
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <a
                      href={targetedSearchUrls.scholar}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      🎓 Scholar
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <a
                      href={targetedSearchUrls.googleJapan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      🇯🇵 Google JP
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {searchTerms && (
        <>
          <Card className="border-blue-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-900">Suggested Search Terms</CardTitle>
              <CardDescription className="text-blue-700">
                AI-generated terms for your research query
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h3 className="font-semibold mb-3 text-gray-700">Japanese Terms (日本語)</h3>
                <div className="flex flex-wrap gap-2">
                  {searchTerms.searchTerms?.japanese?.map((term: string, i: number) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-blue-100 text-blue-900 hover:bg-blue-200"
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator className="bg-blue-100" />
              <div>
                <h3 className="font-semibold mb-3 text-gray-700">English Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {searchTerms.searchTerms?.english?.map((term: string, i: number) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-blue-300 text-blue-700"
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-900">Research Priorities</CardTitle>
              <CardDescription className="text-blue-700">
                Suggested research order and tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {searchTerms.priorities?.map((priority: any) => (
                    <Card key={priority.id} className="border-blue-100">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-gray-800">{priority.topic}</h4>
                            <div className="flex gap-2 flex-wrap">
                              {priority.searchTerms.map((term: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs bg-blue-50 text-blue-700"
                                >
                                  {term}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Badge
                            variant={priority.priority === "high" ? "default" : "outline"}
                            className={priority.priority === "high" ? "bg-blue-600" : "border-blue-300 text-blue-700"}
                          >
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
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-blue-900">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-700 leading-relaxed">
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

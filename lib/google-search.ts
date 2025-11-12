/**
 * Google Custom Search API Integration
 * Uses Google Custom Search JSON API for web search functionality
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
  pagemap?: {
    cse_image?: Array<{ src: string }>;
    metatags?: Array<{ [key: string]: string }>;
  };
}

export interface SearchResponse {
  items: SearchResult[];
  searchInformation: {
    totalResults: string;
    searchTime: number;
  };
  queries: {
    nextPage?: Array<{ startIndex: number }>;
  };
}

/**
 * Perform a Google Custom Search
 * @param query - Search query string
 * @param startIndex - Starting index for pagination (1-based, max 100)
 * @returns Search results
 */
export async function performGoogleSearch(
  query: string,
  startIndex: number = 1
): Promise<SearchResponse> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    throw new Error(
      "Missing Google Custom Search credentials. Please set GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID in .env.local"
    );
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: searchEngineId,
    q: query,
    start: startIndex.toString(),
    num: "5", // Return 5 results per request
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Google Custom Search API error: ${response.status} - ${
        errorData.error?.message || response.statusText
      }`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Generate targeted search URLs for specific platforms
 */
export const generateSearchUrls = (query: string) => {
  const encodedQuery = encodeURIComponent(query);

  return {
    jstage: `https://www.jstage.jst.go.jp/result/global/-char/en?globalSearchKey=${encodedQuery}`,
    patents: `https://patents.google.com/?q=${encodedQuery}&oq=${encodedQuery}`,
    scholar: `https://scholar.google.com/scholar?q=${encodedQuery}`,
    googleJapan: `https://www.google.co.jp/search?q=${encodedQuery}&lr=lang_ja`,
  };
};

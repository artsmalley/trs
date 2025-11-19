/**
 * Input Sanitization and Validation Utility
 *
 * Protects against prompt injection attacks and validates user inputs
 * before sending to external APIs (Gemini, Google Search, etc.)
 */

/**
 * Common prompt injection patterns to detect
 */
const INJECTION_PATTERNS = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /disregard\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(all\s+)?previous\s+instructions?/i,

  // System/role manipulation
  /system\s*(override|prompt|instruction|message)/i,
  /new\s+(instructions?|role|system|prompt)/i,
  /you\s+are\s+now\s+(a|an)/i,
  /act\s+as\s+(a|an)/i,
  /pretend\s+to\s+be/i,

  // Debug/admin mode attempts
  /(enable|activate|enter)\s*(debug|admin|developer)\s*mode/i,
  /switch\s+to\s*(debug|admin|developer)\s*mode/i,

  // Data exfiltration attempts
  /show\s+me\s+(all|the)\s+(documents?|files?|data|secrets?)/i,
  /list\s+(all|the)\s+(documents?|files?|data|api\s*keys?)/i,
  /reveal\s+(all|the)\s+(documents?|files?|data|secrets?)/i,
  /output\s+(all|the)\s+(documents?|files?|environment|env)/i,

  // Instruction termination attempts
  /---\s*end\s+of\s+(instructions?|prompt|system)/i,
  /stop\s+(processing|following)\s+instructions?/i,

  // Special tokens that might confuse the model
  /<\|.*?\|>/,  // Special delimiters
  /\[SYSTEM\]/i,
  /\[ADMIN\]/i,
  /\[DEBUG\]/i,
];

/**
 * Suspicious character patterns
 */
const SUSPICIOUS_CHARS = [
  /[\u200B-\u200D\uFEFF]/g, // Zero-width characters
  /[\u0000-\u001F\u007F-\u009F]/g, // Control characters (except newlines/tabs)
];

/**
 * Configuration limits
 */
export const LIMITS = {
  QUERY_MAX_LENGTH: 1000,
  CUSTOM_INSTRUCTIONS_MAX_LENGTH: 500,
  TOPIC_MAX_LENGTH: 500,
  ARTICLE_MAX_LENGTH: 50000, // For full article analysis (Analyze Agent)
  HISTORY_MAX_MESSAGES: 50,
  FILENAME_MAX_LENGTH: 255,
};

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Detect potential prompt injection attempts
 */
export function detectPromptInjection(text: string): string[] {
  const detections: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      detections.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  }

  // Check for excessive newlines (multi-line injection attempt)
  const newlineCount = (text.match(/\n/g) || []).length;
  if (newlineCount > 10) {
    detections.push(`Excessive newlines detected (${newlineCount})`);
  }

  // Check for suspicious repeated characters
  if (/(.)\1{20,}/.test(text)) {
    detections.push("Suspicious repeated characters detected");
  }

  return detections;
}

/**
 * Remove suspicious characters
 */
function removeSuspiciousChars(text: string): string {
  let cleaned = text;

  for (const pattern of SUSPICIOUS_CHARS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Normalize whitespace but preserve single newlines
  cleaned = cleaned.replace(/[ \t]+/g, " "); // Multiple spaces/tabs -> single space
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // 3+ newlines -> 2 newlines

  return cleaned.trim();
}

/**
 * Sanitize custom instructions field (Query Corpus agent)
 *
 * This is the highest-risk field as it's directly embedded in system prompts.
 */
export function sanitizeCustomInstructions(input: string): ValidationResult {
  if (!input || input.trim().length === 0) {
    return { isValid: true, sanitized: "" };
  }

  const warnings: string[] = [];

  // Check length
  if (input.length > LIMITS.CUSTOM_INSTRUCTIONS_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Custom instructions too long (max ${LIMITS.CUSTOM_INSTRUCTIONS_MAX_LENGTH} characters)`,
    };
  }

  // Detect injection attempts
  const injectionDetections = detectPromptInjection(input);
  if (injectionDetections.length > 0) {
    return {
      isValid: false,
      error: "Potential prompt injection detected. Please rephrase your instructions.",
      warnings: injectionDetections,
    };
  }

  // Remove suspicious characters
  let sanitized = removeSuspiciousChars(input);

  // Add safe prefix to separate user context from system instructions
  // This makes it clear to the AI that this is user-provided content
  sanitized = `USER CONTEXT: ${sanitized}`;

  if (sanitized !== input) {
    warnings.push("Input was cleaned (removed suspicious characters)");
  }

  return {
    isValid: true,
    sanitized,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Sanitize query field (all agents)
 *
 * Less strict than customInstructions, but still validates length and structure.
 */
export function sanitizeQuery(input: string): ValidationResult {
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      error: "Query cannot be empty",
    };
  }

  const warnings: string[] = [];

  // Check length
  if (input.length > LIMITS.QUERY_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Query too long (max ${LIMITS.QUERY_MAX_LENGTH} characters)`,
    };
  }

  // Detect obvious injection attempts (looser than customInstructions)
  const injectionDetections = detectPromptInjection(input);
  if (injectionDetections.length > 2) {
    // Only block if multiple patterns detected
    return {
      isValid: false,
      error: "Query contains suspicious patterns. Please rephrase.",
      warnings: injectionDetections,
    };
  }

  // Remove suspicious characters
  const sanitized = removeSuspiciousChars(input);

  if (sanitized !== input) {
    warnings.push("Query was cleaned (removed suspicious characters)");
  }

  return {
    isValid: true,
    sanitized,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Sanitize topic field (Research/Brainstorm agents)
 */
export function sanitizeTopic(input: string): ValidationResult {
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      error: "Topic cannot be empty",
    };
  }

  if (input.length > LIMITS.TOPIC_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Topic too long (max ${LIMITS.TOPIC_MAX_LENGTH} characters)`,
    };
  }

  const sanitized = removeSuspiciousChars(input);

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Sanitize article content (Analyze Agent)
 *
 * More lenient than other sanitizers since we're analyzing user's own content.
 * Still checks for malicious patterns but allows longer content.
 */
export function sanitizeArticle(input: string): ValidationResult {
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      error: "Article cannot be empty",
    };
  }

  const warnings: string[] = [];

  // Check length (50,000 characters = ~10,000 words)
  if (input.length > LIMITS.ARTICLE_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Article too long (max ${LIMITS.ARTICLE_MAX_LENGTH} characters, ~10,000 words)`,
    };
  }

  // Detect obvious injection attempts (very lenient for articles)
  const injectionDetections = detectPromptInjection(input);
  if (injectionDetections.length > 5) {
    // Only block if many patterns detected (articles may contain technical terms)
    return {
      isValid: false,
      error: "Article contains suspicious patterns. Please review your content.",
      warnings: injectionDetections,
    };
  }

  // Remove suspicious characters but preserve formatting
  const sanitized = removeSuspiciousChars(input);

  if (sanitized !== input) {
    warnings.push("Article was cleaned (removed suspicious characters)");
  }

  return {
    isValid: true,
    sanitized,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate history array (conversation history)
 *
 * Limits size and validates structure to prevent abuse.
 */
export function validateHistory(
  history: unknown
): Omit<ValidationResult, 'sanitized'> & { sanitized?: Array<{ role: string; content: string }> } {
  if (!history) {
    return { isValid: true, sanitized: [] as Array<{ role: string; content: string }> };
  }

  if (!Array.isArray(history)) {
    return {
      isValid: false,
      error: "History must be an array",
    };
  }

  // Limit array size
  if (history.length > LIMITS.HISTORY_MAX_MESSAGES) {
    return {
      isValid: false,
      error: `History too long (max ${LIMITS.HISTORY_MAX_MESSAGES} messages)`,
    };
  }

  // Validate each message structure
  const sanitized: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];

    if (typeof msg !== "object" || msg === null) {
      return {
        isValid: false,
        error: `Invalid message at index ${i}: must be an object`,
      };
    }

    const { role, content } = msg as { role?: unknown; content?: unknown };

    if (typeof role !== "string" || !["user", "model"].includes(role)) {
      return {
        isValid: false,
        error: `Invalid role at index ${i}: must be "user" or "model"`,
      };
    }

    if (typeof content !== "string") {
      return {
        isValid: false,
        error: `Invalid content at index ${i}: must be a string`,
      };
    }

    // NOTE: We don't validate content length for history messages because:
    // 1. User messages were already validated when first sent (as current query)
    // 2. Assistant responses are AI-generated (trusted source) and often exceed 1000 chars
    // 3. History is essential for conversation context
    // 4. We already limit total message count to prevent abuse (max 50 messages)

    sanitized.push({
      role,
      content: removeSuspiciousChars(content),
    });
  }

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Sanitize filename (file uploads)
 *
 * Prevents path traversal and limits length.
 */
export function sanitizeFilename(filename: string): ValidationResult {
  if (!filename || filename.trim().length === 0) {
    return {
      isValid: false,
      error: "Filename cannot be empty",
    };
  }

  if (filename.length > LIMITS.FILENAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Filename too long (max ${LIMITS.FILENAME_MAX_LENGTH} characters)`,
    };
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\.\//g, "").replace(/\.\.\\/g, "");

  // Remove leading/trailing dots and slashes
  sanitized = sanitized.replace(/^[./\\]+/, "").replace(/[./\\]+$/, "");

  // Remove control characters
  sanitized = removeSuspiciousChars(sanitized);

  if (!sanitized || sanitized.length === 0) {
    return {
      isValid: false,
      error: "Filename contains only invalid characters",
    };
  }

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Validate blob URL to prevent SSRF attacks
 *
 * Ensures URL is from expected Vercel Blob domain.
 */
export function validateBlobUrl(url: string): ValidationResult {
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      error: "Blob URL cannot be empty",
    };
  }

  try {
    const parsed = new URL(url);

    // Vercel Blob URLs should be HTTPS
    if (parsed.protocol !== "https:") {
      return {
        isValid: false,
        error: "Blob URL must use HTTPS protocol",
      };
    }

    // Vercel Blob domain pattern: *.public.blob.vercel-storage.com
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.endsWith(".public.blob.vercel-storage.com")) {
      return {
        isValid: false,
        error: "Blob URL must be from Vercel Blob storage",
      };
    }

    return {
      isValid: true,
      sanitized: url,
    };
  } catch (err) {
    return {
      isValid: false,
      error: "Invalid URL format",
    };
  }
}

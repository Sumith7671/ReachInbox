import { ParsedLeadsResult } from '../types';
import { logger } from '../utils/logger';

// Robust RFC 5322 compliant regex for extracting email addresses
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SINGLE_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const COMMON_EMAIL_HEADERS = new Set([
  'email',
  'e-mail',
  'email_address',
  'email address',
  'emailaddress',
  'recipient',
  'recipients',
  'contact',
  'mail',
  'user_email',
  'user email',
]);

export class LeadParserService {
  /**
   * Main entry point to parse lead content from CSV or TXT format.
   */
  public static parseLeads(content: string, filename?: string): ParsedLeadsResult {
    if (!content || typeof content !== 'string') {
      return {
        totalExtracted: 0,
        validEmails: [],
        duplicatesRemoved: 0,
        invalidRemoved: 0,
        count: 0,
      };
    }

    const isCsv = filename ? filename.toLowerCase().endsWith('.csv') : content.includes(',');

    let extractedCandidates: string[] = [];

    if (isCsv) {
      extractedCandidates = this.parseCsvCandidates(content);
    } else {
      extractedCandidates = this.parseTxtCandidates(content);
    }

    let totalExtractedCount = 0;
    let invalidCount = 0;
    const uniqueValidEmails = new Set<string>();
    const validEmailsList: string[] = [];

    for (const candidate of extractedCandidates) {
      const cleanCandidate = candidate.trim().replace(/^["']|["']$/g, '').toLowerCase();
      if (!cleanCandidate) continue;

      // Skip header keywords
      if (COMMON_EMAIL_HEADERS.has(cleanCandidate)) {
        continue;
      }

      // Extract all email patterns matching in this candidate token
      const matches = cleanCandidate.match(EMAIL_PATTERN);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const normalized = match.trim().toLowerCase();
          if (SINGLE_EMAIL_PATTERN.test(normalized)) {
            totalExtractedCount++;
            if (!uniqueValidEmails.has(normalized)) {
              uniqueValidEmails.add(normalized);
              validEmailsList.push(normalized);
            }
          }
        }
      } else {
        invalidCount++;
      }
    }

    const duplicatesRemovedCount = Math.max(0, totalExtractedCount - validEmailsList.length);

    logger.info(
      {
        filename,
        totalExtracted: totalExtractedCount,
        validUniqueCount: validEmailsList.length,
        duplicatesRemoved: duplicatesRemovedCount,
        invalidRemoved: invalidCount,
      },
      `[LEAD PARSER] Parsed ${validEmailsList.length} valid unique email addresses.`
    );

    return {
      totalExtracted: totalExtractedCount,
      validEmails: validEmailsList,
      duplicatesRemoved: duplicatesRemovedCount,
      invalidRemoved: invalidCount,
      count: validEmailsList.length,
    };
  }

  /**
   * Parse TXT content separated by newlines, spaces, tabs, commas, or semicolons.
   */
  private static parseTxtCandidates(content: string): string[] {
    return content.split(/[\r\n,;\t\s]+/);
  }

  /**
   * Parse CSV content with header inspection and row-column matrix scanning.
   */
  private static parseCsvCandidates(content: string): string[] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Parse header row
    const firstLineTokens = lines[0].split(/[,;\t]/).map((t) => t.trim().replace(/^["']|["']$/g, ''));
    let emailColumnIndex = -1;

    for (let i = 0; i < firstLineTokens.length; i++) {
      if (COMMON_EMAIL_HEADERS.has(firstLineTokens[i].toLowerCase())) {
        emailColumnIndex = i;
        break;
      }
    }

    const candidates: string[] = [];

    // If an explicit header column was found, pull from that column
    if (emailColumnIndex !== -1) {
      for (let r = 1; r < lines.length; r++) {
        const rowTokens = lines[r].split(/[,;\t]/).map((t) => t.trim().replace(/^["']|["']$/g, ''));
        if (rowTokens[emailColumnIndex]) {
          candidates.push(rowTokens[emailColumnIndex]);
        }
      }
    } else {
      // If no explicit header, scan all cell values in row matrix
      for (const line of lines) {
        const rowTokens = line.split(/[,;\t]/).map((t) => t.trim().replace(/^["']|["']$/g, ''));
        candidates.push(...rowTokens);
      }
    }

    return candidates;
  }
}

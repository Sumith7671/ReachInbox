import { LeadParserService } from '../services/leadParser.service';
import { ParsedLeadsResult } from '../types';

export function parseLeadContent(content: string, filename?: string): ParsedLeadsResult {
  return LeadParserService.parseLeads(content, filename);
}

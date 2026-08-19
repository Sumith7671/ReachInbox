import { LeadParserService } from '../services/leadParser.service';

describe('LeadParserService Comprehensive Unit Tests', () => {
  it('Test 1 — TXT: Should extract emails separated by newlines', () => {
    const txtContent = `test1@gmail.com
test2@gmail.com
test3@gmail.com`;

    const result = LeadParserService.parseLeads(txtContent, 'leads.txt');

    expect(result.count).toBe(3);
    expect(result.validEmails).toEqual(['test1@gmail.com', 'test2@gmail.com', 'test3@gmail.com']);
  });

  it('Test 2 — CSV: Should extract emails from CSV with email header', () => {
    const csvContent = `email
test1@gmail.com
test2@gmail.com
test3@gmail.com`;

    const result = LeadParserService.parseLeads(csvContent, 'leads.csv');

    expect(result.count).toBe(3);
    expect(result.validEmails).toEqual(['test1@gmail.com', 'test2@gmail.com', 'test3@gmail.com']);
  });

  it('Test 3 — CSV with names: Should extract email column from multi-column CSV', () => {
    const csvContent = `name,email
John,john@gmail.com
Alex,alex@gmail.com
Rahul,rahul@gmail.com`;

    const result = LeadParserService.parseLeads(csvContent, 'contacts.csv');

    expect(result.count).toBe(3);
    expect(result.validEmails).toEqual(['john@gmail.com', 'alex@gmail.com', 'rahul@gmail.com']);
  });

  it('Test 4 — Duplicates: Should remove case-insensitive duplicate emails', () => {
    const content = `john@gmail.com JOHN@gmail.com john@gmail.com alex@gmail.com`;

    const result = LeadParserService.parseLeads(content);

    expect(result.count).toBe(2);
    expect(result.validEmails).toEqual(['john@gmail.com', 'alex@gmail.com']);
    expect(result.duplicatesRemoved).toBe(2);
  });

  it('Test 5 — Invalid emails: Should filter invalid patterns while keeping valid ones', () => {
    const content = `john@gmail.com invalid-email alex@gmail.com not-an-email`;

    const result = LeadParserService.parseLeads(content);

    expect(result.count).toBe(2);
    expect(result.validEmails).toEqual(['john@gmail.com', 'alex@gmail.com']);
    expect(result.invalidRemoved).toBe(2);
  });

  it('Test 6 — Mixed TXT separators: Should handle commas, semicolons, and spaces', () => {
    const content = `john@gmail.com, alex@gmail.com; rahul@gmail.com`;

    const result = LeadParserService.parseLeads(content);

    expect(result.count).toBe(3);
    expect(result.validEmails).toEqual(['john@gmail.com', 'alex@gmail.com', 'rahul@gmail.com']);
  });

  it('Test 7 — 100 Recipients Bulk Test', () => {
    const emails = Array.from({ length: 100 }, (_, i) => `user${i + 1}@domain.com`);
    const content = emails.join('\n');

    const result = LeadParserService.parseLeads(content, 'bulk_100.txt');

    expect(result.count).toBe(100);
    expect(result.validEmails.length).toBe(100);
  });

  it('Test 8 — 1000 Recipients Bulk Test', () => {
    const emails = Array.from({ length: 1000 }, (_, i) => `lead${i + 1}@outreach.org`);
    const content = emails.join('\n');

    const result = LeadParserService.parseLeads(content, 'bulk_1000.txt');

    expect(result.count).toBe(1000);
    expect(result.validEmails.length).toBe(1000);
  });
});

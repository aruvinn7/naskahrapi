import { DocumentBlock, DocumentSection } from '../types/document';
import { stripInlineMarkdown } from './inlineFormat';

export type CitationStyle = 'apa7' | 'harvard' | 'ieee';

export interface CitationAnalysis {
  styleDetected: CitationStyle;
  totalEntries: number;
  inTextCitations: string[];
  isSortedAlphabetically: boolean;
  missingFromBibliography: string[];
}

export function sortBibliographyBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  // Sort items of type 'daftar_pustaka_item' or general bibliography paragraphs alphabetically
  const sorted = [...blocks].sort((a, b) => {
    // Strip leading numbering if any (e.g., [1], 1.)
    const cleanA = stripInlineMarkdown(a.formattedContent).replace(/^\[\d+\]\s*|^\d+\.\s*/, '').trim().toLowerCase();
    const cleanB = stripInlineMarkdown(b.formattedContent).replace(/^\[\d+\]\s*|^\d+\.\s*/, '').trim().toLowerCase();
    return cleanA.localeCompare(cleanB, 'id', { sensitivity: 'base' });
  });

  return sorted;
}

export function analyzeCitations(sections: DocumentSection[]): CitationAnalysis {
  const bibSection = sections.find(s => s.type === 'daftar_pustaka' || s.title.toUpperCase().includes('DAFTAR PUSTAKA'));
  const bibBlocks = bibSection ? bibSection.blocks.filter(b => b.type === 'daftar_pustaka_item' || b.type === 'paragraph') : [];

  // Extract in-text citations: (Author, Year) or [1]
  const inTextCitations: string[] = [];
  const authorYearRegex = /\(([A-Z][a-zA-Z\s&]+(?:et\s+al\.)?,\s*(?:19|20)\d{2}[a-z]?)\)/g;
  const ieeeRegex = /\[(\d+)\]/g;

  let ieeeCount = 0;
  let apaCount = 0;

  sections.forEach(sec => {
    if (sec.type === 'daftar_pustaka') return;
    sec.blocks.forEach(b => {
      let match;
      while ((match = authorYearRegex.exec(b.formattedContent)) !== null) {
        inTextCitations.push(match[1]);
        apaCount++;
      }
      while ((match = ieeeRegex.exec(b.formattedContent)) !== null) {
        inTextCitations.push(`[${match[1]}]`);
        ieeeCount++;
      }
    });
  });

  const styleDetected: CitationStyle = ieeeCount > apaCount ? 'ieee' : 'apa7';

  // Check if bibliography is sorted
  let isSortedAlphabetically = true;
  for (let i = 0; i < bibBlocks.length - 1; i++) {
    const a = stripInlineMarkdown(bibBlocks[i].formattedContent).trim().toLowerCase();
    const b = stripInlineMarkdown(bibBlocks[i + 1].formattedContent).trim().toLowerCase();
    if (a.localeCompare(b, 'id') > 0) {
      isSortedAlphabetically = false;
      break;
    }
  }

  // Cross-check missing
  const missingFromBibliography: string[] = [];
  if (bibBlocks.length > 0) {
    inTextCitations.forEach(citation => {
      const authorMatch = citation.split(',')[0].replace(/\s+et\s+al\./, '').trim();
      const exists = bibBlocks.some(b => stripInlineMarkdown(b.formattedContent).toLowerCase().includes(authorMatch.toLowerCase()));
      if (!exists && !missingFromBibliography.includes(citation)) {
        missingFromBibliography.push(citation);
      }
    });
  }

  return {
    styleDetected,
    totalEntries: bibBlocks.length,
    inTextCitations,
    isSortedAlphabetically,
    missingFromBibliography
  };
}

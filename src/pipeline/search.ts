import { search, SafeSearchType } from 'duck-duck-scrape';
import db from '../db/sqlite';

export async function performWebSearch(query: string): Promise<string> {
  try {
    const queryHash = Buffer.from(query).toString('base64');
    const cached = db.prepare('SELECT result, expiry FROM search_cache WHERE queryHash = ?').get(queryHash) as any;
    
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    console.log(`Searching the web for: ${query}`);
    const results = await search(query, { safeSearch: SafeSearchType.STRICT });
    
    const summary = results.results.slice(0, 3).map(r => `${r.title}: ${r.description}`).join('\n');
    
    db.prepare('INSERT OR REPLACE INTO search_cache (queryHash, result, expiry) VALUES (?, ?, ?)')
      .run(queryHash, summary, Date.now() + 60 * 60 * 1000);
      
    return summary;
  } catch (error) {
    console.error('Web search failed:', error);
    return 'No web search results available.';
  }
}

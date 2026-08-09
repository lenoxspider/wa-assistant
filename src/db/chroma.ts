import axios from 'axios';
import { embed } from '../pipeline/embedding';

const CHROMA_HOST = process.env.CHROMA_HOST || 'http://localhost:8000';

export async function getOrCreateCollection(name: string): Promise<string | null> {
  try {
    const res = await axios.get(`${CHROMA_HOST}/api/v1/collections`);
    const collections = res.data;
    let col = Array.isArray(collections) ? collections.find((c: any) => c.name === name) : null;
    
    if (!col) {
      const createRes = await axios.post(`${CHROMA_HOST}/api/v1/collections`, { name });
      col = createRes.data;
    }
    return col ? (col.id || col.name) : null;
  } catch (e: any) {
    return null;
  }
}

export async function initChroma() {
  await getOrCreateCollection('memories');
  await getOrCreateCollection('knowledge');
}

export async function upsertMemory(id: string, text: string, metadata: any) {
  try {
    const embedding = await embed(text);
    if (!embedding || embedding.length === 0) return;

    const collectionId = await getOrCreateCollection('memories');
    if (!collectionId) return;

    await axios.post(`${CHROMA_HOST}/api/v1/collections/${collectionId}/upsert`, {
      ids: [id],
      embeddings: [embedding],
      metadatas: [metadata],
      documents: [text]
    });
  } catch (e: any) {
    console.warn('Chroma memory upsert skipped (Chroma or embedding unavailable)');
  }
}

export async function queryMemory(queryText: string, nResults: number = 5) {
  try {
    const embedding = await embed(queryText);
    if (!embedding || embedding.length === 0) return null;

    const collectionId = await getOrCreateCollection('memories');
    if (!collectionId) return null;

    const response = await axios.post(`${CHROMA_HOST}/api/v1/collections/${collectionId}/query`, {
      query_embeddings: [embedding],
      n_results: nResults
    });

    return response.data;
  } catch (e: any) {
    console.warn('Chroma memory query skipped (Chroma or embedding unavailable)');
    return null;
  }
}

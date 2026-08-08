import axios from 'axios';
import { embed } from '../pipeline/embedding';

const CHROMA_HOST = process.env.CHROMA_HOST || 'http://localhost:8000';

export async function initChroma() {
  try {
    await axios.post(`${CHROMA_HOST}/api/v1/collections`, { name: 'memories' });
  } catch(e) {}
  try {
    await axios.post(`${CHROMA_HOST}/api/v1/collections`, { name: 'knowledge' });
  } catch(e) {}
}

export async function upsertMemory(id: string, text: string, metadata: any) {
  try {
    const embedding = await embed(text);
    if (!embedding || embedding.length === 0) return;

    const collRes = await axios.get(`${CHROMA_HOST}/api/v1/collections/memories`);
    const collectionId = collRes.data.id;

    await axios.post(`${CHROMA_HOST}/api/v1/collections/${collectionId}/upsert`, {
      ids: [id],
      embeddings: [embedding],
      metadatas: [metadata],
      documents: [text]
    });
  } catch (e) {
    console.error('Chroma upsert failed:', e);
  }
}

export async function queryMemory(queryText: string, nResults: number = 5) {
  try {
    const embedding = await embed(queryText);
    if (!embedding || embedding.length === 0) return null;

    const collRes = await axios.get(`${CHROMA_HOST}/api/v1/collections/memories`);
    const collectionId = collRes.data.id;

    const response = await axios.post(`${CHROMA_HOST}/api/v1/collections/${collectionId}/query`, {
      query_embeddings: [embedding],
      n_results: nResults
    });

    return response.data;
  } catch (e) {
    console.error('Chroma query failed:', e);
    return null;
  }
}

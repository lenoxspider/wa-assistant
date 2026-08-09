import db from '../db/sqlite';
import { embed as embedText } from './embedding';
import axios from 'axios';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

async function getOrCreateKBCollection() {
  try {
    const res = await axios.get(`${CHROMA_URL}/api/v1/collections`);
    const collections = res.data;
    let kbCol = collections.find((c: any) => c.name === 'wa_knowledge');
    
    if (!kbCol) {
      const createRes = await axios.post(`${CHROMA_URL}/api/v1/collections`, {
        name: 'wa_knowledge',
        metadata: { "hnsw:space": "cosine" }
      });
      kbCol = createRes.data;
    }
    return kbCol.id;
  } catch(e) {
    return null;
  }
}

export async function addKnowledge(content: string, category: string) {
  const embedding = await embedText(content);
  if (!embedding) return;
  
  const id = Date.now().toString();
  const colId = await getOrCreateKBCollection();
  if (!colId) return;
  
  await axios.post(`${CHROMA_URL}/api/v1/collections/${colId}/add`, {
    ids: [id],
    embeddings: [embedding],
    documents: [content],
    metadatas: [{ category }]
  });
  
  db.prepare('INSERT INTO knowledgebase (content, embeddingId, category) VALUES (?, ?, ?)').run(content, id, category);
}

export async function queryKnowledge(text: string, nResults: number = 2) {
  const embedding = await embedText(text);
  if (!embedding) return null;
  
  const colId = await getOrCreateKBCollection();
  if (!colId) return null;
  
  try {
    const res = await axios.post(`${CHROMA_URL}/api/v1/collections/${colId}/query`, {
      query_embeddings: [embedding],
      n_results: nResults
    });
    return res.data;
  } catch (e) {
    return null;
  }
}

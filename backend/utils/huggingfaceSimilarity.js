const axios = require('axios');
require('dotenv').config();

class HuggingFaceSimilarityService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.apiUrl = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
  }

  // Get embeddings from Hugging Face Inference API
  async getEmbeddings(text) {
    const response = await axios.post(
      this.apiUrl,
      { inputs: [text] }, // Send as array
      {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      }
    );
    // The API returns an array of arrays, so return the first embedding
    return response.data[0];
  }

  // Cosine similarity between two vectors
  cosineSimilarity(vec1, vec2) {
    let dot = 0.0, normA = 0.0, normB = 0.0;
    for (let i = 0; i < vec1.length; i++) {
      dot += vec1[i] * vec2[i];
      normA += vec1[i] * vec1[i];
      normB += vec2[i] * vec2[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Main similarity function
  async calculateSemanticSimilarity(doc1, doc2) {
    try {
      const emb1 = await this.getEmbeddings(doc1);
      const emb2 = await this.getEmbeddings(doc2);
      const score = this.cosineSimilarity(emb1, emb2);
      return {
        score,
        details: {
          method: 'HuggingFace MiniLM-L6-v2',
        }
      };
    } catch (error) {
      console.error('HuggingFace similarity error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = HuggingFaceSimilarityService; 
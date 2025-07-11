const { pipeline } = require('@xenova/transformers');
require('dotenv').config();

class LocalSimilarityService {
  constructor() {
    this.extractor = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
  }

  // Initialize the model (lazy loading)
  async initialize() {
    if (!this.extractor) {
      console.log('Loading local embedding model...');
      this.extractor = await pipeline('feature-extraction', this.modelName);
      console.log('Local embedding model loaded successfully!');
    }
  }

  // Get embeddings using local model
  async getEmbeddings(text) {
    await this.initialize();
    
    // The pipeline returns a tensor, we need to convert it to a regular array
    const output = await this.extractor(text);
    const embedding = Array.from(output.data);
    
    return embedding;
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
      console.log('Computing embeddings locally...');
      const emb1 = await this.getEmbeddings(doc1);
      const emb2 = await this.getEmbeddings(doc2);
      
      const score = this.cosineSimilarity(emb1, emb2);
      return {
        score,
        details: {
          method: 'Local MiniLM-L6-v2 (transformers.js)',
          embedding_size: emb1.length,
          model: this.modelName
        }
      };
    } catch (error) {
      console.error('Local similarity error:', error.message);
      throw error;
    }
  }
}

module.exports = LocalSimilarityService; 
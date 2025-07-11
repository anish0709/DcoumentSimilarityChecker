const { pipeline } = require('@xenova/transformers');
require('dotenv').config();

class LocalSemanticSimilarityService {
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
      
      // Test the model with a simple input to verify it works
      try {
        const testOutput = await this.extractor('test');
        const testEmbedding = Array.from(testOutput.data);
        console.log(`Model test successful. Embedding dimension: ${testEmbedding.length}`);
      } catch (error) {
        console.error('Model test failed:', error);
      }
    }
  }

  // Split text into chunks for better processing (same as OpenAI version)
  splitText(text, chunkSize = 1000, chunkOverlap = 200) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  // Get embeddings using local model
  async getEmbeddings(text) {
    await this.initialize();
    try {
      // Truncate to 256 words or 1000 characters
      const safeText = text.split(/\s+/).slice(0, 256).join(' ').slice(0, 1000);
      const output = await this.extractor(safeText);
      const tensor = output.data;
      if (!tensor || tensor.length === 0) throw new Error('Empty embedding returned from model');
      const embedding = tensor[0].map((_, i) =>
        tensor.map(row => row[i]).reduce((a, b) => a + b, 0) / tensor.length
      );
      return embedding;
    } catch (error) {
      console.error('Error getting embeddings for text:', text.substring(0, 100) + '...', error.message);
      throw error;
    }
  }

  // Create embeddings for text chunks (same interface as OpenAI version)
  async createEmbeddings(textChunks) {
    const embeddings = [];
    for (const chunk of textChunks) {
      try {
        const embedding = await this.getEmbeddings(chunk);
        embeddings.push(embedding);
      } catch (error) {
        console.error('Error creating embedding for chunk:', chunk.substring(0, 100) + '...');
        // Return a zero vector of expected length if embedding fails
        const fallbackEmbedding = new Array(384).fill(0); // MiniLM-L6-v2 has 384 dimensions
        embeddings.push(fallbackEmbedding);
      }
    }
    return embeddings;
  }

  // Calculate cosine similarity between two vectors (same as OpenAI version)
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2) {
      console.warn('One or both vectors are null/undefined');
      return 0;
    }
    
    if (vec1.length !== vec2.length) {
      console.error(`Vector length mismatch: vec1=${vec1.length}, vec2=${vec2.length}`);
      // Pad the shorter vector with zeros to match the longer one
      const maxLength = Math.max(vec1.length, vec2.length);
      const paddedVec1 = [...vec1, ...new Array(maxLength - vec1.length).fill(0)];
      const paddedVec2 = [...vec2, ...new Array(maxLength - vec2.length).fill(0)];
      
      console.log(`Padded vectors to length: ${maxLength}`);
      return this.cosineSimilarity(paddedVec1, paddedVec2);
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  // Calculate semantic similarity using embeddings (same interface as OpenAI version)
  async calculateSemanticSimilarity(doc1, doc2) {
    try {
      console.log('Computing semantic similarity locally...');
      
      // Split documents into chunks
      const chunks1 = this.splitText(doc1);
      const chunks2 = this.splitText(doc2);
      
      console.log(`Created ${chunks1.length} chunks for doc1, ${chunks2.length} chunks for doc2`);
      
      // Create embeddings for all chunks
      const embeddings1 = await this.createEmbeddings(chunks1);
      const embeddings2 = await this.createEmbeddings(chunks2);
      
      console.log(`Created embeddings: doc1=${embeddings1.length} vectors, doc2=${embeddings2.length} vectors`);
      if (embeddings1.length > 0 && embeddings2.length > 0) {
        console.log(`Embedding dimensions: doc1=${embeddings1[0].length}, doc2=${embeddings2[0].length}`);
      }
      
      // Calculate average similarity between all chunk pairs
      let totalSimilarity = 0;
      let pairCount = 0;
      
      for (const emb1 of embeddings1) {
        for (const emb2 of embeddings2) {
          const similarity = this.cosineSimilarity(emb1, emb2);
          totalSimilarity += similarity;
          pairCount++;
        }
      }
      
      const averageSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;
      
      return {
        score: averageSimilarity,
        details: {
          method: 'Local Semantic (transformers.js)',
          model: this.modelName,
          doc1Chunks: chunks1.length,
          doc2Chunks: chunks2.length,
          totalComparisons: pairCount,
          chunkSize: 1000,
          chunkOverlap: 200,
          embedding_size: embeddings1[0]?.length || 0
        }
      };
    } catch (error) {
      console.error('Error calculating local semantic similarity:', error);
      throw error;
    }
  }

  // Simple vector similarity search (local replacement for FAISS)
  async similaritySearch(queryEmbedding, documentEmbeddings, documentChunks, topK = 3) {
    const similarities = documentEmbeddings.map((embedding, index) => ({
      content: documentChunks[index],
      score: this.cosineSimilarity(queryEmbedding, embedding),
      index: index
    }));
    
    // Sort by similarity score (descending) and return top K
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // RAG-based similarity analysis using local embeddings (same interface as OpenAI version)
  async calculateRAGSimilarity(doc1, doc2) {
    try {
      console.log('Computing RAG similarity locally...');
      
      // Split documents
      const chunks1 = this.splitText(doc1);
      const chunks2 = this.splitText(doc2);
      
      // Create embeddings for all chunks
      const embeddings1 = await this.createEmbeddings(chunks1);
      const embeddings2 = await this.createEmbeddings(chunks2);
      
      // Search for similar chunks from doc2 in doc1
      const results = [];
      for (let i = 0; i < chunks2.length; i++) {
        const queryChunk = chunks2[i];
        const queryEmbedding = embeddings2[i];
        
        const similarDocs = await this.similaritySearch(
          queryEmbedding, 
          embeddings1, 
          chunks1, 
          3
        );
        
        results.push({
          queryChunk: queryChunk,
          similarDocs: similarDocs.map(doc => ({
            content: doc.content,
            score: doc.score
          }))
        });
      }
      
      // Calculate average similarity score
      const scores = results.flatMap(result => 
        result.similarDocs.map(doc => doc.score)
      );
      const averageScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;
      
      return {
        score: averageScore,
        details: {
          method: 'Local RAG (transformers.js)',
          model: this.modelName,
          doc1Chunks: chunks1.length,
          doc2Chunks: chunks2.length,
          retrievedResults: results.length,
          averageRetrievalScore: averageScore,
          embedding_size: embeddings1[0]?.length || 0
        },
        retrievalResults: results
      };
    } catch (error) {
      console.error('Error calculating local RAG similarity:', error);
      throw error;
    }
  }

  // Simple LLM-like analysis using local embeddings (replacement for OpenAI LLM)
  async calculateLLMSimilarity(doc1, doc2) {
    try {
      console.log('Computing LLM-like similarity locally...');
      
      // Split documents
      const chunks1 = this.splitText(doc1);
      const chunks2 = this.splitText(doc2);
      
      // Create embeddings for all chunks
      const embeddings1 = await this.createEmbeddings(chunks1);
      const embeddings2 = await this.createEmbeddings(chunks2);
      
      // Calculate overall document embeddings (average of all chunks)
      const doc1Embedding = this.averageEmbeddings(embeddings1);
      const doc2Embedding = this.averageEmbeddings(embeddings2);
      
      // Calculate similarity
      const similarity = this.cosineSimilarity(doc1Embedding, doc2Embedding);
      
      // Simple analysis based on similarity score
      let reasoning = '';
      let keySimilarities = [];
      let keyDifferences = [];
      
      if (similarity > 0.8) {
        reasoning = 'Documents are highly similar in content and meaning';
        keySimilarities = ['High semantic overlap', 'Similar topics', 'Related concepts'];
        keyDifferences = ['Minor variations in expression'];
      } else if (similarity > 0.6) {
        reasoning = 'Documents have moderate similarity with some shared concepts';
        keySimilarities = ['Some shared topics', 'Partial conceptual overlap'];
        keyDifferences = ['Different focus areas', 'Varying depth of coverage'];
      } else if (similarity > 0.4) {
        reasoning = 'Documents have low similarity with minimal shared content';
        keySimilarities = ['Limited shared concepts'];
        keyDifferences = ['Different topics', 'Distinct content focus'];
      } else {
        reasoning = 'Documents are largely dissimilar with minimal overlap';
        keySimilarities = ['Very limited shared content'];
        keyDifferences = ['Different subject matter', 'Unrelated topics'];
      }
      
      return {
        score: similarity,
        details: {
          reasoning: reasoning,
          keySimilarities: keySimilarities,
          keyDifferences: keyDifferences,
          method: 'Local LLM-like Analysis (transformers.js)',
          model: this.modelName,
          doc1Chunks: chunks1.length,
          doc2Chunks: chunks2.length,
          embedding_size: doc1Embedding.length
        }
      };
    } catch (error) {
      console.error('Error calculating local LLM similarity:', error);
      throw error;
    }
  }

  // Helper function to average multiple embeddings
  averageEmbeddings(embeddings) {
    if (embeddings.length === 0) return [];
    
    // Find the maximum length among all embeddings
    const maxLength = Math.max(...embeddings.map(emb => emb.length));
    
    // Pad all embeddings to the same length
    const paddedEmbeddings = embeddings.map(embedding => {
      if (embedding.length < maxLength) {
        return [...embedding, ...new Array(maxLength - embedding.length).fill(0)];
      }
      return embedding;
    });
    
    const avgEmbedding = new Array(maxLength).fill(0);
    for (const embedding of paddedEmbeddings) {
      for (let i = 0; i < embedding.length; i++) {
        avgEmbedding[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < avgEmbedding.length; i++) {
      avgEmbedding[i] /= paddedEmbeddings.length;
    }
    
    return avgEmbedding;
  }

  // Combined semantic similarity using all local methods (same interface as OpenAI version)
  async calculateCombinedSimilarity(doc1, doc2) {
    try {
      const [embeddingResult, ragResult, llmResult] = await Promise.all([
        this.calculateSemanticSimilarity(doc1, doc2),
        this.calculateRAGSimilarity(doc1, doc2),
        this.calculateLLMSimilarity(doc1, doc2)
      ]);

      // Weighted average of all methods
      const weights = { embedding: 0.4, rag: 0.3, llm: 0.3 };
      const combinedScore = 
        embeddingResult.score * weights.embedding +
        ragResult.score * weights.rag +
        llmResult.score * weights.llm;

      return {
        score: combinedScore,
        algorithmName: 'Local Semantic Similarity (Embeddings + RAG + LLM-like)',
        details: {
          embeddingScore: embeddingResult.score,
          ragScore: ragResult.score,
          llmScore: llmResult.score,
          weights: weights,
          embeddingDetails: embeddingResult.details,
          ragDetails: ragResult.details,
          llmDetails: llmResult.details,
          method: 'Local Combined Analysis (transformers.js)',
          model: this.modelName
        }
      };
    } catch (error) {
      console.error('Error calculating combined local similarity:', error);
      throw error;
    }
  }
}

module.exports = LocalSemanticSimilarityService; 
const OpenAI = require('openai');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { ChatOpenAI } = require('@langchain/openai');
const { FaissStore } = require('langchain/vectorstores/faiss');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PromptTemplate } = require('langchain/prompts');
const { LLMChain } = require('langchain/chains');
require('dotenv').config();

class SemanticSimilarityService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
    });
  }

  // Split text into chunks for better processing
  async splitText(text, chunkSize = 1000, chunkOverlap = 200) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
    return await splitter.splitText(text);
  }

  // Create embeddings for text chunks
  async createEmbeddings(textChunks) {
    return await this.embeddings.embedDocuments(textChunks);
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
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

  // Calculate semantic similarity using embeddings
  async calculateSemanticSimilarity(doc1, doc2) {
    try {
      // Split documents into chunks
      const chunks1 = await this.splitText(doc1);
      const chunks2 = await this.splitText(doc2);
      
      // Create embeddings for all chunks
      const embeddings1 = await this.createEmbeddings(chunks1);
      const embeddings2 = await this.createEmbeddings(chunks2);
      
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
          doc1Chunks: chunks1.length,
          doc2Chunks: chunks2.length,
          totalComparisons: pairCount,
          chunkSize: 1000,
          chunkOverlap: 200
        }
      };
    } catch (error) {
      console.error('Error calculating semantic similarity:', error);
      throw error;
    }
  }

  // RAG-based similarity analysis using FAISS
  async calculateRAGSimilarity(doc1, doc2) {
    try {
      // Split documents
      const chunks1 = await this.splitText(doc1);
      const chunks2 = await this.splitText(doc2);
      
      // Create FAISS vector store with doc1 chunks
      const vectorStore = await FaissStore.fromTexts(
        chunks1,
        chunks1.map((_, i) => ({ id: i, source: 'doc1' })),
        this.embeddings
      );
      
      // Search for similar chunks from doc2 in doc1
      const results = [];
      for (const chunk of chunks2) {
        const similarDocs = await vectorStore.similaritySearch(chunk, 3);
        results.push({
          queryChunk: chunk,
          similarDocs: similarDocs.map(doc => ({
            content: doc.pageContent,
            score: doc.score || 0
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
          doc1Chunks: chunks1.length,
          doc2Chunks: chunks2.length,
          retrievedResults: results.length,
          averageRetrievalScore: averageScore
        },
        retrievalResults: results
      };
    } catch (error) {
      console.error('Error calculating RAG similarity:', error);
      throw error;
    }
  }

  // LLM-based similarity analysis
  async calculateLLMSimilarity(doc1, doc2) {
    try {
      const promptTemplate = new PromptTemplate({
        inputVariables: ['doc1', 'doc2'],
        template: `
        Analyze the semantic similarity between these two documents and provide a similarity score between 0 and 1.
        
        Document 1:
        {doc1}
        
        Document 2:
        {doc2}
        
        Consider the following aspects:
        1. Topic similarity
        2. Conceptual overlap
        3. Semantic meaning
        4. Contextual relevance
        
        Provide your response in this exact JSON format:
        {{
          "similarity_score": <number between 0 and 1>,
          "reasoning": "<brief explanation of your assessment>",
          "key_similarities": ["<list of main similarities>"],
          "key_differences": ["<list of main differences>"]
        }}
        
        Only return the JSON, no additional text.
        `
      });

      const chain = new LLMChain({
        llm: this.llm,
        prompt: promptTemplate,
      });

      const response = await chain.call({
        doc1: doc1.substring(0, 2000), // Limit length for API
        doc2: doc2.substring(0, 2000),
      });

      try {
        const result = JSON.parse(response.text);
        return {
          score: result.similarity_score,
          details: {
            reasoning: result.reasoning,
            keySimilarities: result.key_similarities,
            keyDifferences: result.key_differences,
            method: 'LLM Analysis'
          }
        };
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        return {
          score: 0.5,
          details: {
            reasoning: 'Error parsing LLM response',
            method: 'LLM Analysis (Error)'
          }
        };
      }
    } catch (error) {
      console.error('Error calculating LLM similarity:', error);
      throw error;
    }
  }

  // Combined semantic similarity using all methods
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
        algorithmName: 'Semantic Similarity (Embeddings + FAISS + LLM)',
        details: {
          embeddingScore: embeddingResult.score,
          ragScore: ragResult.score,
          llmScore: llmResult.score,
          weights: weights,
          embeddingDetails: embeddingResult.details,
          ragDetails: ragResult.details,
          llmDetails: llmResult.details
        }
      };
    } catch (error) {
      console.error('Error calculating combined similarity:', error);
      throw error;
    }
  }
}

module.exports = SemanticSimilarityService; 
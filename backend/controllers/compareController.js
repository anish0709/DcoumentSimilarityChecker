const { jaccardSimilarity, cosineSimilarity, ngramSimilarity, tokenize } = require('../utils/similarity');
const SemanticSimilarityService = require('../utils/semanticSimilarity');
const HuggingFaceSimilarityService = require('../utils/huggingfaceSimilarity');
const { bedrockSemanticSimilarity } = require('../utils/bedrockSimilarity');
const LocalSemanticSimilarityService = require('../utils/localSemanticSimilarity');

// Initialize services
const semanticService = new SemanticSimilarityService();
const hfService = new HuggingFaceSimilarityService();
const localService = new LocalSemanticSimilarityService();

// Compare documents from JSON body
exports.compareDocuments = async (req, res) => {
  try {
    const { doc1, doc2, algorithm = 'jaccard' } = req.body;
    if (!doc1 || !doc2) {
      return res.status(400).json({ error: 'Both documents required' });
    }

    // Check if semantic algorithm is requested
    if (algorithm.startsWith('semantic')) {
      const result = await compareSemantic(doc1, doc2, algorithm);
      return res.json(result);
    }

    // Use traditional text-based methods
    const { score, algorithmName, details } = compare(doc1, doc2, algorithm);
    res.json({ similarity: score, algorithm: algorithmName, details });
  } catch (error) {
    console.error('Error in compareDocuments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Compare uploaded files
exports.compareFiles = async (req, res) => {
  try {
    const file1 = req.files && req.files.file1 && req.files.file1[0];
    const file2 = req.files && req.files.file2 && req.files.file2[0];
    const algorithm = req.body.algorithm || 'jaccard';
    
    if (!file1 || !file2) {
      return res.status(400).json({ error: 'Both files required' });
    }
    
    const doc1 = file1.buffer.toString('utf-8');
    const doc2 = file2.buffer.toString('utf-8');

    // Check if semantic algorithm is requested
    if (algorithm.startsWith('semantic')) {
      const result = await compareSemantic(doc1, doc2, algorithm);
      return res.json(result);
    }

    // Use traditional text-based methods
    const { score, algorithmName, details } = compare(doc1, doc2, algorithm);
    res.json({ similarity: score, algorithm: algorithmName, details });
  } catch (error) {
    console.error('Error in compareFiles:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Get available algorithms
exports.getAlgorithms = (req, res) => {
  res.json({
    algorithms: [
      { id: 'jaccard', name: 'Jaccard Similarity', description: 'Set-based similarity using word overlap' },
      { id: 'cosine', name: 'Cosine Similarity (TF-IDF)', description: 'Vector-based similarity using term frequency' },
      { id: 'ngram', name: 'N-gram Similarity', description: 'Phrase-based similarity using 3-word sequences' },
      { id: 'semantic', name: 'Semantic Similarity (Combined)', description: 'AI-powered similarity using embeddings, FAISS, and LLM analysis' },
      { id: 'semantic-embedding', name: 'Semantic Embedding Similarity', description: 'Similarity using OpenAI embeddings only' },
      { id: 'semantic-rag', name: 'Semantic RAG Similarity', description: 'Similarity using FAISS vector search and retrieval' },
      { id: 'semantic-llm', name: 'Semantic LLM Similarity', description: 'Similarity using LLM analysis and reasoning' },
      { id: 'semantic-hf', name: 'Semantic Similarity (Hugging Face)', description: 'Similarity using Hugging Face MiniLM-L6-v2 embeddings' },
      { id: 'semantic-bedrock', name: 'Semantic Similarity (Amazon Bedrock)', description: 'Similarity using Amazon Bedrock Titan Embeddings' },
      { id: 'semantic-local', name: 'Semantic Similarity (Local)', description: 'Similarity using local MiniLM-L6-v2 model (no API calls, no cost)' },
      { id: 'semantic-local-embedding', name: 'Semantic Embedding Similarity (Local)', description: 'Local embeddings-based similarity (no API calls, no cost)' },
      { id: 'semantic-local-rag', name: 'Semantic RAG Similarity (Local)', description: 'RAG-based similarity using local embeddings and vector search (no API calls, no cost)' },
      { id: 'semantic-local-llm', name: 'Semantic LLM Similarity (Local)', description: 'LLM-like analysis using local embeddings (no API calls, no cost)' },
      { id: 'semantic-local-combined', name: 'Semantic Combined Similarity (Local)', description: 'Combined local analysis using embeddings, RAG, and LLM-like methods (no API calls, no cost)' }
    ]
  });
};

// Core comparison logic for traditional methods
function compare(doc1, doc2, algorithm) {
  let score;
  let algorithmName;
  switch (algorithm.toLowerCase()) {
    case 'cosine':
      score = cosineSimilarity(doc1, doc2);
      algorithmName = 'Cosine Similarity (TF-IDF)';
      break;
    case 'ngram':
      score = ngramSimilarity(doc1, doc2);
      algorithmName = 'N-gram Similarity';
      break;
    case 'jaccard':
    default:
      score = jaccardSimilarity(doc1, doc2);
      algorithmName = 'Jaccard Similarity';
      break;
  }
  return {
    score,
    algorithmName,
    details: {
      doc1Words: tokenize(doc1).length,
      doc2Words: tokenize(doc2).length
    }
  };
}

// Semantic comparison logic
async function compareSemantic(doc1, doc2, algorithm) {
  try {
    switch (algorithm.toLowerCase()) {
      case 'semantic-hf':
        const hfResult = await hfService.calculateSemanticSimilarity(doc1, doc2);
        return {
          similarity: hfResult.score,
          algorithm: 'Semantic Similarity (Hugging Face)',
          details: hfResult.details
        };
      case 'semantic-embedding':
        const embeddingResult = await semanticService.calculateSemanticSimilarity(doc1, doc2);
        return {
          similarity: embeddingResult.score,
          algorithm: 'Semantic Embedding Similarity',
          details: embeddingResult.details
        };
      
      case 'semantic-rag':
        const ragResult = await semanticService.calculateRAGSimilarity(doc1, doc2);
        return {
          similarity: ragResult.score,
          algorithm: 'Semantic RAG Similarity',
          details: ragResult.details
        };
      
      case 'semantic-llm':
        const llmResult = await semanticService.calculateLLMSimilarity(doc1, doc2);
        return {
          similarity: llmResult.score,
          algorithm: 'Semantic LLM Similarity',
          details: llmResult.details
        };
      
      case 'semantic-bedrock':
        const bedrockScore = await bedrockSemanticSimilarity(doc1, doc2);
        return {
          similarity: bedrockScore,
          algorithm: 'Semantic Similarity (Amazon Bedrock)',
          details: { method: 'Amazon Bedrock Titan Embeddings' }
        };
      
      case 'semantic-local':
        const localResult = await localService.calculateSemanticSimilarity(doc1, doc2);
        return {
          similarity: localResult.score,
          algorithm: 'Semantic Similarity (Local)',
          details: localResult.details
        };
      
      case 'semantic-local-embedding':
        const localEmbeddingResult = await localService.calculateSemanticSimilarity(doc1, doc2);
        return {
          similarity: localEmbeddingResult.score,
          algorithm: 'Semantic Embedding Similarity (Local)',
          details: localEmbeddingResult.details
        };
      
      case 'semantic-local-rag':
        const localRAGResult = await localService.calculateRAGSimilarity(doc1, doc2);
        return {
          similarity: localRAGResult.score,
          algorithm: 'Semantic RAG Similarity (Local)',
          details: localRAGResult.details
        };
      
      case 'semantic-local-llm':
        const localLLMResult = await localService.calculateLLMSimilarity(doc1, doc2);
        return {
          similarity: localLLMResult.score,
          algorithm: 'Semantic LLM Similarity (Local)',
          details: localLLMResult.details
        };
      
      case 'semantic-local-combined':
        const localCombinedResult = await localService.calculateCombinedSimilarity(doc1, doc2);
        return {
          similarity: localCombinedResult.score,
          algorithm: localCombinedResult.algorithmName,
          details: localCombinedResult.details
        };
      
      case 'semantic':
      default:
        const combinedResult = await semanticService.calculateCombinedSimilarity(doc1, doc2);
        return {
          similarity: combinedResult.score,
          algorithm: combinedResult.algorithmName,
          details: combinedResult.details
        };
    }
  } catch (error) {
    console.error('Error in semantic comparison:', error);
    throw error;
  }
} 
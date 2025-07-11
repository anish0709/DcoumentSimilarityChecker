// Helper function to compute cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
  let dot = 0.0, normA = 0.0, normB = 0.0;
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i];
    normA += vec1[i] * vec1[i];
    normB += vec2[i] * vec2[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Amazon Bedrock embedding fetcher
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

async function getBedrockEmbedding(text, client, modelId) {
  const input = {
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({ inputText: text })
  };
  const command = new InvokeModelCommand(input);
  const response = await client.send(command);
  const responseBody = JSON.parse(Buffer.from(response.body).toString());
  return responseBody.embedding;
}

// Main semantic similarity function
async function bedrockSemanticSimilarity(text1, text2, options = {}) {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const modelId = options.modelId || "amazon.titan-embed-text-v1";
  const client = new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });
  const emb1 = await getBedrockEmbedding(text1, client, modelId);
  const emb2 = await getBedrockEmbedding(text2, client, modelId);
  const score = cosineSimilarity(emb1, emb2);
  return score;
}

module.exports = {
  cosineSimilarity,
  bedrockSemanticSimilarity
}; 
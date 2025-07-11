// Helper function to tokenize text
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

// Jaccard similarity function
function jaccardSimilarity(text1, text2) {
  const set1 = new Set(tokenize(text1));
  const set2 = new Set(tokenize(text2));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// Cosine Similarity (TF-IDF) function
function cosineSimilarity(text1, text2) {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  const freq1 = {};
  const freq2 = {};
  tokens1.forEach(word => { freq1[word] = (freq1[word] || 0) + 1; });
  tokens2.forEach(word => { freq2[word] = (freq2[word] || 0) + 1; });
  const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
  const vector1 = [];
  const vector2 = [];
  allWords.forEach(word => {
    const tf1 = (freq1[word] || 0) / tokens1.length;
    const tf2 = (freq2[word] || 0) / tokens2.length;
    const docFreq = (freq1[word] ? 1 : 0) + (freq2[word] ? 1 : 0);
    const idf = Math.log(2 / (docFreq + 1)) + 1;
    vector1.push(tf1 * idf);
    vector2.push(tf2 * idf);
  });
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

// N-gram similarity function
function ngramSimilarity(text1, text2, n = 3) {
  const createNGrams = (text) => {
    const tokens = tokenize(text);
    const ngrams = new Set();
    for (let i = 0; i <= tokens.length - n; i++) {
      const ngram = tokens.slice(i, i + n).join(' ');
      ngrams.add(ngram);
    }
    return ngrams;
  };
  const ngrams1 = createNGrams(text1);
  const ngrams2 = createNGrams(text2);
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

module.exports = {
  tokenize,
  jaccardSimilarity,
  cosineSimilarity,
  ngramSimilarity
}; 
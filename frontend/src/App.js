import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';

function App() {
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [similarity, setSimilarity] = useState(null);
  const [error, setError] = useState('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('jaccard');
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlgorithms();
  }, []);

  const fetchAlgorithms = async () => {
    try {
      const res = await fetch('https://dcoumentsimilaritychecker.onrender.com/api/algorithms');
      const data = await res.json();
      setAlgorithms(data.algorithms);
    } catch (err) {
      console.error('Could not fetch algorithms');
    }
  };

  const handleCompare = async () => {
    setError('');
    setSimilarity(null);
    setLoading(true);
    try {
      const res = await fetch('https://dcoumentsimilaritychecker.onrender.com/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          doc1, 
          doc2, 
          algorithm: selectedAlgorithm 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimilarity(data);
      } else {
        setError(data.error || 'Error comparing documents');
      }
    } catch (err) {
      setError('Could not connect to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
      <h2>Document Similarity Checker</h2>
      {/* Algorithm Selection for text input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 5 }}>
          <strong>Select Algorithm:</strong>
        </label>
        <select 
          value={selectedAlgorithm} 
          onChange={(e) => setSelectedAlgorithm(e.target.value)}
          style={{ padding: '8px', fontSize: 16, width: '100%', marginBottom: 10 }}
        >
          {algorithms.map(alg => (
            <option key={alg.id} value={alg.id}>
              {alg.name}
            </option>
          ))}
        </select>
        {algorithms.find(alg => alg.id === selectedAlgorithm) && (
          <div style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>
            {algorithms.find(alg => alg.id === selectedAlgorithm).description}
          </div>
        )}
      </div>
      {/* Document Input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 5 }}>
          <strong>Document 1:</strong>
        </label>
        <textarea
          rows={6}
          value={doc1}
          onChange={e => setDoc1(e.target.value)}
          placeholder="Paste first document here"
          style={{ width: '100%', marginBottom: 10, padding: 10 }}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 5 }}>
          <strong>Document 2:</strong>
        </label>
        <textarea
          rows={6}
          value={doc2}
          onChange={e => setDoc2(e.target.value)}
          placeholder="Paste second document here"
          style={{ width: '100%', marginBottom: 10, padding: 10 }}
        />
      </div>
      {/* Compare Button */}
      <button 
        onClick={handleCompare} 
        disabled={loading || !doc1.trim() || !doc2.trim()}
        style={{ 
          padding: '12px 24px', 
          fontSize: 16, 
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: 20
        }}
      >
        {loading ? 'Comparing...' : 'Compare Documents'}
      </button>
      {/* Results */}
      {similarity && (
        <div style={{ 
          marginTop: 20, 
          padding: 20, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8,
          border: '1px solid #dee2e6'
        }}>
          <h3>Results</h3>
          <div style={{ marginBottom: 10 }}>
            <strong>Algorithm Used:</strong> {similarity.algorithm}
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>Similarity Score:</strong> 
            <span style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: similarity.similarity > 0.7 ? '#28a745' : 
                     similarity.similarity > 0.3 ? '#ffc107' : '#dc3545',
              marginLeft: 10
            }}>
              {(similarity.similarity * 100).toFixed(1)}%
            </span>
            <span style={{ fontSize: 16, color: '#666', marginLeft: 10 }}>
              ({similarity.similarity.toFixed(3)})
            </span>
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>
            <strong>Document Analysis:</strong><br/>
            Document 1: {similarity.details.doc1Words} words<br/>
            Document 2: {similarity.details.doc2Words} words
          </div>
        </div>
      )}
      {/* Error Display */}
      {error && (
        <div style={{ 
          marginTop: 20, 
          padding: 15, 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: 4,
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {/* File Upload Section */}
      <FileUpload
        algorithms={algorithms}
        selectedAlgorithm={selectedAlgorithm}
        setSelectedAlgorithm={setSelectedAlgorithm}
        onResult={setSimilarity}
        onError={setError}
        loading={loading}
        setLoading={setLoading}
      />
      {/* Algorithm Information */}
      <div style={{ marginTop: 30, padding: 20, backgroundColor: '#e9ecef', borderRadius: 8 }}>
        <h3>About the Algorithms</h3>
        <div style={{ fontSize: 14 }}>
          <p><strong>Jaccard Similarity:</strong> Measures overlap of unique words between documents. Good for general purpose comparison.</p>
          <p><strong>Cosine Similarity (TF-IDF):</strong> Uses term frequency and importance weighting. Better for longer documents and semantic similarity.</p>
          <p><strong>N-gram Similarity:</strong> Compares phrases (3-word sequences). Excellent for detecting paraphrasing and similar sentence structures.</p>
        </div>
      </div>
    </div>
  );
}

export default App; 
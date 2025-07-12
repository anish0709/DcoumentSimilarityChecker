import React, { useState } from 'react';

function FileUpload({ algorithms, selectedAlgorithm, setSelectedAlgorithm, onResult, onError, loading, setLoading }) {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);

  // Helper function to determine if an algorithm should be disabled
  const isAlgorithmDisabled = (algorithmId) => {
    // Disable all semantic options except local ones
    const disabledAlgorithms = [
      'semantic',
      'semantic-embedding', 
      'semantic-rag',
      'semantic-llm',
      'semantic-hf',
      'semantic-bedrock'
    ];
    return disabledAlgorithms.includes(algorithmId);
  };

  // Helper function to get algorithm display name with disabled indicator
  const getAlgorithmDisplayName = (algorithm) => {
    if (isAlgorithmDisabled(algorithm.id)) {
      return `${algorithm.name} (API Required)`;
    }
    return algorithm.name;
  };

  const handleFileChange = (e, setFile) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file1 || !file2) {
      onError('Please select both files.');
      return;
    }
    setLoading(true);
    onError('');
    onResult(null);
    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);
    formData.append('algorithm', selectedAlgorithm);
    try {
      const res = await fetch('https://dcoumentsimilaritychecker.onrender.com/api/compare-files', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onResult(data);
      } else {
        onError(data.error || 'Error comparing files');
      }
    } catch (err) {
      onError('Could not connect to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 30, padding: 20, background: '#f4f4f4', borderRadius: 8, maxWidth: 400, width: '100%', boxSizing: 'border-box' }}>
      <h3>Compare by Uploading Files</h3>
      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".txt" onChange={e => handleFileChange(e, setFile1)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".txt" onChange={e => handleFileChange(e, setFile2)} />
      </div>
      <div style={{ marginBottom: 10, width: '100%' }}>
        <select 
          value={selectedAlgorithm} 
          onChange={e => setSelectedAlgorithm(e.target.value)}
          style={{ padding: '8px', fontSize: 16, width: '100%', boxSizing: 'border-box' }}
        >
          {algorithms.map(alg => (
            <option 
              key={alg.id} 
              value={alg.id}
              disabled={isAlgorithmDisabled(alg.id)}
              style={{
                color: isAlgorithmDisabled(alg.id) ? '#999' : '#000',
                backgroundColor: isAlgorithmDisabled(alg.id) ? '#f5f5f5' : '#fff'
              }}
            >
              {getAlgorithmDisplayName(alg)}
            </option>
          ))}
        </select>
        {isAlgorithmDisabled(selectedAlgorithm) && (
          <div style={{ color: '#dc3545', fontWeight: 'bold', fontSize: 12, marginTop: 5 }}>
            ⚠️ This option requires API keys and may incur costs. Use local options instead.
          </div>
        )}
      </div>
      <button 
        onClick={handleUpload} 
        disabled={loading || !file1 || !file2}
        style={{ padding: '10px 20px', fontSize: 16, width: '100%', boxSizing: 'border-box' }}
      >
        {loading ? 'Comparing...' : 'Compare Files'}
      </button>
      <style>{`
        @media (max-width: 480px) {
          div[style*='background: #f4f4f4'] {
            padding: 10px !important;
            font-size: 14px !important;
          }
          select {
            font-size: 14px !important;
          }
          button {
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default FileUpload; 
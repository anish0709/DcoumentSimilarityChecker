import React, { useState } from 'react';

function FileUpload({ algorithms, selectedAlgorithm, setSelectedAlgorithm, onResult, onError, loading, setLoading }) {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);

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
    <div style={{ marginTop: 30, padding: 20, background: '#f4f4f4', borderRadius: 8 }}>
      <h3>Compare by Uploading Files</h3>
      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".txt" onChange={e => handleFileChange(e, setFile1)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".txt" onChange={e => handleFileChange(e, setFile2)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <select 
          value={selectedAlgorithm} 
          onChange={e => setSelectedAlgorithm(e.target.value)}
          style={{ padding: '8px', fontSize: 16 }}
        >
          {algorithms.map(alg => (
            <option key={alg.id} value={alg.id}>{alg.name}</option>
          ))}
        </select>
      </div>
      <button 
        onClick={handleUpload} 
        disabled={loading || !file1 || !file2}
        style={{ padding: '10px 20px', fontSize: 16 }}
      >
        {loading ? 'Comparing...' : 'Compare Files'}
      </button>
    </div>
  );
}

export default FileUpload; 
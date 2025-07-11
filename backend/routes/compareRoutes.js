const express = require('express');
const multer = require('multer');
const compareController = require('../controllers/compareController');

const router = express.Router();
const upload = multer(); // Store files in memory

// Compare text documents (JSON)
router.post('/compare', compareController.compareDocuments);

// Compare uploaded files
router.post('/compare-files', upload.fields([{ name: 'file1' }, { name: 'file2' }]), compareController.compareFiles);

// Get available algorithms
router.get('/algorithms', compareController.getAlgorithms);

module.exports = router; 
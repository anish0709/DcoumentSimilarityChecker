require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compareRoutes = require('./routes/compareRoutes');

const app = express();
app.use(cors({
  origin: 'https://dcoumentsimilaritychecker-1.onrender.com'
}));
app.use(bodyParser.json({ limit: '2mb' }));

// Use organized routes
app.use('/api', compareRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 
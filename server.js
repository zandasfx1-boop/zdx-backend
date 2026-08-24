const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json({
    brand: "ZDX Trade",
    status: "✅ ONLINE",
    message: "Backend connected successfully",
    time: new Date().toISOString()
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    brand: "ZDX Trade",
    version: "1.0.0",
    signals: 1247,
    winRate: "82.4%",
    members: 389
  });
});

app.listen(PORT, () => {
  console.log(`✅ ZDX Backend LIVE on port ${PORT}`);
});
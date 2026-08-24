const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── SIMPLE DATABASE (saves users in a file) ──
const DATA_FILE = './users.json';
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const readUsers = () => JSON.parse(fs.readFileSync(DATA_FILE));
const saveUsers = (users) => fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));

// ── API: SIGN UP ──
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.json({ success: false, message: "Fill all fields" });
  }

  const users = readUsers();
  if (users.find(u => u.email === email)) {
    return res.json({ success: false, message: "Email already exists" });
  }

  const newUser = { id: Date.now(), name, email, password };
  users.push(newUser);
  saveUsers(users);

  res.json({ success: true, message: "✅ Signed up! You can now log in." });
});

// ── API: LOGIN ──
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    res.json({
      success: true,
      message: "✅ Login successful!",
      user: { name: user.name, email: user.email }
    });
  } else {
    res.json({ success: false, message: "❌ Wrong email or password" });
  }
});

// ── YOUR OLD STATUS & STATS ROUTES ──
app.get('/api/status', (req, res) => {
  res.json({
    brand: "ZDX Trade",
    status: "✅ ONLINE",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ ZDX Backend LIVE on port ${PORT}`);
});
 

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==== PARSE CONFIG FROM SINGLE ENV VARIABLE ====
const CONFIG = (process.env.CONFIG || '').split(';').reduce((acc, pair) => {
  const [k,v] = pair.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const JWT_SECRET = CONFIG.JWT_SECRET || 'zdx_secure_key_2026_abc123';
const ADMIN_EMAIL = CONFIG.ADMIN_EMAIL || 'zandasfx1@gmail.com';
const ADMIN_PASSWORD = CONFIG.ADMIN_PASSWORD || 'Starglorymu1';

// ==== IN-MEMORY STORAGE — NO MONGODB NEEDED! ====
let users = [];
let purchases = [];

// ==== HELPERS ====
const findUserByEmail = (email) => users.find(u => u.email === email);
const findUserById = (id) => users.find(u => u.id === id);

// ==== AUTH MIDDLEWARE ====
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ','');
    if (!token) return res.status(401).json({success:false,message:'No token'});
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = findUserById(decoded.userId);
    if (!user) return res.status(401).json({success:false,message:'Invalid token'});
    req.user = user;
    next();
  } catch { res.status(401).json({success:false,message:'Unauthorized'}); }
};

// ==== API ROUTES ====

app.get('/api/status', (req, res) => {
  res.json({brand:"ZDX Trade",status:"✅ ONLINE",time:new Date().toISOString()});
});

app.post('/api/signup', async (req, res) => {
  try {
    const {name,email,password} = req.body;
    if (findUserByEmail(email)) return res.json({success:false,message:'Email already registered'});
    
    const newUser = {
      id: Date.now().toString(),
      name, email,
      password: await bcrypt.hash(password, 10),
      bonusBalance: 5, totalEarned: 0,
      activePlan: null, purchaseHistory: [], withdrawalHistory: [],
      createdAt: new Date()
    };
    users.push(newUser);
    
    const token = jwt.sign({userId: newUser.id}, JWT_SECRET, {expiresIn:'30d'});
    res.json({success:true,message:'Account created! +$5 bonus added!',token,user:{
      name: newUser.name, email: newUser.email, bonusBalance: newUser.bonusBalance,
      totalEarned: newUser.totalEarned, activePlan: newUser.activePlan,
      purchaseHistory: newUser.purchaseHistory, withdrawalHistory: newUser.withdrawalHistory
    }});
  } catch { res.json({success:false,message:'Server error'}); }
});

app.post('/api/login', async (req, res) => {
  const {email,password} = req.body;
  const user = findUserByEmail(email);
  if (!user || !await bcrypt.compare(password, user.password))
    return res.json({success:false,message:'Invalid email or password'});
  
  const token = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn:'30d'});
  res.json({success:true,message:`Welcome back, ${user.name}!`,token,user:{
    name: user.name, email: user.email, bonusBalance: user.bonusBalance,
    totalEarned: user.totalEarned, activePlan: user.activePlan,
    purchaseHistory: user.purchaseHistory, withdrawalHistory: user.withdrawalHistory
  }});
});

app.get('/api/user', auth, (req, res) => {
  res.json({success:true,user:{
    name: req.user.name, email: req.user.email, bonusBalance: req.user.bonusBalance,
    totalEarned: req.user.totalEarned, activePlan: req.user.activePlan,
    purchaseHistory: req.user.purchaseHistory, withdrawalHistory: req.user.withdrawalHistory
  }});
});

app.post('/api/purchases', auth, async (req, res) => {
  try {
    const {itemName,priceUsd,bonusUsed,amountPaid,planDetails,isPlan} = req.body;
    if (bonusUsed > 0) req.user.bonusBalance -= bonusUsed;
    
    const purchase = {
      id: Date.now().toString(),
      userId: req.user.id, userEmail: req.user.email, userName: req.user.name,
      itemName, priceUsd, bonusUsed, amountPaid,
      status: 'pending', purchaseDate: new Date(),
      planDetails, isPlan, verifiedDate: null, expiryDate: null
    };
    purchases.push(purchase);
    
    if (planDetails) {
      req.user.activePlan = {
        id: purchase.id, itemName, priceUsd, status: 'pending',
        purchaseDate: purchase.purchaseDate, planDetails
      };
    }
    req.user.purchaseHistory.unshift({
      id: purchase.id, itemName, priceUsd, status: 'pending', purchaseDate: purchase.purchaseDate
    });
    
    res.json({success:true,message:'Purchase recorded — pending verification',purchase,user:{
      bonusBalance: req.user.bonusBalance, activePlan: req.user.activePlan,
      purchaseHistory: req.user.purchaseHistory
    }});
  } catch { res.json({success:false,message:'Error creating purchase'}); }
});

app.get('/api/purchases/pending', async (req, res) => {
  const pending = purchases.filter(p => p.status === 'pending')
    .sort((a,b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
  res.json({success:true,purchases: pending});
});

app.post('/api/purchases/verify', async (req, res) => {
  const purchase = purchases.find(p => p.id === req.body.purchaseId);
  if (!purchase) return res.json({success:false,message:'Purchase not found'});
  
  purchase.status = 'active';
  purchase.verifiedDate = new Date();
  purchase.expiryDate = new Date(Date.now() + 28*24*60*60*1000);
  
  const user = findUserById(purchase.userId);
  if (user && user.activePlan && user.activePlan.id === purchase.id) {
    user.activePlan.status = 'active';
    user.activePlan.verifiedDate = purchase.verifiedDate;
    user.activePlan.expiryDate = purchase.expiryDate;
  }
  
  res.json({success:true,message:'Purchase verified!',purchase});
});

app.post('/api/admin/login', (req, res) => {
  const {email,password} = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({admin:true}, JWT_SECRET, {expiresIn:'7d'});
    res.json({success:true,message:'Admin logged in',token});
  } else {
    res.json({success:false,message:'Invalid admin credentials'});
  }
});

app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));


const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const readJSON = (file) => {
  try {
    const p = path.join(__dirname, file);
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p);
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
};
const writeJSON = (file, data) => {
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(data, null, 2));
};

// APIs

// register
app.post('/api/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!email || !password || !role || !name) return res.status(400).json({ error: 'missing fields' });
  const users = readJSON('users.json');
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'email exists' });
  }
  const id = 'u_' + Date.now();
  const user = { id, name, email, password, role };
  users.push(user);
  writeJSON('users.json', users);
  const safe = Object.assign({}, user); delete safe.password;
  res.json({ user: safe });
});

// login
app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'missing' });
  const users = readJSON('users.json');
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const safe = Object.assign({}, user); delete safe.password;
  res.json({ user: safe });
});

// services
app.get('/api/services', (req, res) => {
  const services = readJSON('services.json');
  res.json({ services });
});
app.post('/api/services', (req, res) => {
  const { name, category, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const services = readJSON('services.json');
  const id = 's_' + Date.now();
  services.push({ id, name, category: category||'', location: location||'' });
  writeJSON('services.json', services);
  res.json({ service: services[services.length-1] });
});

// reports
app.get('/api/reports', (req, res) => {
  const reports = readJSON('complaints.json');
  res.json({ reports });
});
app.post('/api/reports', (req, res) => {
  const { userId, userName, serviceId, serviceName, text } = req.body;
  if (!userId || !userName || !text) return res.status(400).json({ error: 'missing fields' });
  const reports = readJSON('complaints.json');
  const id = 'r_' + Date.now();
  const rec = { id, userId, userName, serviceId: serviceId||null, serviceName: serviceName||'None', text, status: 'Pending', date: new Date().toISOString() };
  reports.push(rec);
  writeJSON('complaints.json', reports);
  res.json({ report: rec });
});
app.put('/api/reports/:id', (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  const reports = readJSON('complaints.json');
  const idx = reports.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  reports[idx].status = status;
  writeJSON('complaints.json', reports);
  res.json({ report: reports[idx] });
});

// fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});
;

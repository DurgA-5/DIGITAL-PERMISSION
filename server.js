
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for image uploads

// Initialize SQLite Database
// Changed from ':memory:' to a file path to ensure data persistence
const db = new sqlite3.Database('./unipermit.db', (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the unipermit.db SQLite database.");
  }
});

// Initialize Schema
db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT,
    department TEXT,
    year TEXT,
    section TEXT,
    rollNumber TEXT,
    password TEXT
  )`);

  // Permissions Table
  db.run(`CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    studentId TEXT,
    department TEXT,
    year TEXT,
    section TEXT,
    status TEXT,
    createdAt DATETIME,
    data TEXT
  )`);

  // Seed Mock Users (Only if table is empty to avoid duplicates on restart)
  db.get("SELECT count(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding initial users...");
      const MOCK_USERS = [
        { id: 't-a', name: 'Class Teacher (Sec A)', email: 'teachera@mits.ac.in', role: 'CLASS_TEACHER', department: 'CAI', year: '3', section: 'A', password: 'TSECA' },
        { id: 't-b', name: 'Class Teacher (Sec B)', email: 'teacherb@mits.ac.in', role: 'CLASS_TEACHER', department: 'CAI', year: '3', section: 'B', password: 'TSECB' },
        { id: 't-c', name: 'Class Teacher (Sec C)', email: 'teacherc@mits.ac.in', role: 'CLASS_TEACHER', department: 'CAI', year: '3', section: 'C', password: 'TSECC' },
        { id: 'cr-a', name: 'CR (Sec A)', email: 'cra@mits.ac.in', role: 'CR', department: 'CAI', year: '3', section: 'A', rollNumber: '23691A31CRA', password: '23691A31CRA' },
        { id: 'cr-b', name: 'CR (Sec B)', email: 'crb@mits.ac.in', role: 'CR', department: 'CAI', year: '3', section: 'B', rollNumber: '23691A31CRB', password: '23691A31CRB' },
        { id: 'cr-c', name: 'CR (Sec C)', email: 'crc@mits.ac.in', role: 'CR', department: 'CAI', year: '3', section: 'C', rollNumber: '23691A31CRC', password: '23691A31CRC' },
        { id: '4', name: 'General Teacher', email: 'staff.ai@mits.ac.in', role: 'TEACHER', department: 'CAI', year: '3', section: 'A', password: '' }
      ];

      const stmt = db.prepare("INSERT OR REPLACE INTO users (id, name, email, role, department, year, section, rollNumber, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      MOCK_USERS.forEach(user => {
        stmt.run(user.id, user.name, user.email, user.role, user.department, user.year, user.section, user.rollNumber, user.password);
      });
      stmt.finalize();
    }
  });
});

// --- HELPER: Cleanup Expired Permissions ---
const cleanupExpiredPermissions = () => {
  return new Promise((resolve, reject) => {
    // Logic: Delete permissions that are SUBMITTED and created > 24 hours ago
    db.run(
      `DELETE FROM permissions 
       WHERE status = 'SUBMITTED' 
       AND createdAt < datetime('now', '-1 day')`,
      function(err) {
        if (err) {
          console.error("Cleanup error:", err);
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`Auto-deleted ${this.changes} expired permission(s).`);
          }
          resolve();
        }
      }
    );
  });
};

// --- ROUTES ---

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', database: 'sqlite' });
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { email, password, googleAuth } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  if (googleAuth) {
    // Google Login Logic
    if (!normalizedEmail.endsWith('@mits.ac.in')) {
      return res.status(403).json({ error: 'Access restricted to @mits.ac.in domain.' });
    }
    
    // Check if user exists
    db.get("SELECT * FROM users WHERE lower(email) = ?", [normalizedEmail], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });

      if (user) {
        // Prevent protected accounts from using Google Auth if password is set
        if (user.password && user.password.length > 0) {
           return res.status(403).json({ error: 'This administrative account must login with a Password.' });
        }
        return res.json({ success: true, user });
      } else {
        // Create new student/staff user dynamically
        const isGeneralStaff = normalizedEmail.includes('staff');
        const idPart = normalizedEmail.split('@')[0].toUpperCase();
        
        const newUser = {
          id: crypto.randomUUID(),
          name: isGeneralStaff ? `Staff ${idPart}` : `Student ${idPart}`,
          email: email,
          role: isGeneralStaff ? 'TEACHER' : 'STUDENT',
          department: isGeneralStaff ? 'CAI' : '',
          year: isGeneralStaff ? '3' : '',
          section: isGeneralStaff ? 'A' : '',
          rollNumber: isGeneralStaff ? null : idPart,
          password: ''
        };

        const stmt = db.prepare("INSERT INTO users (id, name, email, role, department, year, section, rollNumber, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(newUser.id, newUser.name, newUser.email, newUser.role, newUser.department, newUser.year, newUser.section, newUser.rollNumber, newUser.password, (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, user: newUser });
        });
        stmt.finalize();
      }
    });
  } else {
    // Password Login Logic
    db.get("SELECT * FROM users WHERE lower(email) = ?", [normalizedEmail], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found.' });
      
      if (!user.password) return res.status(400).json({ error: 'Please use "Sign in with Google" for this account.' });
      if (user.password !== password) return res.status(401).json({ error: 'Invalid password.' });

      res.json({ success: true, user });
    });
  }
});

// Get Permissions
app.get('/api/permissions', async (req, res) => {
  try {
    // 1. Run cleanup task before fetching
    await cleanupExpiredPermissions();

    // 2. Fetch all permissions
    db.all("SELECT data FROM permissions", [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Parse the JSON data column back to objects
      const permissions = rows.map(row => JSON.parse(row.data));
      res.json(permissions);
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to cleanup or fetch." });
  }
});

// Save/Update Permission
app.post('/api/permissions', (req, res) => {
  const perm = req.body;
  
  if (!perm.id) return res.status(400).json({ error: "Permission ID required" });

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO permissions (id, studentId, department, year, section, status, createdAt, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    perm.id,
    perm.studentId,
    perm.department,
    perm.year,
    perm.section,
    perm.status,
    perm.createdAt,
    JSON.stringify(perm),
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
  stmt.finalize();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Persistent SQL Backend (unipermit.db) is active.`);
});

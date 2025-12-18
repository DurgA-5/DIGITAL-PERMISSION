
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Firebase Admin
// When deployed to Firebase, it uses internal credentials automatically.
// For local testing, ensure you have FIREBASE_CONFIG env var set or use firebase emulators.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: '50mb' }));

// --- DATABASE SEEDING ---
const seedUsers = async () => {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.limit(1).get();
  
  if (snapshot.empty) {
    console.log("Seeding Firestore with initial admin users...");
    const MOCK_USERS = [
      { id: 't-a', name: 'Class Teacher (Sec A)', email: 'teachera@mits.ac.in', role: 'CLASS_TEACHER', department: 'CAI', year: '3', section: 'A', password: 'TSECA' },
      { id: 't-b', name: 'Class Teacher (Sec B)', email: 'teacherb@mits.ac.in', role: 'CLASS_TEACHER', department: 'CAI', year: '3', section: 'B', password: 'TSECB' },
      { id: 't-c', name: 'Class Teacher (Sec C)', email: 'teacherc@mits.ac.in', role: 'CLASS_TEACHER', department: 'CAI', year: '3', section: 'C', password: 'TSECC' },
      { id: 'cr-a', name: 'CR (Sec A)', email: 'cra@mits.ac.in', role: 'CR', department: 'CAI', year: '3', section: 'A', rollNumber: '23691A31CRA', password: '23691A31CRA' },
      { id: 'cr-b', name: 'CR (Sec B)', email: 'crb@mits.ac.in', role: 'CR', department: 'CAI', year: '3', section: 'B', rollNumber: '23691A31CRB', password: '23691A31CRB' },
      { id: 'cr-c', name: 'CR (Sec C)', email: 'crc@mits.ac.in', role: 'CR', department: 'CAI', year: '3', section: 'C', rollNumber: '23691A31CRC', password: '23691A31CRC' },
      { id: '4', name: 'General Teacher', email: 'staff.ai@mits.ac.in', role: 'TEACHER', department: 'CAI', year: '3', section: 'A', password: '' }
    ];

    const batch = db.batch();
    MOCK_USERS.forEach(user => {
      const ref = usersRef.doc(user.id);
      batch.set(ref, user);
    });
    await batch.commit();
    console.log("Firestore seeding complete.");
  }
};

// --- ROUTES ---

// Login Endpoint
app.post('/login', async (req, res) => {
  const { email, password, googleAuth } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', normalizedEmail).get();
    
    let user = null;
    if (!snapshot.empty) {
      user = snapshot.docs[0].data();
    }

    if (googleAuth) {
      if (!normalizedEmail.endsWith('@mits.ac.in')) {
        return res.status(403).json({ error: 'Access restricted to @mits.ac.in domain.' });
      }

      if (user) {
        if (user.password && user.password.length > 0) {
          return res.status(403).json({ error: 'This administrative account must login with a Password.' });
        }
        return res.json({ success: true, user });
      } else {
        // Create new student/staff on the fly
        const isGeneralStaff = normalizedEmail.includes('staff');
        const idPart = normalizedEmail.split('@')[0].toUpperCase();
        const id = admin.firestore().collection('users').doc().id;

        const newUser = {
          id: id,
          name: isGeneralStaff ? `Staff ${idPart}` : `Student ${idPart}`,
          email: normalizedEmail,
          role: isGeneralStaff ? 'TEACHER' : 'STUDENT',
          department: isGeneralStaff ? 'CAI' : '',
          year: isGeneralStaff ? '3' : '',
          section: isGeneralStaff ? 'A' : '',
          rollNumber: isGeneralStaff ? null : idPart,
          password: ''
        };

        await usersRef.doc(newUser.id).set(newUser);
        return res.json({ success: true, user: newUser });
      }
    } else {
      // Password Login
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (!user.password) return res.status(400).json({ error: 'Please use "Sign in with Google" for this account.' });
      
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid password.' });
      }

      return res.json({ success: true, user });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Permissions
app.get('/permissions', async (req, res) => {
  try {
    const snapshot = await db.collection('permissions').get();
    const permissions = snapshot.docs.map(doc => JSON.parse(doc.data().data));
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/Update Permission
app.post('/permissions', async (req, res) => {
  const perm = req.body;
  if (!perm.id) return res.status(400).json({ error: "Permission ID required" });

  try {
    await db.collection('permissions').doc(perm.id).set({
      id: perm.id,
      studentId: perm.studentId,
      department: perm.department,
      year: perm.year,
      section: perm.section,
      status: perm.status,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(perm.createdAt)),
      data: JSON.stringify(perm) // Storing the full object as string for NoSQL flexibility
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health Check
app.get('/health', async (req, res) => {
  await seedUsers(); // Trigger seeding if necessary on health check
  res.json({ status: 'online', database: 'firestore' });
});

// Export as a Cloud Function
// In Firebase, this will be available at https://[region]-[project].cloudfunctions.net/api
exports.api = functions.https.onRequest(app);

import { User, UserRole, PermissionRequest, PermissionStatus } from "../types";

// Mock Data - Pre-seeded Secure Accounts with Passwords
const MOCK_USERS: User[] = [
  // --- Class Teachers (CAI) ---
  { 
    id: 't-a', 
    name: 'Class Teacher (Sec A)', 
    email: 'teachera@mits.ac.in', 
    role: UserRole.CLASS_TEACHER, 
    department: 'CAI', 
    year: '3', 
    section: 'A',
    password: 'TSECA' 
  },
  { 
    id: 't-b', 
    name: 'Class Teacher (Sec B)', 
    email: 'teacherb@mits.ac.in', 
    role: UserRole.CLASS_TEACHER, 
    department: 'CAI', 
    year: '3', 
    section: 'B',
    password: 'TSECB' 
  },
  { 
    id: 't-c', 
    name: 'Class Teacher (Sec C)', 
    email: 'teacherc@mits.ac.in', 
    role: UserRole.CLASS_TEACHER, 
    department: 'CAI', 
    year: '3', 
    section: 'C',
    password: 'TSECC' 
  },

  // --- Class Representatives (CR) (CAI) ---
  { 
    id: 'cr-a', 
    name: 'CR (Sec A)', 
    email: 'cra@mits.ac.in', 
    role: UserRole.CR, 
    department: 'CAI', 
    year: '3', 
    section: 'A', 
    rollNumber: '23691A31CRA',
    password: '23691A31CRA' 
  },
  { 
    id: 'cr-b', 
    name: 'CR (Sec B)', 
    email: 'crb@mits.ac.in', 
    role: UserRole.CR, 
    department: 'CAI', 
    year: '3', 
    section: 'B', 
    rollNumber: '23691A31CRB',
    password: '23691A31CRB' 
  },
  { 
    id: 'cr-c', 
    name: 'CR (Sec C)', 
    email: 'crc@mits.ac.in', 
    role: UserRole.CR, 
    department: 'CAI', 
    year: '3', 
    section: 'C', 
    rollNumber: '23691A31CRC',
    password: '23691A31CRC' 
  },

  // --- General Staff ---
  { 
    id: '4', 
    name: 'General Teacher', 
    email: 'staff.ai@mits.ac.in', 
    role: UserRole.TEACHER, 
    department: 'CAI', 
    year: '3', 
    section: 'A' 
    // General staff login via Google, so no password here strictly required, 
    // but handled via Google flow
  },
];

const STORAGE_KEYS = {
  USERS: 'unipermit_users',
  PERMISSIONS: 'unipermit_permissions',
  CURRENT_USER: 'unipermit_current_user'
};

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initialize Storage
export const initStorage = () => {
  const storedUsersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  let users: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

  // CRITICAL FIX: Ensure system accounts (Teacher/CR) always exist with correct roles
  MOCK_USERS.forEach(mockUser => {
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === mockUser.email.toLowerCase());
    if (existingIndex > -1) {
      users[existingIndex] = { ...users[existingIndex], ...mockUser };
    } else {
      users.push(mockUser);
    }
  });

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // Fix for "stale" current user in local storage if they are one of the mock users
  const currentUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (currentUserStr) {
    const currentUser = JSON.parse(currentUserStr);
    const updatedMock = MOCK_USERS.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (updatedMock) {
       // Auto-update the session to reflect new department
       localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({ ...currentUser, ...updatedMock }));
    }
  }

  if (!localStorage.getItem(STORAGE_KEYS.PERMISSIONS)) {
    localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify([]));
  }
};

// --- AUTHENTICATION LOGIC ---

// 1. Password Login (For Class Teacher & CR)
export const loginWithPassword = (email: string, password: string): { success: boolean; user?: User; error?: string } => {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const normalizedEmail = email.trim().toLowerCase();
  
  const user = users.find((u: User) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  // Check if this user is configured to use password
  if (!user.password) {
    return { success: false, error: 'Please use "Sign in with Google" for this account.' };
  }

  if (user.password !== password) {
    return { success: false, error: 'Invalid password.' };
  }

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  return { success: true, user };
};

// 2. Google Login Simulation (For Students & General Teachers)
export const loginWithGoogle = (email: string): { success: boolean; user?: User; error?: string } => {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (!normalizedEmail.endsWith('@mits.ac.in')) {
    return { success: false, error: 'Access restricted to @mits.ac.in domain.' };
  }

  // Prevent Teacher/CR from bypassing password login via Google button
  // (In a real app, SSO would handle this map, but here we enforce separation)
  const isProtectedAccount = MOCK_USERS.some(u => 
    u.email.toLowerCase() === normalizedEmail && (u.role === UserRole.CLASS_TEACHER || u.role === UserRole.CR)
  );

  if (isProtectedAccount) {
    return { success: false, error: 'This administrative account must login with a Password.' };
  }

  // Retrieve existing or create new
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  let user = users.find((u: User) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    // Dynamic Registration for Student/Staff
    const isGeneralStaff = normalizedEmail.includes('staff');
    const idPart = normalizedEmail.split('@')[0].toUpperCase();

    user = {
      id: crypto.randomUUID(),
      name: isGeneralStaff ? `Staff ${idPart}` : `Student ${idPart}`,
      email: email,
      role: isGeneralStaff ? UserRole.TEACHER : UserRole.STUDENT,
      department: isGeneralStaff ? 'CAI' : '', 
      year: isGeneralStaff ? '3' : '',
      section: isGeneralStaff ? 'A' : '',
      rollNumber: isGeneralStaff ? undefined : idPart
    };
    users.push(user);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  return { success: true, user };
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return stored ? JSON.parse(stored) : null;
};

// --- PERMISSIONS LOGIC ---

export const getPermissions = (): PermissionRequest[] => {
  const permissions: PermissionRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERMISSIONS) || '[]');
  
  const now = new Date();
  let hasChanges = false;

  // Filter: Keep permissions that are NOT (submitted AND > 24 hours old)
  const validPermissions = permissions.filter(p => {
    if (p.status === PermissionStatus.SUBMITTED) {
      const created = new Date(p.createdAt);
      // Diff in hours
      const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

      if (diffInHours >= 24) {
        hasChanges = true;
        return false; // Auto delete
      }
    }
    return true;
  });

  if (hasChanges) {
    localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(validPermissions));
  }

  return validPermissions;
};

export const savePermission = (permission: PermissionRequest) => {
  const permissions = getPermissions();
  const existingIndex = permissions.findIndex(p => p.id === permission.id);
  
  if (existingIndex >= 0) {
    permissions[existingIndex] = permission;
  } else {
    permissions.push(permission);
  }
  
  localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
};

// Logic to check if active based on time (Local Time)
export const isPermissionActive = (perm: PermissionRequest): boolean => {
  if (perm.status !== PermissionStatus.APPROVED) return false;
  if (!perm.permissionDate || !perm.startTime || !perm.endTime) return false;

  const todayStr = getLocalDateString();
  if (perm.permissionDate !== todayStr) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = perm.startTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = perm.endTime.split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

import { User, UserRole, PermissionRequest, PermissionStatus } from "../types";

const STORAGE_KEYS = {
  USERS: 'unipermit_users',
  PERMISSIONS: 'unipermit_permissions',
  CURRENT_USER: 'unipermit_current_user'
};

const API_BASE = 
  ((import.meta as any).env && (import.meta as any).env.VITE_API_URL) || 
  (process.env.REACT_APP_API_URL) || 
  'http://localhost:3001/api';

const MOCK_USERS: User[] = [
  { id: 't-a', name: 'Class Teacher (Sec A)', email: 'teachera@mits.ac.in', role: UserRole.CLASS_TEACHER, department: 'CAI', year: '3', section: 'A', password: 'TSECA' },
  { id: 't-b', name: 'Class Teacher (Sec B)', email: 'teacherb@mits.ac.in', role: UserRole.CLASS_TEACHER, department: 'CAI', year: '3', section: 'B', password: 'TSECB' },
  { id: 't-c', name: 'Class Teacher (Sec C)', email: 'teacherc@mits.ac.in', role: UserRole.CLASS_TEACHER, department: 'CAI', year: '3', section: 'C', password: 'TSECC' },
  { id: 'cr-a', name: 'CR (Sec A)', email: 'cra@mits.ac.in', role: UserRole.CR, department: 'CAI', year: '3', section: 'A', rollNumber: '23691A31CRA', password: '23691A31CRA' },
  { id: 'cr-b', name: 'CR (Sec B)', email: 'crb@mits.ac.in', role: UserRole.CR, department: 'CAI', year: '3', section: 'B', rollNumber: '23691A31CRB', password: '23691A31CRB' },
  { id: 'cr-c', name: 'CR (Sec C)', email: 'crc@mits.ac.in', role: UserRole.CR, department: 'CAI', year: '3', section: 'C', rollNumber: '23691A31CRC', password: '23691A31CRC' },
  { id: '4', name: 'General Teacher', email: 'staff.ai@mits.ac.in', role: UserRole.TEACHER, department: 'CAI', year: '3', section: 'A' }
];

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const initStorage = () => {
  const storedUsersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  let users: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];
  
  MOCK_USERS.forEach(mockUser => {
    const existingIndex = users.findIndex(u => u.id === mockUser.id);
    if (existingIndex > -1) {
      users[existingIndex] = { ...users[existingIndex], ...mockUser };
    } else {
      users.push(mockUser);
    }
  });
  
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  if (!localStorage.getItem(STORAGE_KEYS.PERMISSIONS)) {
    localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify([]));
  }
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch (e) {
    return false;
  }
};

export const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, googleAuth: false })
    });
    
    if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error || 'Login failed' };
        }
    } else {
        const data = await response.json();
        throw new Error(data.error || `Server returned ${response.status}`);
    }
  } catch (error: any) {
    console.warn("Backend login failed or unavailable:", error.message);
    
    // Fallback Local Logic
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find((u: User) => u.email.toLowerCase() === normalizedEmail);

    if (!user) return { success: false, error: 'User not found.' };
    if (!user.password) return { success: false, error: 'Please use "Sign in with Google" for this account.' };
    if (user.password !== password) return { success: false, error: 'Invalid password.' };

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { success: true, user };
  }
};

export const loginWithGoogle = async (email: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, googleAuth: true })
    });

    if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error || 'Login failed' };
        }
    } else {
        const data = await response.json();
        throw new Error(data.error || `Server returned ${response.status}`);
    }
  } catch (error: any) {
    console.warn("Backend Google login failed or unavailable:", error.message);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@mits.ac.in')) {
      return { success: false, error: 'Access restricted to @mits.ac.in domain.' };
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    let user = users.find((u: User) => u.email.toLowerCase() === normalizedEmail);

    if (user && user.password) {
        return { success: false, error: 'This administrative account must login with a Password.' };
    }

    if (!user) {
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
  }
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return stored ? JSON.parse(stored) : null;
};

export const getPermissions = async (): Promise<PermissionRequest[]> => {
  try {
    const response = await fetch(`${API_BASE}/permissions`);
    if (!response.ok) throw new Error('Failed to fetch');
    const permissions: PermissionRequest[] = await response.json();
    return permissions;
  } catch (error) {
    const permissions: PermissionRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERMISSIONS) || '[]');
    const now = new Date();
    let hasChanges = false;
    const validPermissions = permissions.filter(p => {
      if (p.status === PermissionStatus.SUBMITTED) {
        const created = new Date(p.createdAt);
        const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        if (diffInHours >= 24) {
          hasChanges = true;
          return false;
        }
      }
      return true;
    });

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(validPermissions));
    }

    return validPermissions;
  }
};

export const savePermission = async (permission: PermissionRequest): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permission)
    });
    return response.ok;
  } catch (error) {
    const permissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERMISSIONS) || '[]');
    const existingIndex = permissions.findIndex((p: PermissionRequest) => p.id === permission.id);
    
    if (existingIndex >= 0) {
      permissions[existingIndex] = permission;
    } else {
      permissions.push(permission);
    }
    
    localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
    return true;
  }
};

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

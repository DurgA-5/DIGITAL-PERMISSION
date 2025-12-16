export enum UserRole {
  STUDENT = 'STUDENT',
  CLASS_TEACHER = 'CLASS_TEACHER',
  CR = 'CR',
  TEACHER = 'TEACHER', // General teacher
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  year?: string;
  section?: string;
  rollNumber?: string;
  password?: string; // Added for secure role-based login
}

export enum PermissionStatus {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface AIVerificationResult {
  extractedName: string;
  extractedReason: string;
  hasSignature: boolean;
  riskScore: number; // 0-100, higher is riskier
  summary: string;
  isLegitimate: boolean;
}

export interface PermissionRequest {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  department: string;
  year: string;
  section: string;
  reason: string;
  letterImageBase64: string; // Storing as base64 for demo simplicity
  status: PermissionStatus;
  
  // Student Requested Schedule
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;

  // AI Analysis
  aiVerification?: AIVerificationResult;
  
  // Approval Details (Teacher Final Decision)
  approvedBy?: string;
  approvedAt?: string; // ISO String
  
  // Time Window (Set by Teacher, defaults to requested)
  permissionDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  role: UserRole; // Simplified login for demo
}
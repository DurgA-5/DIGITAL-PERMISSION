import React, { useState, useEffect } from 'react';
import { User, PermissionRequest, PermissionStatus } from '../types';
import { getPermissions, isPermissionActive, savePermission } from '../services/storageService';

interface CRDashboardProps {
  user: User;
}

const CRDashboard: React.FC<CRDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'approvals'>('attendance');
  
  // Attendance State
  const [todaysPermissions, setTodaysPermissions] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Approval State
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRequest[]>([]);
  const [selectedPerm, setSelectedPerm] = useState<PermissionRequest | null>(null); // Shared for both viewing details and approving
  
  // Approval Form Data
  const [permDate, setPermDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Data Fetching
  const refreshData = () => {
    const all = getPermissions();
    
    // Get local date string YYYY-MM-DD
    const d = new Date();
    const todayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // 1. Filter for Today's Approved Permissions (Active, Upcoming, and Completed)
    const todays = all
      .filter(p => 
        p.department === user.department && 
        p.year === user.year && 
        p.section === user.section &&
        p.status === PermissionStatus.APPROVED &&
        p.permissionDate === todayDate
      )
      .sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
    
    // 2. Filter for Pending (Approval View) - Exclude CR's own requests
    const pending = all
      .filter(p => 
        p.department === user.department && 
        p.year === user.year && 
        p.section === user.section &&
        p.status === PermissionStatus.SUBMITTED &&
        p.studentId !== user.id // CR cannot approve their own
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    setTodaysPermissions(todays);
    setPendingPermissions(pending);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); 
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill form when opening a pending request
  useEffect(() => {
    if (selectedPerm && selectedPerm.status === PermissionStatus.SUBMITTED) {
      setPermDate(selectedPerm.requestedDate || new Date().toISOString().split('T')[0]);
      setStartTime(selectedPerm.requestedStartTime || '09:00');
      setEndTime(selectedPerm.requestedEndTime || '10:00');
    }
  }, [selectedPerm]);

  const handleApprove = () => {
    if (!selectedPerm) return;
    const updated: PermissionRequest = {
      ...selectedPerm,
      status: PermissionStatus.APPROVED,
      approvedBy: `${user.name} (CR)`, // Mark as approved by CR
      approvedAt: new Date().toISOString(),
      permissionDate: permDate,
      startTime: startTime,
      endTime: endTime
    };
    savePermission(updated);
    refreshData();
    setSelectedPerm(null);
  };

  const handleReject = () => {
    if (!selectedPerm) return;
    const updated: PermissionRequest = {
      ...selectedPerm,
      status: PermissionStatus.REJECTED,
      approvedBy: `${user.name} (CR)`,
      approvedAt: new Date().toISOString()
    };
    savePermission(updated);
    refreshData();
    setSelectedPerm(null);
  };

  // Helper to determine status badge
  const getTimeStatus = (p: PermissionRequest) => {
    if (isPermissionActive(p)) {
      return <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 animate-pulse">● Live Now</span>;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = (p.startTime || '00:00').split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    
    const [endH, endM] = (p.endTime || '00:00').split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    if (currentMinutes < startMinutes) {
       return <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-blue-100 text-blue-800">Upcoming</span>;
    }
    if (currentMinutes > endMinutes) {
       return <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-500">Completed</span>;
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header & Stats */}
      <div className="bg-indigo-700 rounded-xl shadow-lg p-6 mb-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Class Representative Dashboard</h1>
          <p className="opacity-90 text-sm">Managing: {user.department} | Year: {user.year} | Section: {user.section}</p>
        </div>
        <div className="flex bg-indigo-800 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-white text-indigo-800 shadow' : 'text-indigo-200 hover:text-white'}`}
          >
            Daily Attendance Log
            {todaysPermissions.length > 0 && <span className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{todaysPermissions.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'approvals' ? 'bg-white text-indigo-800 shadow' : 'text-indigo-200 hover:text-white'}`}
          >
            Review Requests
            {pendingPermissions.length > 0 && <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingPermissions.length}</span>}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white shadow rounded-xl overflow-hidden min-h-[500px]">
        
        {/* TAB 1: ATTENDANCE VIEW */}
        {activeTab === 'attendance' && (
          <div>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Today's Permissions</h2>
              <div className="text-sm text-gray-500">
                Tracking all approved movements for today
              </div>
            </div>
            
            {loading ? (
              <div className="p-12 text-center text-gray-500">Updating list...</div>
            ) : todaysPermissions.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <div className="p-4 rounded-full bg-gray-100 mb-4 text-gray-400">
                   <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Class Full</h3>
                <p className="text-gray-500 mt-1">No permission letters approved for today.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Window</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todaysPermissions.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTimeStatus(p)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{p.rollNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.studentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[150px]">{p.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {p.startTime} - {p.endTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => setSelectedPerm(p)} className="text-indigo-600 hover:text-indigo-900">Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: APPROVAL VIEW */}
        {activeTab === 'approvals' && (
          <div>
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Pending Requests ({pendingPermissions.length})</h2>
              <p className="text-sm text-gray-500 mt-1">Review and approve letters on behalf of the class teacher.</p>
            </div>

            {pendingPermissions.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                 <div className="p-4 rounded-full bg-green-50 mb-4 text-green-500">
                   <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                <p className="text-gray-500 mt-1">There are no pending permission requests to review.</p>
                <p className="text-xs text-gray-400 mt-2">Checking for Dept: {user.department}, Year: {user.year}, Sec: {user.section}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {pendingPermissions.map(p => (
                  <div key={p.id} onClick={() => setSelectedPerm(p)} className="border rounded-xl p-4 cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all bg-white group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-900">{p.studentName}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Pending</span>
                    </div>
                    <div className="text-sm text-gray-500 mb-3">{p.rollNumber}</div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3 line-clamp-2 italic">"{p.reason}"</div>
                    <div className="flex justify-between items-center mt-2">
                       <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                       <span className="text-xs text-indigo-600 font-medium group-hover:underline">Review &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SHARED DETAILS / APPROVAL MODAL */}
      {selectedPerm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedPerm.status === PermissionStatus.SUBMITTED ? 'Review Request' : 'Permission Details'}
                </h2>
                <p className="text-sm text-gray-500">{selectedPerm.studentName} ({selectedPerm.rollNumber})</p>
              </div>
              <button onClick={() => setSelectedPerm(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* AI Analysis Block */}
              {selectedPerm.aiVerification && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2">
                       <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
                       AI Verification
                     </h3>
                     <span className={`text-xs font-bold px-2 py-1 rounded ${selectedPerm.aiVerification.riskScore > 50 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                       Risk Score: {selectedPerm.aiVerification.riskScore}/100
                     </span>
                  </div>
                  <p className="text-sm text-slate-600 italic mb-2">{selectedPerm.aiVerification.summary}</p>
                  <div className="flex gap-4 text-xs">
                     <span className={selectedPerm.aiVerification.hasSignature ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                       {selectedPerm.aiVerification.hasSignature ? '✓ Signature Detected' : '⚠ No Signature Found'}
                     </span>
                  </div>
                </div>
              )}

              {/* Letter Image */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Submitted Proof</h4>
                <div className="bg-gray-100 rounded-lg border p-2 flex justify-center">
                  <img src={selectedPerm.letterImageBase64} alt="Letter" className="max-h-64 object-contain" />
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 uppercase">Reason</p>
                  <p className="text-sm font-medium">{selectedPerm.reason}</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
                  <p className="text-xs text-indigo-500 uppercase">Requested Schedule</p>
                  <p className="text-sm font-medium text-indigo-900">{selectedPerm.requestedDate}</p>
                  <p className="text-sm font-medium text-indigo-900">{selectedPerm.requestedStartTime} - {selectedPerm.requestedEndTime}</p>
                </div>
              </div>

              {/* ACTION AREA - Only for Pending Requests */}
              {selectedPerm.status === PermissionStatus.SUBMITTED && (
                <div className="border-t pt-6 mt-2">
                  <h4 className="font-bold text-gray-900 mb-4">CR Action Required</h4>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Confirm Permission Date</label>
                      <input type="date" value={permDate} onChange={e => setPermDate(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Confirm Start Time</label>
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm" />
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Confirm End Time</label>
                         <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleApprove} className="flex-1 bg-green-600 text-white py-3 rounded-lg shadow hover:bg-green-700 font-bold transition-colors flex justify-center items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                      Approve Request
                    </button>
                    <button onClick={handleReject} className="flex-1 bg-red-100 text-red-700 py-3 rounded-lg hover:bg-red-200 font-bold transition-colors">
                      Reject
                    </button>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-3">Approved permissions will immediately appear in the class attendance list.</p>
                </div>
              )}

              {/* READ ONLY AREA - For Approved/Rejected Requests */}
              {selectedPerm.status !== PermissionStatus.SUBMITTED && (
                <div className="border-t pt-4">
                  <div className={`p-4 rounded-lg ${selectedPerm.status === PermissionStatus.APPROVED ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className="font-bold text-sm mb-1">Status: {selectedPerm.status}</p>
                    <p className="text-sm">Processed by: <span className="font-medium">{selectedPerm.approvedBy}</span></p>
                    {selectedPerm.status === PermissionStatus.APPROVED && (
                      <p className="text-sm mt-1">Authorized Time: {selectedPerm.startTime} - {selectedPerm.endTime}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRDashboard;
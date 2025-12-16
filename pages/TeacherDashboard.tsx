import React, { useState, useEffect } from 'react';
import { User, PermissionRequest, PermissionStatus } from '../types';
import { getPermissions, savePermission } from '../services/storageService';

interface TeacherDashboardProps {
  user: User;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [selectedPerm, setSelectedPerm] = useState<PermissionRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');

  // Approval Form State
  const [permDate, setPermDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a permission is selected, pre-fill the form with student's requested values
  useEffect(() => {
    if (selectedPerm) {
      setPermDate(selectedPerm.requestedDate || new Date().toISOString().split('T')[0]);
      setStartTime(selectedPerm.requestedStartTime || '09:00');
      setEndTime(selectedPerm.requestedEndTime || '10:00');
    }
  }, [selectedPerm]);

  const loadPermissions = () => {
    const all = getPermissions();
    // Filter for teacher's class
    const filtered = all.filter(p => 
      p.department === user.department && 
      p.year === user.year && 
      p.section === user.section
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setPermissions(filtered);
  };

  const handleApprove = () => {
    if (!selectedPerm) return;
    const updated: PermissionRequest = {
      ...selectedPerm,
      status: PermissionStatus.APPROVED,
      approvedBy: user.name,
      approvedAt: new Date().toISOString(),
      permissionDate: permDate,
      startTime: startTime,
      endTime: endTime
    };
    savePermission(updated);
    loadPermissions();
    setSelectedPerm(null);
  };

  const handleReject = () => {
    if (!selectedPerm) return;
    const updated: PermissionRequest = {
      ...selectedPerm,
      status: PermissionStatus.REJECTED,
      approvedBy: user.name,
      approvedAt: new Date().toISOString()
    };
    savePermission(updated);
    loadPermissions();
    setSelectedPerm(null);
  };

  const pendingList = permissions.filter(p => p.status === PermissionStatus.SUBMITTED);
  const processedList = permissions.filter(p => p.status !== PermissionStatus.SUBMITTED);
  const displayList = activeTab === 'pending' ? pendingList : processedList;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* List Column */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Class Permissions</h2>
          <p className="text-xs text-indigo-600 font-medium mb-3">Managing: {user.department} - Year {user.year} - Sec {user.section}</p>
          <div className="flex bg-gray-100 rounded p-1">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-1 text-sm rounded font-medium ${activeTab === 'pending' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
            >
              Pending ({pendingList.length})
            </button>
            <button 
              onClick={() => setActiveTab('processed')}
              className={`flex-1 py-1 text-sm rounded font-medium ${activeTab === 'processed' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
            >
              History
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {displayList.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPerm(p)}
              className={`p-4 rounded-lg cursor-pointer transition-colors border ${selectedPerm?.id === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900">{p.studentName}</h3>
                <span className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1 truncate">{p.reason}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700">{p.rollNumber}</span>
                {p.aiVerification && (
                   <span className={`text-xs px-2 py-0.5 rounded ${p.aiVerification.riskScore > 50 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                     AI Risk: {p.aiVerification.riskScore}
                   </span>
                )}
              </div>
            </div>
          ))}
          {displayList.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <p className="mb-2">No {activeTab} requests found.</p>
              <p className="text-xs">Ensure students select <br/><strong>{user.department} - {user.year} - {user.section}</strong></p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Column */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow p-6 overflow-y-auto">
        {selectedPerm ? (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPerm.studentName}</h2>
                <div className="flex gap-2 text-sm text-gray-500 mt-1">
                   <span className="bg-gray-100 px-2 py-0.5 rounded">Roll: {selectedPerm.rollNumber}</span>
                   <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedPerm.department}</span>
                   <span className="bg-gray-100 px-2 py-0.5 rounded">Year: {selectedPerm.year}</span>
                   <span className="bg-gray-100 px-2 py-0.5 rounded">Sec: {selectedPerm.section}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                 selectedPerm.status === PermissionStatus.SUBMITTED ? 'bg-yellow-100 text-yellow-800' : 
                 selectedPerm.status === PermissionStatus.APPROVED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {selectedPerm.status}
              </span>
            </div>

            {/* AI Insights Panel */}
            {selectedPerm.aiVerification && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
                  <h3 className="font-bold text-slate-800">AI Analysis</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Extracted Intent:</p>
                    <p className="font-medium">{selectedPerm.aiVerification.extractedReason || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Signature Detected:</p>
                    <p className={`font-medium ${selectedPerm.aiVerification.hasSignature ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedPerm.aiVerification.hasSignature ? 'Yes' : 'No - Warning'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Verification Summary:</p>
                    <p className="italic text-slate-700">{selectedPerm.aiVerification.summary}</p>
                  </div>
                  <div className="col-span-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${selectedPerm.aiVerification.riskScore < 30 ? 'bg-green-500' : selectedPerm.aiVerification.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        style={{ width: `${selectedPerm.aiVerification.riskScore}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-slate-500">Risk Score: {selectedPerm.aiVerification.riskScore}/100</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Original Letter</h4>
                <div className="border rounded-lg overflow-hidden bg-gray-100 h-64 flex items-center justify-center">
                  <img src={selectedPerm.letterImageBase64} alt="Letter" className="max-h-full max-w-full object-contain cursor-pointer hover:scale-105 transition-transform" />
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Student Request</h4>
                <div className="bg-indigo-50 p-3 rounded border border-indigo-100 mb-3">
                   <p className="text-sm text-indigo-900"><span className="font-medium">Requested Date:</span> {selectedPerm.requestedDate}</p>
                   <p className="text-sm text-indigo-900"><span className="font-medium">Requested Time:</span> {selectedPerm.requestedStartTime} - {selectedPerm.requestedEndTime}</p>
                </div>
                <p className="text-gray-700 bg-gray-50 p-3 rounded border">{selectedPerm.reason}</p>

                {selectedPerm.status === PermissionStatus.SUBMITTED && (
                  <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold mb-3">Action Required</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Permission Date</label>
                        <input type="date" value={permDate} onChange={e => setPermDate(e.target.value)} className="w-full border rounded p-1.5 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                           <label className="block text-xs font-medium text-gray-500 uppercase">Start Time</label>
                           <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border rounded p-1.5 text-sm" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-500 uppercase">End Time</label>
                           <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border rounded p-1.5 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={handleApprove} className="flex-1 bg-green-600 text-white py-2 rounded shadow hover:bg-green-700 font-medium">Approve</button>
                        <button onClick={handleReject} className="flex-1 bg-red-600 text-white py-2 rounded shadow hover:bg-red-700 font-medium">Reject</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPerm.status === PermissionStatus.APPROVED && (
                   <div className="mt-6 border-t pt-4 text-sm">
                      <p className="font-bold text-green-700">Approved by {selectedPerm.approvedBy}</p>
                      <p>Time Window: {selectedPerm.startTime} - {selectedPerm.endTime}</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p>Select a permission request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
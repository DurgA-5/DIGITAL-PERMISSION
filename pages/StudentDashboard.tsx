import React, { useState, useEffect } from 'react';
import { User, PermissionRequest, PermissionStatus } from '../types';
import { analyzePermissionLetter } from '../services/geminiService';
import { getPermissions, savePermission } from '../services/storageService';

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  // Form Fields - Updated defaults based on requirements
  const [studentName, setStudentName] = useState(''); // "dont mention any thing"
  const [rollNumber, setRollNumber] = useState('');   // "dont mention any thing"
  const [department, setDepartment] = useState('CAI'); // "only fixec for cai"
  const [year, setYear] = useState(user.year || '3');
  const [section, setSection] = useState(user.section || 'A');
  const [reason, setReason] = useState('');

  // Time Request Fields - Updated defaults
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [reqStartTime, setReqStartTime] = useState('10:00');
  const [reqEndTime, setReqEndTime] = useState('17:00'); // 5:00 PM
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPermissions = async () => {
    const all = await getPermissions();
    setPermissions(all.filter(p => p.studentId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !preview) return;

    // Validation: Ensure Class Details are filled so the correct Teacher sees it
    if (!department || !year || !section) {
      alert("Please select your Department, Year, and Section.");
      return;
    }

    setIsAnalyzing(true);
    
    // Step 1: Analyze with AI immediately upon upload (Pre-processing)
    const aiResult = await analyzePermissionLetter(preview);

    const newPermission: PermissionRequest = {
      id: crypto.randomUUID(),
      studentId: user.id,
      studentName: studentName, // Use the manually entered name
      rollNumber: rollNumber,   // Use the manually entered roll number
      department: department,
      year: year,
      section: section,
      reason: reason,
      letterImageBase64: preview,
      status: PermissionStatus.SUBMITTED,
      requestedDate: reqDate,
      requestedStartTime: reqStartTime,
      requestedEndTime: reqEndTime,
      aiVerification: aiResult,
      createdAt: new Date().toISOString()
    };

    const success = await savePermission(newPermission);
    if (success) {
      await loadPermissions();
      setActiveTab('history');
      // Reset form
      setFile(null);
      setPreview(null);
      setReason('');
    } else {
      alert("Failed to submit permission. Please check connection.");
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('upload')}
          className={`pb-2 px-4 font-medium ${activeTab === 'upload' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          New Request
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-4 font-medium ${activeTab === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          My History
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Permission Letter</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Student Details Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b pb-2">1. Student Details</h3>
              <p className="text-xs text-gray-500 mb-2">Ensure these match your Class Teacher's department.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter roll number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="CAI">CAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-4">
               <h3 className="text-sm font-medium text-indigo-800 uppercase tracking-wide border-b border-indigo-200 pb-2">2. Requested Schedule</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input 
                      type="date" 
                      required 
                      value={reqDate} 
                      onChange={e => setReqDate(e.target.value)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input 
                      type="time" 
                      required 
                      value={reqStartTime} 
                      onChange={e => setReqStartTime(e.target.value)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input 
                      type="time" 
                      required 
                      value={reqEndTime} 
                      onChange={e => setReqEndTime(e.target.value)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500" 
                    />
                  </div>
               </div>
            </div>

            {/* Letter Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">3. Reason & Evidence</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mb-4 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                placeholder="Briefly describe why you need permission..."
              />

              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors relative">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                      <span>Upload Signed Letter</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} required />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            {preview && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <img src={preview} alt="Letter Preview" className="h-48 w-auto rounded border border-gray-200 object-contain bg-gray-100" />
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing || !file}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isAnalyzing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isAnalyzing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing with AI...
                </span>
              ) : 'Submit for Approval'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {permissions.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No permission requests found.</p>
          ) : (
            permissions.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg text-gray-800">Request on {new Date(p.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      p.status === PermissionStatus.APPROVED ? 'bg-green-100 text-green-800' :
                      p.status === PermissionStatus.REJECTED ? 'bg-red-100 text-red-800' :
                      p.status === PermissionStatus.EXPIRED ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 font-medium mb-1">
                     {p.studentName} ({p.rollNumber})
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                     Requested: {p.requestedDate} | {p.requestedStartTime} - {p.requestedEndTime}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{p.reason}</p>
                </div>
                {p.aiVerification && (
                  <div className="mt-4 md:mt-0 text-right">
                    <span className="block text-xs text-gray-500 mb-1">AI Risk Assessment</span>
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      p.aiVerification.riskScore < 30 ? 'bg-green-50 text-green-700' : 
                      p.aiVerification.riskScore < 70 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    }`}>
                       Risk Score: {p.aiVerification.riskScore}/100
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
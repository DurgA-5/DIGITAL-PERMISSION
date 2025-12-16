import React, { useState } from 'react';
import { User, PermissionRequest, PermissionStatus } from '../types';
import { getPermissions } from '../services/storageService';

interface GeneralTeacherDashboardProps {
  user: User;
}

const GeneralTeacherDashboard: React.FC<GeneralTeacherDashboardProps> = ({ user }) => {
  const [dept, setDept] = useState('CAI'); // Default to CAI
  const [year, setYear] = useState('3');
  const [section, setSection] = useState('A');
  const [results, setResults] = useState<PermissionRequest[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const all = getPermissions();
    // Filter for approved permissions in that section
    const filtered = all.filter(p => 
      p.department === dept && 
      p.year === year && 
      p.section === section &&
      p.status === PermissionStatus.APPROVED
    ).sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '')); // Sort by Roll Number
    setResults(filtered);
    setSearched(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">View Class Permissions</h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm">
              <option value="CAI">CAI</option>
              <option value="CS">CS</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Year</label>
            <select value={year} onChange={e => setYear(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Section</label>
            <select value={section} onChange={e => setSection(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700">
            Fetch Permissions
          </button>
        </form>
      </div>

      {searched && (
        <div className="bg-white shadow rounded-xl overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
             <h3 className="font-semibold text-gray-700">Results for {dept} - {year} - {section}</h3>
          </div>
          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No approved permissions found for this class.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowed Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map(p => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{p.rollNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.studentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.permissionDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.startTime} - {p.endTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.approvedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneralTeacherDashboard;
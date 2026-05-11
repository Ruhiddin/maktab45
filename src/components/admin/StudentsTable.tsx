import React, { useState, useEffect } from 'react';
import { Search, Edit2, Save, X, UserX, UserCheck, DownloadCloud, AlertCircle } from 'lucide-react';
import { apiJson, apiRequestOrThrow } from '../../lib/apiClient';
import { normalizeErrorMessage } from '../../lib/clientErrors';
import ExcelImporter from './ExcelImporter';
import AdminTableSkeleton from './AdminTableSkeleton';
import { useToast } from '../toast/ToastProvider';

export interface AdminStudent {
  id: string;
  full_name: string;
  gender: 'male' | 'female';
  grade: number;
  section: string | null;
  total_score: number;
  is_active: boolean;
}

export default function StudentsTable() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and Searching
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  
  // Sorting
  const [sortField, setSortField] = useState<keyof AdminStudent>('full_name');
  const [sortAsc, setSortAsc] = useState(true);
  
  // Inline Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminStudent>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiJson<AdminStudent[]>('adminStudents', {
        token,
        fallbackError: 'Failed to fetch students',
      });
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSort = (field: keyof AdminStudent) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSortKeyDown = (event: React.KeyboardEvent<HTMLElement>, field: keyof AdminStudent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSort(field);
    }
  };

  const handleEditClick = (student: AdminStudent) => {
    setEditingId(student.id);
    setEditForm({ ...student });
  };

  const handleSaveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const token = localStorage.getItem('admin_token');
      const updated = await apiJson<Partial<AdminStudent>>('adminStudentById', {
        method: 'PUT',
        token,
        pathParams: { id },
        json: editForm,
        fallbackError: 'Failed to update student',
      });
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      setEditingId(null);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: normalizeErrorMessage(err.message),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleStatus = async (student: AdminStudent) => {
    if (!confirm(`Are you sure you want to ${student.is_active ? 'deactivate' : 'activate'} ${student.full_name}?`)) return;
    
    setSavingId(student.id);
    try {
      const token = localStorage.getItem('admin_token');
      await apiRequestOrThrow('adminStudentById', {
        method: student.is_active ? 'DELETE' : 'PUT',
        token,
        pathParams: { id: student.id },
        json: !student.is_active ? { is_active: true } : undefined,
        fallbackError: `Failed to ${student.is_active ? 'deactivate' : 'activate'}`,
      });
      
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: !student.is_active } : s));
    } catch (err: any) {
      showToast({
        type: 'error',
        title: `${student.is_active ? 'Deactivate' : 'Activate'} failed`,
        message: normalizeErrorMessage(err.message),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleImport = async (parsedData: any[]) => {
    const token = localStorage.getItem('admin_token');
    const result = await apiJson<{ created?: number; skipped?: number }>('adminStudentsImport', {
      method: 'POST',
      token,
      json: { students: parsedData },
      fallbackError: 'Import failed',
    });
    showToast({
      type: 'success',
      title: 'Import complete',
      message: `${result.created || 0} students created, ${result.skipped || 0} skipped.`,
    });
    setIsImportOpen(false);
    fetchStudents();
  };

  const handleDownloadTemplate = async () => {
    const csv = ['full_name,gender,grade,section', 'Ali Valiev,male,5,A'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter(s => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !s.is_active) return false;
      if (statusFilter === 'inactive' && s.is_active) return false;
    }
    if (gradeFilter !== 'all' && s.grade.toString() !== gradeFilter) return false;
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === null) return sortAsc ? 1 : -1;
    if (bVal === null) return sortAsc ? -1 : 1;
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center flex-1 w-full sm:w-auto">
            <div className="h-10 w-full max-w-sm rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-10 w-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-10 w-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
          <div className="h-10 w-full sm:w-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <AdminTableSkeleton columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p>{error}</p>
        <button onClick={fetchStudents} className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg">Retry</button>
      </div>
    );
  }

  const grades = Array.from(new Set(students.map(s => s.grade))).sort((a,b)=>a-b);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center flex-1 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <select 
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Grades</option>
            {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>

          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button 
          onClick={() => setIsImportOpen(true)}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
        >
          <DownloadCloud className="w-4 h-4" />
          Import Students
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('full_name')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'full_name')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'full_name' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  Name {sortField === 'full_name' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('grade')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'grade')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'grade' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  Class {sortField === 'grade' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('gender')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'gender')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'gender' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  Gender {sortField === 'gender' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('total_score')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'total_score')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'total_score' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  Score {sortField === 'total_score' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('is_active')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'is_active')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'is_active' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  Status {sortField === 'is_active' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {students.length === 0 ? 'No students yet.' : 'No students match the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isEditing = editingId === student.id;
                  const isSaving = savingId === student.id;

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editForm.full_name || ''} 
                            onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100"
                          />
                        ) : (
                          <div className="font-medium text-gray-900 dark:text-white">
                            {student.full_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="1" max="11"
                              value={editForm.grade || ''} 
                              onChange={e => setEditForm({...editForm, grade: parseInt(e.target.value) || 1})}
                              className="w-16 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100"
                            />
                            <input 
                              type="text" 
                              placeholder="Sec"
                              value={editForm.section || ''} 
                              onChange={e => setEditForm({...editForm, section: e.target.value})}
                              className="w-16 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium text-xs">
                            {student.grade}{student.section ? `-${student.section}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 capitalize text-gray-600 dark:text-gray-400">
                        {isEditing ? (
                          <select 
                            value={editForm.gender || 'male'}
                            onChange={e => setEditForm({...editForm, gender: e.target.value as 'male' | 'female'})}
                            className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        ) : (
                          student.gender
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {student.total_score}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          student.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={() => handleSaveEdit(student.id)} 
                              disabled={isSaving}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)} 
                              disabled={isSaving}
                              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleEditClick(student)}
                              disabled={isSaving}
                              className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(student)}
                              disabled={isSaving}
                              className={`p-1 rounded transition-colors ${
                                student.is_active 
                                  ? 'text-red-500 hover:bg-red-50' 
                                  : 'text-green-500 hover:bg-green-50'
                              }`}
                              title={student.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {student.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExcelImporter
        title="Import Students"
        description="Upload a CSV file to add new students in bulk."
        parseKind="students"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        expectedColumns={[
          { key: 'full_name', label: 'Full Name', required: true },
          { key: 'gender', label: 'Gender (male/female)', required: true },
          { key: 'grade', label: 'Grade (1-11)', required: true },
          { key: 'section', label: 'Section', required: false }
        ]}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}

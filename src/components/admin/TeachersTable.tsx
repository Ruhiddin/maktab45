import React, { useState, useEffect } from 'react';
import { Search, Edit2, Save, X, UserX, UserCheck, DownloadCloud, AlertCircle, KeyRound } from 'lucide-react';
import { apiJson, apiRequestOrThrow } from '../../lib/apiClient';
import { normalizeErrorMessage } from '../../lib/clientErrors';
import ExcelImporter from './ExcelImporter';
import AdminTableSkeleton from './AdminTableSkeleton';
import { useToast } from '../toast/ToastProvider';
import { getMessages, resolveRuntimeLocale, type Locale } from '../../lib/i18n';

export interface AdminTeacher {
  id: string;
  full_name: string;
  subjects: string[];
  is_password_changed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TeachersTable({ locale }: { locale: Locale }) {
  const { showToast } = useToast();
  const activeLocale = resolveRuntimeLocale(locale);
  const m = getMessages(activeLocale);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and Searching
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Sorting
  const [sortField, setSortField] = useState<keyof AdminTeacher>('full_name');
  const [sortAsc, setSortAsc] = useState(true);
  
  // Inline Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminTeacher>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiJson<AdminTeacher[]>('adminTeachers', {
        token,
        fallbackError: 'Failed to fetch teachers',
      });
      setTeachers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSort = (field: keyof AdminTeacher) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSortKeyDown = (event: React.KeyboardEvent<HTMLElement>, field: keyof AdminTeacher) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSort(field);
    }
  };

  const handleEditClick = (teacher: AdminTeacher) => {
    setEditingId(teacher.id);
    setEditForm({ ...teacher, subjects: [...teacher.subjects] });
  };

  const handleSaveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const token = localStorage.getItem('admin_token');
      
      // Handle subjects input (comma separated string -> array)
      let finalSubjects = editForm.subjects || [];
      if (typeof editForm.subjects === 'string') {
        finalSubjects = (editForm.subjects as string).split(',').map(s => s.trim()).filter(Boolean);
      }

      const payload = {
        ...editForm,
        subjects: finalSubjects
      };

      const updated = await apiJson<Partial<AdminTeacher>>('adminTeacherById', {
        method: 'PUT',
        token,
        pathParams: { id },
        json: payload,
        fallbackError: 'Failed to update teacher',
      });
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      setEditingId(null);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: m.admin.common.saveFailed,
        message: normalizeErrorMessage(err.message),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleStatus = async (teacher: AdminTeacher) => {
    const actionLabel = teacher.is_active ? m.admin.teachersTable.deactivate : m.admin.teachersTable.activate;
    if (!confirm(m.admin.teachersTable.confirmStatus.replace('{action}', actionLabel).replace('{name}', teacher.full_name))) return;
    
    setSavingId(teacher.id);
    try {
      const token = localStorage.getItem('admin_token');
      await apiRequestOrThrow('adminTeacherById', {
        method: teacher.is_active ? 'DELETE' : 'PUT',
        token,
        pathParams: { id: teacher.id },
        json: !teacher.is_active ? { is_active: true } : undefined,
        fallbackError: `Failed to ${teacher.is_active ? 'deactivate' : 'activate'}`,
      });
      
      setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, is_active: !teacher.is_active } : t));
    } catch (err: any) {
      showToast({
        type: 'error',
        title: teacher.is_active ? m.admin.teachersTable.deactivateFailed : m.admin.teachersTable.activateFailed,
        message: normalizeErrorMessage(err.message),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPassword = async (teacher: AdminTeacher) => {
    const newPassword = prompt(m.admin.teachersTable.resetPasswordPrompt.replace('{name}', teacher.full_name));
    if (!newPassword) return;

    if (newPassword.length < 6) {
      showToast({
        type: 'error',
        title: m.admin.teachersTable.resetPasswordTitle,
        message: m.admin.teachersTable.passwordMinLength,
      });
      return;
    }

    setSavingId(teacher.id);
    try {
      const token = localStorage.getItem('admin_token');
      await apiRequestOrThrow('adminTeacherResetPassword', {
        method: 'POST',
        token,
        pathParams: { id: teacher.id },
        json: { new_password: newPassword },
        fallbackError: 'Failed to reset password',
      });
      
      setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, is_password_changed: false } : t));
      showToast({
        type: 'success',
        title: m.admin.teachersTable.passwordChanged,
        message: m.admin.teachersTable.passwordResetSuccess.replace('{name}', teacher.full_name),
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: m.admin.teachersTable.resetPasswordTitle,
        message: normalizeErrorMessage(err.message),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleImport = async (parsedData: any[]) => {
    const token = localStorage.getItem('admin_token');
    const result = await apiJson<{ created?: number; updated?: number }>('adminTeachersImport', {
      method: 'POST',
      token,
      json: { teachers: parsedData },
      fallbackError: 'Import failed',
    });
    showToast({
      type: 'success',
      title: m.admin.common.importComplete,
      message: m.admin.teachersTable.successMessage
        .replace('{created}', String(result.created || 0))
        .replace('{updated}', String(result.updated || 0)),
    });
    setIsImportOpen(false);
    fetchTeachers();
  };

  const handleDownloadTemplate = async () => {
    const csv = ['full_name,subjects,default_password', '"Gulnora Karimova","Math, Algebra",password123'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'teachers_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredTeachers = teachers.filter(t => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !t.is_active) return false;
      if (statusFilter === 'inactive' && t.is_active) return false;
    }
    if (search && !t.full_name.toLowerCase().includes(search.toLowerCase())) return false;
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
          </div>
          <div className="h-10 w-full sm:w-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <AdminTableSkeleton columns={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p>{error}</p>
        <button onClick={fetchTeachers} className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg">{m.admin.common.retry}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center flex-1 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={m.admin.teachersTable.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100"
          >
            <option value="all">{m.admin.common.allStatus}</option>
            <option value="active">{m.admin.common.activeOnly}</option>
            <option value="inactive">{m.admin.common.inactiveOnly}</option>
          </select>
        </div>

        <button 
          onClick={() => setIsImportOpen(true)}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
        >
          <DownloadCloud className="w-4 h-4" />
          {m.admin.teachersTable.importButton}
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
                  {m.admin.common.name} {sortField === 'full_name' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('subjects')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'subjects')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'subjects' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  {m.admin.teachersTable.subjectsLabel}
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('is_password_changed')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'is_password_changed')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'is_password_changed' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  {m.admin.teachersTable.passwordStatus} {sortField === 'is_password_changed' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('is_active')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'is_active')}
                  tabIndex={0}
                  role="button"
                  aria-sort={sortField === 'is_active' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  {m.admin.common.status} {sortField === 'is_active' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-medium text-right">{m.admin.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {teachers.length === 0 ? m.admin.teachersTable.noTeachersYet : m.admin.teachersTable.noTeachersFiltered}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const isEditing = editingId === teacher.id;
                  const isSaving = savingId === teacher.id;

                  return (
                    <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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
                            {teacher.full_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={Array.isArray(editForm.subjects) ? editForm.subjects.join(', ') : editForm.subjects || ''} 
                            onChange={e => setEditForm({...editForm, subjects: e.target.value as any})}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder={m.admin.teachersTable.subjectsPlaceholder}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {teacher.subjects?.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          teacher.is_password_changed 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {teacher.is_password_changed ? m.admin.teachersTable.changed : m.admin.teachersTable.default}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          teacher.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {teacher.is_active ? m.admin.common.active : m.admin.common.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={() => handleSaveEdit(teacher.id)} 
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
                              onClick={() => handleResetPassword(teacher)}
                              disabled={isSaving}
                              className="p-1 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title={m.admin.teachersTable.resetPassword}
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEditClick(teacher)}
                              disabled={isSaving}
                              className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(teacher)}
                              disabled={isSaving}
                              className={`p-1 rounded transition-colors ${
                                teacher.is_active 
                                  ? 'text-red-500 hover:bg-red-50' 
                                  : 'text-green-500 hover:bg-green-50'
                              }`}
                              title={teacher.is_active ? m.admin.teachersTable.deactivate : m.admin.teachersTable.activate}
                            >
                              {teacher.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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
        title={m.admin.teachersTable.importTitle}
        description={m.admin.teachersTable.importDescription}
        locale={activeLocale}
        parseKind="teachers"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        expectedColumns={[
          { key: 'full_name', label: m.admin.common.name, required: true },
          { key: 'subjects', label: m.admin.teachersTable.subjectsLabel, required: false },
          { key: 'default_password', label: m.admin.teachersTable.defaultPassword, required: true }
        ]}
        sampleRows={[
          { full_name: 'Gulnora Karimova', subjects: 'Math, Algebra', default_password: 'Teacher123' },
          { full_name: 'Dilbar Alieva', subjects: 'Literature, Language', default_password: 'Teacher123' },
        ]}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}

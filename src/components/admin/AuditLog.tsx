import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronDown, ChevronRight, AlertCircle, Calendar } from 'lucide-react';
import { apiJson } from '../../lib/apiClient';
import AdminTableSkeleton from './AdminTableSkeleton';

interface AuditLogEntry {
  id: string;
  actor_type: 'admin' | 'teacher';
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
  actor_name?: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [teacherId, setTeacherId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 50;

  // Metadata for filters
  const [teachers, setTeachers] = useState<{id: string, full_name: string}[]>([]);
  
  // UI State
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchFiltersData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiJson<{id: string, full_name: string}[]>('authTeachersList', {
        token,
        fallbackError: 'Failed to fetch teachers for filters',
      });
      setTeachers(data);
    } catch (err) {
      console.error('Failed to fetch teachers for filters');
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const searchParams: Record<string, string> = {
        page: page.toString(),
        per_page: perPage.toString()
      };

      if (teacherId) searchParams.teacher_id = teacherId;
      if (actionFilter) searchParams.action = actionFilter;
      if (fromDate) searchParams.from_date = new Date(fromDate).toISOString();
      // To date should cover the whole day if specified
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        searchParams.to_date = endOfDay.toISOString();
      }

      const { data, total } = await apiJson<{ data: AuditLogEntry[]; total: number }>('adminAuditLog', {
        token,
        searchParams,
        fallbackError: 'Failed to fetch audit logs',
      });
      setLogs(data);
      setTotal(total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, teacherId, actionFilter, fromDate, toDate]);

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const actionTypes = [
    'admin.login',
    'student.import',
    'student.update',
    'student.deactivate',
    'teacher.import',
    'teacher.update',
    'teacher.reset_password',
    'teacher.deactivate',
    'qualification.create',
    'qualification.delete',
    'settings.update',
    'archive.create'
  ];
  const hasActiveFilters = Boolean(teacherId || actionFilter || fromDate || toDate);

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p>{error}</p>
        <button onClick={fetchLogs} className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          
          <div className="flex flex-wrap gap-4 items-start sm:items-center w-full">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by:</span>
            </div>

            <select 
              value={teacherId}
              onChange={e => { setTeacherId(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Actors</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>

            <select 
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setPage(1); }}
                className="bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none w-[110px]"
                style={{ colorScheme: 'dark' }}
                title="From Date"
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date" 
                value={toDate}
                onChange={e => { setToDate(e.target.value); setPage(1); }}
                className="bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none w-[110px]"
                style={{ colorScheme: 'dark' }}
                title="To Date"
              />
            </div>
          </div>

          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 w-full md:w-auto bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium w-10"></th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Actor</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-0 py-0">
                    <AdminTableSkeleton columns={5} rows={8} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {hasActiveFilters ? 'No activity found for the selected filters.' : 'No activity yet.'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleRow(log.id)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.actor_type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {log.actor_type}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-200">
                              {log.actor_name || 'System / Admin'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {log.target_type ? `${log.target_type} : ${log.target_id || 'all'}` : '-'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={5} className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="pl-8">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Payload Details</h4>
                              <pre className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg text-xs font-mono overflow-auto max-h-64 shadow-inner text-gray-800 dark:text-gray-300">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {total > 0 && (
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium">{(page - 1) * perPage + 1}</span> to <span className="font-medium">{Math.min(page * perPage, total)}</span> of <span className="font-medium">{total}</span> results
            </p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={page * perPage >= total || loading}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

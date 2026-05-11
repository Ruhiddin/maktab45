import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, DatabaseBackup } from 'lucide-react';
import { apiJson, apiRequestOrThrow } from '../../lib/apiClient';
import { useToast } from '../toast/ToastProvider';

export default function SettingsForm() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    school_name: '',
    available_sections: '',
    current_academic_year: '',
    new_password: '',
    confirm_password: ''
  });

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiJson<any>('adminSettings', {
        token,
        fallbackError: 'Failed to fetch settings',
      });
      
      setForm({
        school_name: data.school_name || '',
        available_sections: (data.available_sections || []).join(', '),
        current_academic_year: data.current_academic_year || '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password && form.new_password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (form.new_password && form.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const payload: any = {
        school_name: form.school_name,
        available_sections: form.available_sections,
        current_academic_year: form.current_academic_year,
      };

      if (form.new_password) {
        payload.new_password = form.new_password;
      }

      await apiRequestOrThrow('adminSettings', {
        method: 'PUT',
        token,
        json: payload,
        fallbackError: 'Failed to save settings',
      });
      
      showToast({
        type: 'success',
        title: 'Settings saved',
        message: form.new_password ? 'Settings and admin password were updated.' : 'School settings were updated.',
      });
      setForm(prev => ({ ...prev, new_password: '', confirm_password: '' }));
    } catch (err: any) {
      setError(err.message);
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you absolutely sure? This will archive current data, wipe all qualifications, and promote students to the next grade. This action cannot be undone.')) {
      return;
    }

    setArchiving(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      await apiRequestOrThrow('adminArchive', {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        fallbackError: 'Failed to archive',
      });
      
      showToast({
        type: 'success',
        title: 'Archive created',
        message: 'The archive was created and student grades were promoted.',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">General Settings</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">School Name</label>
              <input
                type="text"
                required
                value={form.school_name}
                onChange={e => setForm({...form, school_name: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Available Sections (Comma-separated)</label>
              <input
                type="text"
                placeholder="A, B, C, D"
                value={form.available_sections}
                onChange={e => setForm({...form, available_sections: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty if your school doesn't use letter sections.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Academic Year</label>
              <input
                type="text"
                required
                placeholder="2025-2026"
                value={form.current_academic_year}
                onChange={e => setForm({...form, current_academic_year: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Admin Password</h3>
            <p className="text-sm text-gray-500">Leave blank to keep your current password.</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={form.new_password}
                onChange={e => setForm({...form, new_password: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={form.confirm_password}
                onChange={e => setForm({...form, confirm_password: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Archive Section */}
      <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-500">
            <DatabaseBackup className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">End of Year Archive</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Running an archive will snapshot the current leaderboard, wipe all existing qualifications, 
              and promote all students to the next grade (e.g., Grade 5 becomes Grade 6). 
              <strong> This action is irreversible.</strong>
            </p>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {archiving ? 'Archiving...' : 'Start New Session & Archive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

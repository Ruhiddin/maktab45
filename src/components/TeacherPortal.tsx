import React, { useState, useEffect } from 'react';
import { resolveRuntimeLocale, type Locale } from '../lib/i18n';
import { hasProtectedApiBaseUrl } from '../lib/apiBase';
import TeacherLogin from './TeacherLogin';
import TeacherDashboard from './TeacherDashboard';
import ChangePasswordModal from './ChangePasswordModal';
import { ToastProvider } from './toast/ToastProvider';

interface TeacherProfile {
  id: string;
  full_name: string;
  subjects: string[];
  is_password_changed: boolean;
}

export default function TeacherPortal({ locale }: { locale: Locale }) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => resolveRuntimeLocale(locale));
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    setActiveLocale(resolveRuntimeLocale(locale));

    if (!hasProtectedApiBaseUrl()) {
      localStorage.removeItem('teacher_token');
      localStorage.removeItem('teacher_profile');
      return;
    }

    const storedToken = localStorage.getItem('teacher_token');
    const storedProfile = localStorage.getItem('teacher_profile');
    
    if (storedToken && storedProfile) {
      setToken(storedToken);
      try {
        setProfile(JSON.parse(storedProfile));
      } catch (e) {
        console.error('Failed to parse teacher profile from localStorage');
      }
    }
    const syncLocale = () => setActiveLocale(resolveRuntimeLocale(locale));
    window.addEventListener('popstate', syncLocale);
    return () => window.removeEventListener('popstate', syncLocale);
  }, [locale]);

  const handleLogin = (newToken: string, newProfile: TeacherProfile) => {
    setToken(newToken);
    setProfile(newProfile);
    
    if (!newProfile.is_password_changed) {
      setShowPasswordModal(true);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setProfile(null);
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_profile');
  };

  const handlePasswordChanged = (newToken: string) => {
    setShowPasswordModal(false);
    if (profile) {
      const updatedProfile = { ...profile, is_password_changed: true };
      setProfile(updatedProfile);
      localStorage.setItem('teacher_profile', JSON.stringify(updatedProfile));
    }
    // Token doesn't actually change in this implementation, but if it did, we'd update it here.
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('teacher_token', newToken);
    }
  };

  if (!token || !profile) {
    return <TeacherLogin locale={activeLocale} onLogin={handleLogin} />;
  }

  return (
    <ToastProvider>
    <>
      <TeacherDashboard locale={activeLocale} token={token} profile={profile} onLogout={handleLogout} />
      
      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordChanged}
      />
    </>
    </ToastProvider>
  );
}

import { spawn } from 'node:child_process';
import net from 'node:net';
import { access, mkdir, rm, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const cwd = process.cwd();
const currentYear = new Date().getFullYear();
const screenshotDir = path.join(os.tmpdir(), 'school-leaderboard-v2-e2e');
let port = 4325;
let baseUrl = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForServer(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting for Astro to boot.
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function getAvailablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to resolve an ephemeral port')));
        return;
      }

      const availablePort = address.port;
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve(availablePort);
      });
    });
  });
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd,
    env: {
      ...process.env,
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', chunk => process.stdout.write(String(chunk)));
  child.stderr.on('data', chunk => process.stderr.write(String(chunk)));
  return child;
}

async function stopDevServer(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill('SIGTERM');
  await new Promise(resolve => {
    child.once('close', resolve);
    child.once('exit', resolve);
    setTimeout(resolve, 5_000);
  });
}

async function api(pathname, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    text,
    json,
  };
}

async function adminLogin(password = process.env.ADMIN_PASSWORD || 'admin123') {
  const response = await api('/api/auth/admin/login', {
    method: 'POST',
    body: { password },
  });
  assert(response.status === 200, `Admin login failed: ${response.text}`);
  assert(response.json?.token, 'Admin login returned no token');
  return response.json.token;
}

async function teacherLogin(teacherId, password, expectedStatus = 200) {
  const response = await api('/api/auth/teacher/login', {
    method: 'POST',
    body: { teacher_id: teacherId, password },
  });
  assert(response.status === expectedStatus, `Teacher login expected ${expectedStatus}, got ${response.status}: ${response.text}`);
  return response;
}

async function verifyScreenshot(command, args, outputPath) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';

  child.stderr.on('data', chunk => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise(resolve => {
    child.on('close', resolve);
  });

  assert(exitCode === 0, `${command} screenshot failed: ${stderr.trim() || 'unknown error'}`);
  await stat(outputPath);
}

async function browserCommandIsUsable(command) {
  const child = spawn(command, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', chunk => {
    stdout += String(chunk);
  });
  child.stderr.on('data', chunk => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise(resolve => {
    child.on('close', resolve);
    child.on('error', () => resolve(1));
  });

  return {
    usable: exitCode === 0,
    details: (stdout || stderr).trim(),
  };
}

async function runBrowserRenderMatrix() {
  await rm(screenshotDir, { recursive: true, force: true });
  await mkdir(screenshotDir, { recursive: true });

  const pages = [
    { slug: 'leaderboard', url: `${baseUrl}/` },
    { slug: 'admin-login', url: `${baseUrl}/admin` },
    { slug: 'teacher-login', url: `${baseUrl}/teacher` },
  ];

  const widths = [
    { label: '375', width: 375, height: 812 },
    { label: '768', width: 768, height: 1024 },
    { label: '1280', width: 1280, height: 900 },
  ];

  const browserMatrix = [
    {
      name: 'chrome',
      command: process.platform === 'win32' ? 'chrome' : 'google-chrome',
      supported: true,
      buildArgs: (outputPath, page, viewport) => [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `--window-size=${viewport.width},${viewport.height}`,
        `--screenshot=${outputPath}`,
        page.url,
      ],
    },
    {
      name: 'firefox',
      command: 'firefox',
      supported: true,
      buildArgs: (outputPath, page, viewport) => [
        '--headless',
        '--window-size',
        `${viewport.width},${viewport.height}`,
        '--screenshot',
        outputPath,
        page.url,
      ],
    },
  ];

  for (const browser of browserMatrix) {
    const availability = await browserCommandIsUsable(browser.command);
    if (!availability.usable) {
      console.log(`Skipping ${browser.name} smoke: ${availability.details || 'browser command is unavailable on this host'}`);
      continue;
    }

    for (const page of pages) {
      for (const viewport of widths) {
        const outputPath = path.join(screenshotDir, `${browser.name}-${page.slug}-${viewport.label}.png`);
        await verifyScreenshot(browser.command, browser.buildArgs(outputPath, page, viewport), outputPath);
      }
    }
  }

  const safariDriverPath = process.platform === 'darwin' ? '/usr/bin/safaridriver' : null;
  if (safariDriverPath) {
    try {
      await access(safariDriverPath);
      console.log('Safari driver detected. WebKit smoke can be run on macOS hosts.');
    } catch {
      console.log('Safari driver not available on this macOS host. Skipping Safari smoke.');
    }
  } else {
    console.log('Safari smoke skipped on non-macOS host.');
  }
}

let archiveFilePath = null;
let server = null;

try {
  port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = startDevServer();
  await waitForServer(baseUrl);
  await mkdir(screenshotDir, { recursive: true });

  const suffix = Date.now().toString(36);
  const studentName = `E2E Student ${suffix}`;
  const teacherNameA = `E2E Teacher ${suffix} A`;
  const teacherNameB = `E2E Teacher ${suffix} B`;
  const teacherPasswordA = 'teach123';
  const teacherPasswordB = 'teach234';
  const updatedTeacherPasswordA = 'teach456';

  const adminForStudents = await adminLogin();
  const importStudents = await api('/api/admin/students/import', {
    method: 'POST',
    token: adminForStudents,
    body: {
      students: [
        { full_name: studentName, gender: 'male', grade: 6, section: 'A' },
      ],
    },
  });
  assert(importStudents.status === 200, `Student import failed: ${importStudents.text}`);
  assert(importStudents.json?.created === 1, `Expected 1 imported student, got: ${importStudents.text}`);

  const studentsAfterImport = await api('/api/admin/students', { token: adminForStudents });
  assert(studentsAfterImport.status === 200, `Failed to fetch students table data: ${studentsAfterImport.text}`);
  const importedStudent = studentsAfterImport.json?.find(student => student.full_name === studentName);
  assert(importedStudent, 'Imported student did not appear in the admin students table data');

  await sleep(1100);

  const adminForTeachers = await adminLogin();
  const importTeachers = await api('/api/admin/teachers/import', {
    method: 'POST',
    token: adminForTeachers,
    body: {
      teachers: [
        { full_name: teacherNameA, subjects: 'Math', default_password: teacherPasswordA },
        { full_name: teacherNameB, subjects: 'Physics', default_password: teacherPasswordB },
      ],
    },
  });
  assert(importTeachers.status === 200, `Teacher import failed: ${importTeachers.text}`);
  assert(importTeachers.json?.created === 2, `Expected 2 imported teachers, got: ${importTeachers.text}`);

  const teacherList = await api('/api/auth/teachers/list');
  assert(teacherList.status === 200, `Failed to fetch teacher list: ${teacherList.text}`);
  const teacherA = teacherList.json?.find(teacher => teacher.full_name === teacherNameA);
  const teacherB = teacherList.json?.find(teacher => teacher.full_name === teacherNameB);
  assert(teacherA?.id && teacherB?.id, 'Imported teachers did not appear in the teacher list');

  const teacherLoginA = await teacherLogin(teacherA.id, teacherPasswordA);
  const teacherTokenA = teacherLoginA.json?.token;
  const teacherLoginB = await teacherLogin(teacherB.id, teacherPasswordB);
  const teacherTokenB = teacherLoginB.json?.token;
  assert(teacherTokenA && teacherTokenB, 'Teacher login did not return tokens');

  await sleep(1100);

  const createQualification = await api('/api/qualifications', {
    method: 'POST',
    token: teacherTokenA,
    body: {
      student_id: importedStudent.id,
      category: 'Academic',
      subject: 'Math',
      value: 5,
      teacher_note: 'E2E verification',
    },
  });
  assert(createQualification.status === 201, `Qualification creation failed: ${createQualification.text}`);
  const createdQualificationId = createQualification.json?.id;
  assert(createdQualificationId, 'Qualification response did not include an id');

  const teacherActivity = await api('/api/teacher/activity', { token: teacherTokenA });
  assert(teacherActivity.status === 200, `Failed to fetch teacher activity: ${teacherActivity.text}`);
  const qualificationInActivity = teacherActivity.json?.find(entry => entry.id === createdQualificationId);
  assert(qualificationInActivity?.student_name === studentName, 'Qualification did not appear in the owner teacher activity feed');

  const leaderboardHtml = await fetch(`${baseUrl}/`).then(response => response.text());
  assert(leaderboardHtml.includes(studentName), 'Imported student did not appear on the leaderboard page');
  assert(
    new RegExp(`name&quot;:\\[0,&quot;${escapeRegExp(studentName)}&quot;\\][\\s\\S]{0,400}total_score&quot;:\\[0,5\\]`).test(leaderboardHtml),
    'Leaderboard page did not reflect the qualification score update'
  );

  const passwordChange = await api('/api/auth/teacher/change-password', {
    method: 'POST',
    token: teacherTokenA,
    body: {
      old_password: teacherPasswordA,
      new_password: updatedTeacherPasswordA,
    },
  });
  assert(passwordChange.status === 200, `Teacher password change failed: ${passwordChange.text}`);

  await teacherLogin(teacherA.id, teacherPasswordA, 401);
  const teacherRelogin = await teacherLogin(teacherA.id, updatedTeacherPasswordA);
  const teacherTokenAUpdated = teacherRelogin.json?.token;
  assert(teacherTokenAUpdated, 'Teacher re-login with new password returned no token');

  const otherTeacherUndo = await api(`/api/qualifications/${createdQualificationId}`, {
    method: 'DELETE',
    token: teacherTokenB,
  });
  assert(otherTeacherUndo.status === 403, `Other teacher should not be able to undo qualification: ${otherTeacherUndo.text}`);

  const ownerUndo = await api(`/api/qualifications/${createdQualificationId}`, {
    method: 'DELETE',
    token: teacherTokenAUpdated,
  });
  assert(ownerUndo.status === 200, `Owner teacher undo failed: ${ownerUndo.text}`);

  const teacherActivityAfterUndo = await api('/api/teacher/activity', { token: teacherTokenAUpdated });
  assert(teacherActivityAfterUndo.status === 200, `Failed to refetch teacher activity: ${teacherActivityAfterUndo.text}`);
  assert(
    !teacherActivityAfterUndo.json?.some(entry => entry.id === createdQualificationId),
    'Qualification still appeared in teacher activity after undo'
  );

  const adminForArchive = await adminLogin();
  const auditBeforeArchive = await api('/api/admin/audit-log?page=1&per_page=50', { token: adminForArchive });
  assert(auditBeforeArchive.status === 200, `Audit log fetch failed: ${auditBeforeArchive.text}`);
  const auditActions = auditBeforeArchive.json?.data ?? [];
  const studentImportAction = auditActions.find(entry => entry.action === 'student.import' && entry.details?.count === 1);
  const teacherImportAction = auditActions.find(entry => entry.action === 'teacher.import' && entry.details?.created === 2);
  const qualificationCreateAction = auditActions.find(entry => entry.action === 'qualification.create' && entry.target_id === importedStudent.id);
  const qualificationDeleteAction = auditActions.find(entry => entry.action === 'qualification.delete' && entry.target_id === importedStudent.id);
  const passwordChangeAction = auditActions.find(entry => entry.action === 'teacher.password_change' && entry.actor_id === teacherA.id);
  assert(studentImportAction, 'Audit log missing student.import entry');
  assert(teacherImportAction, 'Audit log missing teacher.import entry');
  assert(qualificationCreateAction, 'Audit log missing qualification.create entry');
  assert(qualificationDeleteAction, 'Audit log missing qualification.delete entry');
  assert(passwordChangeAction, 'Audit log missing teacher.password_change entry');

  const gradeBeforeArchive = importedStudent.grade;
  const archiveResponse = await api('/api/admin/archive', {
    method: 'POST',
    token: adminForArchive,
  });
  assert(archiveResponse.status === 201, `Archive creation failed: ${archiveResponse.text}`);
  const archiveFile = archiveResponse.json?.archive_file;
  assert(archiveFile, 'Archive response did not include archive file path');
  archiveFilePath = path.join(cwd, 'public', archiveFile.replace(/^\/+/, ''));
  await stat(archiveFilePath);

  const archiveJson = await fetch(`${baseUrl}${archiveFile}`).then(response => response.json());
  assert(archiveJson.year === currentYear, 'Archive file did not contain the current year');
  assert(Array.isArray(archiveJson.students) && archiveJson.students.length > 0, 'Archive file did not contain students');

  const studentsAfterArchive = await api('/api/admin/students', { token: adminForArchive });
  assert(studentsAfterArchive.status === 200, `Failed to fetch students after archive: ${studentsAfterArchive.text}`);
  const promotedStudent = studentsAfterArchive.json?.find(student => student.id === importedStudent.id);
  assert(promotedStudent?.grade === gradeBeforeArchive + 1, 'Archive did not promote the imported student grade');

  const teacherActivityAfterArchive = await api('/api/teacher/activity', { token: teacherTokenAUpdated });
  assert(teacherActivityAfterArchive.status === 200, `Failed to fetch teacher activity after archive: ${teacherActivityAfterArchive.text}`);
  assert(teacherActivityAfterArchive.json?.length === 0, 'Archive did not clear teacher qualification activity');

  const auditAfterArchive = await api('/api/admin/audit-log?page=1&per_page=50', { token: adminForArchive });
  assert(auditAfterArchive.status === 200, `Audit log refetch failed: ${auditAfterArchive.text}`);
  assert(
    auditAfterArchive.json?.data?.some(entry => entry.action === 'archive.create' && entry.details?.year === currentYear),
    'Audit log missing archive.create entry'
  );

  await runBrowserRenderMatrix();

  console.log('V2 phase 15.7 smoke suite passed.');
} finally {
  if (archiveFilePath) {
    await unlink(archiveFilePath).catch(() => {});
  }

  await stopDevServer(server);
}

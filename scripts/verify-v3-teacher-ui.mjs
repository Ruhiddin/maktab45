import fs from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function read(relativePath) {
  return await fs.readFile(path.join(cwd, relativePath), 'utf8');
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(cwd, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function verifyStaticTeacherPages() {
  assert(await exists('dist/teachers/index.html'), 'Missing static teachers page in dist output.');
  assert(await exists('dist/teacher-profile/index.html'), 'Missing static teacher-profile page in dist output.');

  const teachersPage = await read('src/pages/teachers.astro');
  const teacherProfilePage = await read('src/pages/teacher-profile.astro');

  assert(teachersPage.includes('export const prerender = true;'), 'teachers.astro is not prerendered.');
  assert(teacherProfilePage.includes('export const prerender = true;'), 'teacher-profile.astro is not prerendered.');
  assert(teacherProfilePage.includes('teacherId={null}'), 'teacher-profile route is not configured for query-param detail loading.');
}

async function verifyTeacherCardToDetailLinking() {
  const leaderboard = await read('src/components/TeacherLeaderboard.tsx');
  const podium = await read('src/components/TeacherPodium.tsx');

  assert(leaderboard.includes('const buildTeacherDetailHref = (teacherId: string)'), 'Teacher leaderboard does not construct detail hrefs.');
  assert(leaderboard.includes('href={buildTeacherDetailHref(teacher.teacher_id)}'), 'Teacher rows/cards are not linked to teacher detail.');
  assert(leaderboard.includes('<TeacherPodium') && leaderboard.includes('buildTeacherDetailHref={buildTeacherDetailHref}'), 'Teacher podium is not wired to teacher detail links.');
  assert(podium.includes('href={href}'), 'Teacher podium cards are not linked.');
}

async function verifyLocaleSwitchingWiring() {
  const leaderboard = await read('src/components/TeacherLeaderboard.tsx');
  const leaderboardView = await read('src/components/TeacherLeaderboardView.tsx');
  const detail = await read('src/components/TeacherDetail.tsx');
  const detailView = await read('src/components/TeacherDetailView.tsx');

  assert(leaderboard.includes("buildLocaleHref(buildTeacherProfileHref(teacherId, selectedYear), locale)"), 'Teacher detail links do not preserve locale.');
  assert(leaderboardView.includes("buildLocaleHref('/', activeLocale, selectedYear ? `year=${selectedYear}` : null)"), 'Teacher leaderboard back-link does not preserve locale.');
  assert(detail.includes("buildLocaleHref('/teachers', locale, selectedYear ? `year=${selectedYear}` : null)"), 'Teacher detail summary link does not preserve locale.');
  assert(detailView.includes('resolveRuntimeLocale(locale)'), 'Teacher detail view does not react to runtime locale.');
}

async function verifyArchiveYearSwitchingWiring() {
  const yearPicker = await read('src/components/ClientStudyYearPicker.tsx');
  const leaderboardView = await read('src/components/TeacherLeaderboardView.tsx');
  const detailView = await read('src/components/TeacherDetailView.tsx');

  assert(yearPicker.includes('preservedSearchParams'), 'ClientStudyYearPicker does not preserve route-specific query params.');
  assert(yearPicker.includes("params.set('year', year)") && yearPicker.includes("params.delete('year')"), 'ClientStudyYearPicker does not switch year params correctly.');
  assert(leaderboardView.includes('archiveYears={archiveYears}') && leaderboardView.includes('selectedYear={selectedYear}'), 'Teacher leaderboard page is not wired to archive year UI.');
  assert(detailView.includes("preservedSearchParams={activeTeacherId ? `id=${activeTeacherId}` : null}"), 'Teacher detail page does not preserve teacher id while switching archive years.');
}

async function main() {
  await verifyStaticTeacherPages();
  await verifyTeacherCardToDetailLinking();
  await verifyLocaleSwitchingWiring();
  await verifyArchiveYearSwitchingWiring();

  console.log('Teacher UI verification passed for teacher-card navigation, static-safe teacher routes, locale wiring, and archive-year wiring.');
  console.log('Live Supabase rendering was not verified in this script and remains a manual/real-backend check.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

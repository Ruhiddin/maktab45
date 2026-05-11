// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

const githubRepository = process.env.GITHUB_REPOSITORY || '';
const [githubOwner, githubRepo] = githubRepository.split('/');
const isGitHubPagesDeploy = process.env.GITHUB_ACTIONS === 'true' && Boolean(githubOwner && githubRepo);
const isUserOrOrgPagesRepo = githubOwner && githubRepo === `${githubOwner}.github.io`;
const derivedBasePath =
  process.env.PUBLIC_SITE_BASE_PATH ||
  (isGitHubPagesDeploy && !isUserOrOrgPagesRepo && githubRepo ? `/${githubRepo}` : '/');
const derivedSiteUrl =
  process.env.PUBLIC_SITE_URL ||
  (isGitHubPagesDeploy && githubOwner
    ? `https://${githubOwner}.github.io`
    : undefined);

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: derivedSiteUrl,
  base: derivedBasePath,
  integrations: [react(), tailwind()]
});

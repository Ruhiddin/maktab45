/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			screens: {
				eboard: { raw: '(min-width: 1024px) and (max-height: 900px)' },
			},
		},
	},
	plugins: [],
}

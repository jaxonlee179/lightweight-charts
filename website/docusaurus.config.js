// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const organizationName = process.env.GITHUB_ORGANIZATION_NAME || 'tradingview';
const projectName = 'lightweight-charts';
const projectUrl = `https://github.com/${organizationName}/${projectName}`;
const githubPagesUrl = `https://${organizationName}.github.io/`;

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'Lightweight Charts',
	tagline: 'Small and fast financial charts',
	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',
	favicon: 'img/favicon.ico',
	noIndex: true,
	url: githubPagesUrl,
	baseUrl: `/${projectName}/`,
	organizationName,
	projectName: 'lightweight-charts',

	presets: [
		[
			'@docusaurus/preset-classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					sidebarPath: require.resolve('./sidebars.js'),
					routeBasePath: '/',
				},
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
			}),
		],
	],

	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			navbar: {
				title: 'Lightweight Charts',
				logo: {
					alt: 'Lightweight Charts Logo',
					src: 'img/logo.svg',
				},
				items: [
					{
						type: 'doc',
						docId: 'intro',
						position: 'left',
						label: 'Getting Started',
					},
					{
						type: 'doc',
						docId: 'api/index',
						position: 'left',
						label: 'API Reference',
					},
					{
						href: projectUrl,
						label: 'GitHub',
						position: 'right',
					},
				],
			},
			footer: {
				style: 'dark',
				links: [
					{
						title: 'Docs',
						items: [
							{
								label: 'Getting Started',
								to: '/',
							},
							{
								label: 'API Reference',
								to: 'api/',
							},
						],
					},
					{
						title: 'Community',
						items: [
							{
								label: 'Stack Overflow',
								href: 'https://stackoverflow.com/questions/tagged/lightweight-charts',
							},
							{
								label: 'Discord',
								href: 'https://discord.gg/E6UthXZ',
							},
							{
								label: 'Twitter',
								href: 'https://twitter.com/tradingview',
							},
						],
					},
					{
						title: 'More',
						items: [
							{
								label: 'GitHub',
								href: projectUrl,
							},
						],
					},
				],
				copyright: `Copyright © ${new Date().getFullYear()} TradingView, Inc. Built with Docusaurus.`,
			},
			prism: {
				theme: lightCodeTheme,
				darkTheme: darkCodeTheme,
			},
		}),

	plugins: [
		[
			'docusaurus-plugin-typedoc',
			/** @type {Partial<import('docusaurus-plugin-typedoc/dist/types').PluginOptions> & import('typedoc/dist/index').TypeDocOptions} */
			({
				entryPoints: ['../dist/typings.d.ts'],
				readme: 'none',
				disableSources: true,
			}),
		],
	],
};

module.exports = config;

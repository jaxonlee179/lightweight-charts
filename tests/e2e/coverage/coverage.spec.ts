/// <reference types="node" />

import * as fs from 'fs';
import * as path from 'path';

import { expect } from 'chai';
import { describe, it } from 'mocha';
import puppeteer, {
	BoundingBox,
	Browser,
	ConsoleMessage,
	ElementHandle,
	HTTPResponse,
	launch as launchPuppeteer,
	Page,
	type CDPSession,
} from 'puppeteer';

import { expectedCoverage, threshold } from './coverage-config';

const coverageScript = fs.readFileSync(path.join(__dirname, 'coverage-script.js'), { encoding: 'utf-8' });

const testStandalonePathEnvKey = 'TEST_STANDALONE_PATH';

const testStandalonePath: string = process.env[testStandalonePathEnvKey] || '';

async function doMouseScrolls(page: Page, element: ElementHandle): Promise<void> {
	const boundingBox = await element.boundingBox();
	if (!boundingBox) {
		throw new Error('Unable to get boundingBox for element.');
	}

	// move mouse to center of element
	await page.mouse.move(
	boundingBox.x + boundingBox.width / 2,
	boundingBox.y + boundingBox.height / 2
	);

	await page.mouse.wheel({ deltaX: 10.0 });

	await page.mouse.wheel({ deltaY: 10.0 });

	await page.mouse.wheel({ deltaX: -10.0 });

	await page.mouse.wheel({ deltaY: -10.0 });

	await page.mouse.wheel({ deltaX: 10.0, deltaY: 10.0 });

	await page.mouse.wheel({ deltaX: -10.0, deltaY: -10.0 });
}

async function doZoomInZoomOut(page: Page): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const prevViewport = page.viewport()!;
	await page.setViewport({
		...prevViewport,
		deviceScaleFactor: 2,
	});

	await page.setViewport(prevViewport);
}

async function doVerticalDrag(page: Page, element: ElementHandle): Promise<void> {
	const elBox = await element.boundingBox() as BoundingBox;

	const elMiddleX = elBox.x + elBox.width / 2;
	const elMiddleY = elBox.y + elBox.height / 2;

	// move mouse to the middle of element
	await page.mouse.move(elMiddleX, elMiddleY);

	await page.mouse.down({ button: 'left' });
	await page.mouse.move(elMiddleX, elMiddleY - 20);
	await page.mouse.move(elMiddleX, elMiddleY + 40);
	await page.mouse.up({ button: 'left' });
}

async function doHorizontalDrag(page: Page, element: ElementHandle): Promise<void> {
	const elBox = await element.boundingBox() as BoundingBox;

	const elMiddleX = elBox.x + elBox.width / 2;
	const elMiddleY = elBox.y + elBox.height / 2;

	// move mouse to the middle of element
	await page.mouse.move(elMiddleX, elMiddleY);

	await page.mouse.down({ button: 'left' });
	await page.mouse.move(elMiddleX - 20, elMiddleY);
	await page.mouse.move(elMiddleX + 40, elMiddleY);
	await page.mouse.up({ button: 'left' });
}

// await a setTimeout delay evaluated within page context
async function pageTimeout(page: Page, delay: number): Promise<void> {
	return page.evaluate(
		(ms: number) => new Promise<void>(
			(resolve: () => void) => setTimeout(resolve, ms)
			),
		delay
	);
}

async function doKineticAnimation(page: Page, element: ElementHandle): Promise<void> {
	const elBox = await element.boundingBox() as BoundingBox;

	const elMiddleX = elBox.x + elBox.width / 2;
	const elMiddleY = elBox.y + elBox.height / 2;

	// move mouse to the middle of element
	await page.mouse.move(elMiddleX, elMiddleY);

	await page.mouse.down({ button: 'left' });
	await pageTimeout(page, 50);
	await page.mouse.move(elMiddleX - 40, elMiddleY);
	await page.mouse.move(elMiddleX - 55, elMiddleY);
	await page.mouse.move(elMiddleX - 105, elMiddleY);
	await page.mouse.move(elMiddleX - 155, elMiddleY);
	await page.mouse.move(elMiddleX - 205, elMiddleY);
	await page.mouse.move(elMiddleX - 255, elMiddleY);
	await page.mouse.up({ button: 'left' });

	await pageTimeout(page, 200);
	// stop animation
	await page.mouse.down({ button: 'left' });
	await page.mouse.up({ button: 'left' });
}

// Simulate a long touch action in a single position
async function doLongTouch(page: Page, element: ElementHandle, duration: number): Promise<void> {
	const elBox = (await element.boundingBox()) as BoundingBox;

	const elCenterX = elBox.x + elBox.width / 2;
	const elCenterY = elBox.y + elBox.height / 2;

	const client = await page.target().createCDPSession();

	await client.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [
			{ x: elCenterX, y: elCenterY },
		],
	});
	await pageTimeout(page, duration);
	return client.send('Input.dispatchTouchEvent', {
		type: 'touchEnd',
		touchPoints: [
			{ x: elCenterX, y: elCenterY },
		],
	});
}

// Simulate a touch swipe gesture
async function doSwipeTouch(
	devToolsSession: CDPSession,
	element: ElementHandle,
	{
		horizontal = false,
		vertical = false,
	}: { horizontal?: boolean; vertical?: boolean }
): Promise<void> {
	const elBox = (await element.boundingBox()) as BoundingBox;

	const elCenterX = elBox.x + elBox.width / 2;
	const elCenterY = elBox.y + elBox.height / 2;
	const xStep = horizontal ? elBox.width / 8 : 0;
	const yStep = vertical ? elBox.height / 8 : 0;

	for (let i = 2; i > 0; i--) {
		const type = i === 2 ? 'touchStart' : 'touchMove';
		await devToolsSession.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: [{ x: elCenterX - i * xStep, y: elCenterY - i * yStep }],
		});
	}
	return devToolsSession.send('Input.dispatchTouchEvent', {
		type: 'touchEnd',
		touchPoints: [{ x: elCenterX - xStep, y: elCenterY - yStep }],
	});
}

// Perform a pinch or zoom touch gesture within the specified element.
async function doPinchZoomTouch(
	devToolsSession: CDPSession,
	element: ElementHandle,
	zoom?: boolean
): Promise<void> {
	const elBox = (await element.boundingBox()) as BoundingBox;

	const sign = zoom ? -1 : 1;
	const elCenterX = elBox.x + elBox.width / 2;
	const elCenterY = elBox.y + elBox.height / 2;
	const xStep = (sign * elBox.width) / 8;
	const yStep = (sign * elBox.height) / 8;

	for (let i = 2; i > 0; i--) {
		const type = i === 2 ? 'touchStart' : 'touchMove';
		await devToolsSession.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: [
				{ x: elCenterX - i * xStep, y: elCenterY - i * yStep },
				{ x: elCenterX + i * xStep, y: elCenterY + i * xStep },
			],
		});
	}
	return devToolsSession.send('Input.dispatchTouchEvent', {
		type: 'touchEnd',
		touchPoints: [
			{ x: elCenterX - xStep, y: elCenterY - yStep },
			{ x: elCenterX + xStep, y: elCenterY + xStep },
		],
	});
}

async function doUserInteractions(page: Page): Promise<void> {
	const chartContainer = await page.$('#container') as ElementHandle<Element>;
	const chartBox = await chartContainer.boundingBox() as BoundingBox;

	// move cursor to the middle of the chart
	await page.mouse.move(chartBox.width / 2, chartBox.height / 2);

	const leftPriceAxis = (await chartContainer.$$('tr:nth-of-type(1) td:nth-of-type(1) div canvas'))[0];
	const paneWidget = (await chartContainer.$$('tr:nth-of-type(1) td:nth-of-type(2) div canvas'))[0];
	const rightPriceAxis = (await chartContainer.$$('tr:nth-of-type(1) td:nth-of-type(3) div canvas'))[0];
	const timeAxis = (await chartContainer.$$('tr:nth-of-type(2) td:nth-of-type(2) div canvas'))[0];

	// mouse scroll
	await doMouseScrolls(page, chartContainer);

	// outside click
	await page.mouse.click(chartBox.x + chartBox.width + 20, chartBox.y + chartBox.height + 50, { button: 'left' });

	// change viewport zoom
	await doZoomInZoomOut(page);

	// drag price scale
	await doVerticalDrag(page, leftPriceAxis);
	await doVerticalDrag(page, rightPriceAxis);

	// drag time scale
	await doHorizontalDrag(page, timeAxis);

	// drag pane
	await doVerticalDrag(page, paneWidget);
	await doVerticalDrag(page, paneWidget);

	// clicks on scales
	await leftPriceAxis.click({ button: 'left' });
	await leftPriceAxis.click({ button: 'left', clickCount: 2 });

	await rightPriceAxis.click({ button: 'left' });
	await rightPriceAxis.click({ button: 'left', clickCount: 2 });

	await timeAxis.click({ button: 'left' });
	await timeAxis.click({ button: 'left', clickCount: 2 });

	// simulate a tap event
	await page.touchscreen.tap(
		chartBox.x + chartBox.width / 2,
		chartBox.y + chartBox.height / 2
	);

	const devToolsSession = await page.target().createCDPSession();

	await doPinchZoomTouch(devToolsSession, chartContainer);
	await doPinchZoomTouch(devToolsSession, chartContainer, true);

	await doSwipeTouch(devToolsSession, leftPriceAxis, { vertical: true });
	await doSwipeTouch(devToolsSession, paneWidget, { vertical: true });
	await doSwipeTouch(devToolsSession, timeAxis, { horizontal: true });

	await doSwipeTouch(devToolsSession, chartContainer, {
		horizontal: true,
		vertical: true,
	});

	await doLongTouch(page, chartContainer, 500);

	await doKineticAnimation(page, timeAxis);
}

interface CoverageResult {
	usedBytes: number;
	totalBytes: number;
}

interface InternalWindow {
	finishTestCasePromise: Promise<() => void>;
}

function rmRf(dir: string): void {
	if (!fs.existsSync(dir)) {
		return;
	}

	fs.readdirSync(dir).forEach((file: string) => {
		const filePath = path.join(dir, file);
		if (fs.lstatSync(filePath).isDirectory()) {
			rmRf(filePath);
		} else {
			fs.unlinkSync(filePath);
		}
	});

	fs.rmdirSync(dir);
}

function generateAndSaveCoverageFile(coverageEntries: puppeteer.JSCoverageEntry[]): void {
	// Create output directory
	const outDir = path.resolve(process.env.CMP_OUT_DIR || path.join(__dirname, '.gendata'));
	rmRf(outDir);
	fs.mkdirSync(outDir, { recursive: true });

	const getFileNameFromUrl = (url: string): string => url.split('/').at(-1) ?? '';

	for (const entry of coverageEntries) {
		let coveredJs = '';

		const fileName = getFileNameFromUrl(entry.url);
		// Only output the coverage for the file being tested
		if (fileName === 'test.js') {
			for (const range of entry.ranges) {
				coveredJs += entry.text.slice(range.start, range.end) + '\n';
			}

			// Create and export each coverage JS file
			try {
				fs.writeFileSync(path.join(outDir, 'covered.js'), coveredJs);
				console.info('\nGenerated `covered.js` file for the coverage test.\n');
			} catch (error: unknown) {
				console.warn('Unable to save `covered.js` file for the coverage test.');
				console.error(error);
			}
		}
	}
}

async function getCoverageResult(page: Page): Promise<Map<string, CoverageResult>> {
	const coverageEntries = await page.coverage.stopJSCoverage();

	if (process.env.GENERATE_COVERAGE_FILE === 'true') {
		generateAndSaveCoverageFile(coverageEntries);
	}

	const result = new Map<string, CoverageResult>();

	for (const entry of coverageEntries) {
		let entryRes = result.get(entry.url);
		if (entryRes === undefined) {
			entryRes = {
				totalBytes: 0,
				usedBytes: 0,
			};

			result.set(entry.url, entryRes);
		}

		entryRes.totalBytes += entry.text.length;

		for (const range of entry.ranges) {
			entryRes.usedBytes += range.end - range.start;
		}

		result.set(entry.url, entryRes);
	}

	return result;
}

describe('Coverage tests', () => {
	const puppeteerOptions: Parameters<typeof launchPuppeteer>[0] = {};
	if (process.env.NO_SANDBOX) {
		puppeteerOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
	}

	let browser: Browser;

	before(async () => {
		expect(testStandalonePath, `path to test standalone module must be passed via ${testStandalonePathEnvKey} env var`)
			.to.have.length.greaterThan(0);

		// note that we cannot use launchPuppeteer here as soon it wrong typing in puppeteer
		// see https://github.com/puppeteer/puppeteer/issues/7529
		const browserPromise = puppeteer.launch(puppeteerOptions);
		browser = await browserPromise;
	});

	async function runTest(onError: (errorMsg: string) => void): Promise<void> {
		const page = await browser.newPage();
		await page.coverage.startJSCoverage();

		page.on('pageerror', (error: Error) => {
			onError(`Page error: ${error.message}`);
		});

		page.on('console', (message: ConsoleMessage) => {
			const type = message.type();
			if (type === 'error' || type === 'assert') {
				onError(`Console ${type}: ${message.text()}`);
			}
		});

		page.on('response', (response: HTTPResponse) => {
			if (!response.ok()) {
				onError(`Network error: ${response.url()} status=${response.status()}`);
			}
		});

		await page.setContent(`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0">
					<title>Test case page</title>
				</head>

				<body style="padding: 0; margin: 0;">
					<div id="container" style="position: absolute; width: 100%; height: 100%;"></div>

					<script type="text/javascript" src="${testStandalonePath}"></script>
					<script type="text/javascript">${coverageScript}</script>

					<script type="text/javascript">
						window.finishTestCasePromise = runTestCase(document.getElementById('container'));
					</script>
				</body>
			</html>
		`);

		// first, wait until test case is ready
		await page.evaluate(() => {
			return (window as unknown as InternalWindow).finishTestCasePromise;
		});

		// now let's do some user's interactions
		await doUserInteractions(page);

		// finish test case
		await page.evaluate(() => {
			return (window as unknown as InternalWindow).finishTestCasePromise.then((finishTestCase: () => void) => finishTestCase());
		});

		const result = await getCoverageResult(page);
		const libraryRes = result.get(testStandalonePath) as CoverageResult;
		expect(libraryRes).not.to.be.equal(undefined);

		const currentCoverage = parseFloat((libraryRes.usedBytes / libraryRes.totalBytes * 100).toFixed(1));
		expect(currentCoverage).to.be.closeTo(expectedCoverage, threshold, `Please either update config to pass the test or improve coverage`);

		console.log(`Current coverage is ${currentCoverage.toFixed(1)}% (${formatChange(currentCoverage - expectedCoverage)}%)`);
	}

	it(`should have coverage around ${expectedCoverage.toFixed(1)}% (±${threshold.toFixed(1)}%)`, async () => {
		return new Promise((resolve: () => void, reject: () => void) => {
			runTest(reject).then(resolve).catch(reject);
		});
	});

	after(async () => {
		await browser.close();
	});
});

function formatChange(change: number): string {
	return change < 0 ? change.toFixed(1) : `+${change.toFixed(1)}`;
}

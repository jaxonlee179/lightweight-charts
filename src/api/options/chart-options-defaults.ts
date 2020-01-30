import { ChartOptions } from '../../model/chart-model';

import { crosshairOptionsDefaults } from './crosshair-options-defaults';
import { gridOptionsDefaults } from './grid-options-defaults';
import { layoutOptionsDefaults } from './layout-options-defaults';
import { priceScaleOptionsDefaults } from './price-scale-options-defaults';
import { timeScaleOptionsDefaults } from './time-scale-options-defaults';
import { watermarkOptionsDefaults } from './watermark-options-defaults';

export const chartOptionsDefaults: ChartOptions = {
	width: 0,
	height: 0,
	layout: layoutOptionsDefaults,
	crosshair: crosshairOptionsDefaults,
	grid: gridOptionsDefaults,
	priceScale: priceScaleOptionsDefaults,
	leftPriceScale: {
		...priceScaleOptionsDefaults,
		visible: false,
	},
	rightPriceScale: {
		...priceScaleOptionsDefaults,
		visible: true,
	},
	timeScale: timeScaleOptionsDefaults,
	watermark: watermarkOptionsDefaults,
	localization: {
		locale: navigator.language,
		dateFormat: 'dd MMM \'yy',
	},
	handleScroll: {
		mouseWheel: true,
		pressedMouseMove: true,
		horzTouchDrag: true,
		vertTouchDrag: true,
	},
	handleScale: {
		axisPressedMouseMove: true,
		axisDoubleClickReset: true,
		mouseWheel: true,
		pinch: true,
	},
};

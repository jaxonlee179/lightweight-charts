import { ensureNotNull } from '../helpers/assertions';
import { clone, DeepPartial, isString, merge } from '../helpers/strict-type-checks';

import { ChartOptions, ChartOptionsInternal } from '../model/chart-model';

import { ChartApi, toInternalOptions } from './chart-api';
import { IChartApi } from './ichart-api';
import { chartOptionsDefaults } from './options/chart-options-defaults';

export { LineStyle, LineType, LineWidth } from '../renderers/draw-line';

export { BarPrice } from '../model/bar';
export { CrosshairMode } from '../model/crosshair';
export { PriceScaleMode } from '../model/price-scale';
export { UTCTimestamp } from '../model/time-data';

export { IChartApi, MouseEventParams } from './ichart-api';
export { ISeriesApi } from './iseries-api';

export {
	BarData,
	HistogramData,
	isBusinessDay,
	isUTCTimestamp,
	LineData,
} from './data-consumer';

/**
 * This function is the main entry point of the Lightweight Charting Library
 * @param container - id of HTML element or element itself
 * @param options - any subset of ChartOptions to be applied at start.
 * @returns an interface to the created chart
 */
export function createChart(container: string | HTMLElement, options?: DeepPartial<ChartOptions>): IChartApi {
	const htmlElement = ensureNotNull(isString(container) ? document.getElementById(container) : container);
	const chartOptions = (options === undefined) ?
		clone(chartOptionsDefaults) :
		merge(clone(chartOptionsDefaults), toInternalOptions(options)) as ChartOptionsInternal;

	return new ChartApi(htmlElement, chartOptions);
}

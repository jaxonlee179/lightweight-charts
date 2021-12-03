import { WhitespacePlotRow } from '../model/plot-data';
import { SeriesPlotRow } from '../model/series-data';
import { SeriesType } from '../model/series-options';
import { TimePoint, TimePointIndex } from '../model/time-data';

import { BarData, HistogramData, isWhitespaceData, LineData, SeriesDataItemTypeMap } from './data-consumer';

function getLineBasedSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: LineData | HistogramData, original: unknown): Mutable<SeriesPlotRow<'Line' | 'Histogram'>> {
	const val = item.value;

	const res: Mutable<SeriesPlotRow<'Histogram'>> = { index, time, value: [val, val, val, val], original };

	// 'color' here is public property (from API) so we can use `in` here safely
	// eslint-disable-next-line no-restricted-syntax
	if ('color' in item && item.color !== undefined) {
		res.color = item.color;
	}

	return res;
}

function getOHLCBasedSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: BarData, original: unknown): Mutable<SeriesPlotRow> {
	return { index, time, value: [item.open, item.high, item.low, item.close], original };
}

export function isSeriesPlotRow(row: SeriesPlotRow | WhitespacePlotRow): row is SeriesPlotRow {
	return (row as Partial<SeriesPlotRow>).value !== undefined;
}

// we want to have compile-time checks that the type of the functions is correct
// but due contravariance we cannot easily use type of values of the SeriesItemValueFnMap map itself
// so let's use TimedSeriesItemValueFn for shut up the compiler in seriesItemValueFn
// we need to be sure (and we're sure actually) that stored data has correct type for it's according series object
type SeriesItemValueFnMap = {
	[T in keyof SeriesDataItemTypeMap]: (time: TimePoint, index: TimePointIndex, item: SeriesDataItemTypeMap[T], original: unknown) => Mutable<SeriesPlotRow | WhitespacePlotRow>;
};

export type TimedSeriesItemValueFn = (time: TimePoint, index: TimePointIndex, item: SeriesDataItemTypeMap[SeriesType], original: unknown) => Mutable<SeriesPlotRow | WhitespacePlotRow>;

function wrapWhitespaceData(createPlotRowFn: (typeof getLineBasedSeriesPlotRow) | (typeof getOHLCBasedSeriesPlotRow)): TimedSeriesItemValueFn {
	return (time: TimePoint, index: TimePointIndex, bar: SeriesDataItemTypeMap[SeriesType], original: unknown) => {
		if (isWhitespaceData(bar)) {
			return { time, index, original };
		}

		return createPlotRowFn(time, index, bar, original);
	};
}

const seriesPlotRowFnMap: SeriesItemValueFnMap = {
	Candlestick: wrapWhitespaceData(getOHLCBasedSeriesPlotRow),
	Bar: wrapWhitespaceData(getOHLCBasedSeriesPlotRow),
	Area: wrapWhitespaceData(getLineBasedSeriesPlotRow),
	Baseline: wrapWhitespaceData(getLineBasedSeriesPlotRow),
	Histogram: wrapWhitespaceData(getLineBasedSeriesPlotRow),
	Line: wrapWhitespaceData(getLineBasedSeriesPlotRow),
};

export function getSeriesPlotRowCreator(seriesType: SeriesType): TimedSeriesItemValueFn {
	return seriesPlotRowFnMap[seriesType] as TimedSeriesItemValueFn;
}

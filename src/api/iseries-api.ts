import { IPriceFormatter } from '../formatters/iprice-formatter';

import { BarPrice } from '../model/bar';
import { Coordinate } from '../model/coordinate';
import { PriceLineOptions } from '../model/price-line-options';
import { SeriesMarker } from '../model/series-markers';
import {
	SeriesOptionsMap,
	SeriesPartialOptionsMap,
	SeriesType,
} from '../model/series-options';
import { Range } from '../model/time-data';

import { SeriesDataItemTypeMap, Time } from './data-consumer';
import { IPriceLine } from './iprice-line';
import { IPriceScaleApi } from './iprice-scale-api';

/**
 * Represents a range of bars and the number of bars outside the range.
 */
// actually range might be either exist or not
// but to avoid hard-readable type let's say every part of range is optional
export type BarsInfo =
	Partial<Range<Time>>
	& {
		/**
		 * The number of bars before the start of the range.
		 */
		barsBefore: number;
		/**
		 * The number of bars after the end of the range.
		 */
		barsAfter: number;
	};

/**
 * Represents the interface for interacting with series.
 */
export interface ISeriesApi<TSeriesType extends SeriesType> {
	/**
	 * Returns current price formatter
	 *
	 * @returns Interface to the price formatter object that can be used to format prices in the same way as the chart does
	 */
	priceFormatter(): IPriceFormatter;

	/**
	 * Converts specified series price to pixel coordinate according to the series price scale
	 *
	 * @param price - Input price to be converted
	 * @returns Pixel coordinate of the price level on the chart
	 */
	priceToCoordinate(price: number): Coordinate | null;

	/**
	 * Converts specified coordinate to price value according to the series price scale
	 *
	 * @param coordinate - Input coordinate to be converted
	 * @returns Price value of the coordinate on the chart
	 */
	coordinateToPrice(coordinate: number): BarPrice | null;

	/**
	 * Retrieves information about the series' data within a given logical range.
	 *
	 * @param range - the logical range to retrieve info for
	 * @returns the bars info for the given logical range: fields `from` and `to` are
	 * `Logical` values for the first and last bar within the range, and `barsBefore` and
	 * `barsAfter` count the the available bars outside the given index range. If these
	 * values are negative, it means that the given range us not fully filled with bars
	 * on the given side, but bars are missing instead (would show up as a margin if the
	 * the given index range falls into the viewport).
	 */
	barsInLogicalRange(range: Range<number>): BarsInfo | null;

	/**
	 * Applies new options to the existing series
	 * You can set options initially when you create series or use the `applyOptions` method of the series to change the existing options.
	 * Note that you can only pass options you want to change.
	 *
	 * @param options - Any subset of options.
	 */
	applyOptions(options: SeriesPartialOptionsMap[TSeriesType]): void;

	/**
	 * Returns currently applied options
	 *
	 * @returns Full set of currently applied options, including defaults
	 */
	options(): Readonly<SeriesOptionsMap[TSeriesType]>;

	/**
	 * Returns interface of the price scale the series is currently attached
	 *
	 * @returns IPriceScaleApi object to control the price scale
	 */
	priceScale(): IPriceScaleApi;

	/**
	 * Sets or replaces series data.
	 *
	 * @param data - Ordered (earlier time point goes first) array of data items. Old data is fully replaced with the new one.
	 */
	setData(data: SeriesDataItemTypeMap[TSeriesType][]): void;

	/**
	 * Adds new data item to the existing set (or updates the latest item if times of the passed/latest items are equal).
	 *
	 * @param bar - A single data item to be added. Time of the new item must be greater or equal to the latest existing time point.
	 * If the new item's time is equal to the last existing item's time, then the existing item is replaced with the new one.
	 */
	update(bar: SeriesDataItemTypeMap[TSeriesType]): void;

	/**
	 * Allows to set/replace all existing series markers with new ones.
	 *
	 * @param data - An array of series markers. This array should be sorted by time. Several markers with same time are allowed.
	 */
	setMarkers(data: SeriesMarker<Time>[]): void;

	/**
	 * Creates a new price line
	 *
	 * @param options - Any subset of options.
	 * @example
	 * ```js
	 * const priceLine = series.createPriceLine({
	 *     price: 80.0,
	 *     color: 'green',
	 *     lineWidth: 2,
	 *     lineStyle: LightweightCharts.LineStyle.Dotted,
	 *     axisLabelVisible: true,
	 *     title: 'P/L 500',
	 * });
	 * ```
	 */
	createPriceLine(options: PriceLineOptions): IPriceLine;

	/**
	 * Removes the price line that was created before.
	 *
	 * @param line - A line to remove.
	 * @example
	 * ```js
	 * const priceLine = series.createPriceLine({ price: 80.0 });
	 * series.removePriceLine(priceLine);
	 * ```
	 */
	removePriceLine(line: IPriceLine): void;

	/**
	 * Return current series type.
	 *
	 * @returns Type of the series.
	 * @example
	 * ```js
	 * const lineSeries = chart.addLineSeries();
	 * console.log(lineSeries.seriesType()); // "Line"
	 *
	 * const candlestickSeries = chart.addCandlestickSeries();
	 * console.log(candlestickSeries.seriesType()); // "Candlestick"
	 * ```
	 */
	seriesType(): TSeriesType;
}

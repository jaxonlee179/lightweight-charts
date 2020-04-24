import { ensureNotNull } from '../helpers/assertions';
import { IDestroyable } from '../helpers/idestroyable';
import { clone, merge } from '../helpers/strict-type-checks';

import { BarPrice } from '../model/bar';
import { Coordinate } from '../model/coordinate';
import { PlotRowSearchMode } from '../model/plot-list';
import { PriceLineOptions } from '../model/price-line-options';
import { RangeImpl } from '../model/range-impl';
import { Series } from '../model/series';
import { SeriesMarker } from '../model/series-markers';
import {
	SeriesOptionsMap,
	SeriesPartialOptionsMap,
	SeriesType,
} from '../model/series-options';
import { LogicalRange, TimePointIndex } from '../model/time-data';
import { TimeScaleVisibleRange } from '../model/time-scale-visible-range';

import { DataUpdatesConsumer, SeriesDataItemTypeMap, Time } from './data-consumer';
import { convertTime } from './data-layer';
import { IPriceLine } from './iprice-line';
import { BarsInfo, IPriceFormatter, ISeriesApi } from './iseries-api';
import { priceLineOptionsDefaults } from './options/price-line-options-defaults';
import { PriceLine } from './price-line-api';

export class SeriesApi<TSeriesType extends SeriesType> implements ISeriesApi<TSeriesType>, IDestroyable {
	protected _series: Series<TSeriesType>;
	protected _dataUpdatesConsumer: DataUpdatesConsumer<TSeriesType>;

	public constructor(series: Series<TSeriesType>, dataUpdatesConsumer: DataUpdatesConsumer<TSeriesType>) {
		this._series = series;
		this._dataUpdatesConsumer = dataUpdatesConsumer;
	}

	public destroy(): void {
		delete this._series;
		delete this._dataUpdatesConsumer;
	}

	public priceFormatter(): IPriceFormatter {
		return this._series.formatter();
	}

	public series(): Series<TSeriesType> {
		return this._series;
	}

	public priceToCoordinate(price: BarPrice): Coordinate | null {
		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return null;
		}

		return this._series.priceScale().priceToCoordinate(price, firstValue.value);
	}

	public coordinateToPrice(coordinate: Coordinate): BarPrice | null {
		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return null;
		}
		return this._series.priceScale().coordinateToPrice(coordinate, firstValue.value);
	}

	public barsInLogicalRange(range: LogicalRange): BarsInfo | null {
		// we use TimeScaleVisibleRange here to convert LogicalRange to strict range properly
		const correctedRange = new TimeScaleVisibleRange(
			new RangeImpl(range.from, range.to)
		).strictRange() as RangeImpl<TimePointIndex>;

		const bars = this._series.data().bars();

		const dataFirstBarInRange = bars.search(correctedRange.left(), PlotRowSearchMode.NearestRight);
		if (dataFirstBarInRange === null) {
			return null;
		}

		const dataLastBarInRange = bars.search(correctedRange.right(), PlotRowSearchMode.NearestLeft);
		if (dataLastBarInRange === null) {
			return null;
		}

		if (dataLastBarInRange.index < dataFirstBarInRange.index) {
			// range is between series' points
			// so we don't have bars info there
			return null;
		}

		const dataFirstIndex = ensureNotNull(bars.firstIndex());
		const dataLastIndex = ensureNotNull(bars.lastIndex());

		// TODO: should it be start from range.from/to or from dataFirstBarInRange/dataLastBarInRange
		const barsBefore = dataFirstBarInRange.index === dataFirstIndex
			? range.from - dataFirstIndex
			: dataFirstBarInRange.index - dataFirstIndex;

		const barsAfter = dataLastBarInRange.index === dataLastIndex
			? dataLastIndex - range.to
			: dataLastIndex - dataLastBarInRange.index;

		return {
			from: dataFirstBarInRange.time.businessDay ?? dataFirstBarInRange.time.timestamp,
			to: dataLastBarInRange.time.businessDay ?? dataLastBarInRange.time.timestamp,
			barsBefore,
			barsAfter,
		};
	}

	public setData(data: SeriesDataItemTypeMap[TSeriesType][]): void {
		this._dataUpdatesConsumer.applyNewData(this._series, data);
	}

	public update(bar: SeriesDataItemTypeMap[TSeriesType]): void {
		this._dataUpdatesConsumer.updateData(this._series, bar);
	}

	public setMarkers(data: SeriesMarker<Time>[]): void {
		const convertedMarkers = data.map((marker: SeriesMarker<Time>) => ({
			...marker,
			time: convertTime(marker.time),
		}));
		this._series.setMarkers(convertedMarkers);
	}

	public applyOptions(options: SeriesPartialOptionsMap[TSeriesType]): void {
		this._series.applyOptions(options);
	}

	public options(): Readonly<SeriesOptionsMap[TSeriesType]> {
		return clone(this._series.options());
	}

	public createPriceLine(options: PriceLineOptions): IPriceLine {
		const strictOptions = merge(clone(priceLineOptionsDefaults), options) as PriceLineOptions;
		const priceLine = this._series.createPriceLine(strictOptions);
		return new PriceLine(priceLine);
	}

	public removePriceLine(line: IPriceLine): void {
		this._series.removePriceLine((line as PriceLine).priceLine());
	}
}

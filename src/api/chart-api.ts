import { ChartWidget, MouseEventParamsImpl, MouseEventParamsImplSupplier } from '../gui/chart-widget';

import { ensureDefined } from '../helpers/assertions';
import { Delegate } from '../helpers/delegate';
import { clone, DeepPartial, merge } from '../helpers/strict-type-checks';

import { BarPrice, BarPrices } from '../model/bar';
import { ChartOptions } from '../model/chart-model';
import { Series } from '../model/series';
import {
	AreaSeriesOptions,
	AreaSeriesPartialOptions,
	BarSeriesOptions,
	BarSeriesPartialOptions,
	CandlestickSeriesOptions,
	CandlestickSeriesPartialOptions,
	fillUpDownCandlesticksColors,
	HistogramSeriesOptions,
	HistogramSeriesPartialOptions,
	LineSeriesOptions,
	LineSeriesPartialOptions,
	precisionByMinMove,
	PriceFormat,
	PriceFormatBuiltIn,
	SeriesType,
} from '../model/series-options';
import { TimePointIndex } from '../model/time-data';

import { CandlestickSeriesApi } from './candlestick-series-api';
import { DataUpdatesConsumer, SeriesDataItemTypeMap } from './data-consumer';
import { DataLayer, SeriesUpdatePacket } from './data-layer';
import { IChartApi, MouseEventHandler, MouseEventParams, TimeRangeChangeEventHandler } from './ichart-api';
import { IPriceScaleApi } from './iprice-scale-api';
import { ISeriesApi } from './iseries-api';
import { ITimeScaleApi, TimeRange } from './itime-scale-api';
import {
	areaStyleDefaults,
	barStyleDefaults,
	candlestickStyleDefaults,
	histogramStyleDefaults,
	lineStyleDefaults,
	seriesOptionsDefaults,
} from './options/series-options-defaults';
import { PriceScaleApi } from './price-scale-api';
import { SeriesApi } from './series-api';
import { TimeScaleApi } from './time-scale-api';

function patchPriceFormat(priceFormat?: DeepPartial<PriceFormat>): void {
	if (priceFormat === undefined || priceFormat.type === 'custom') {
		return;
	}
	const priceFormatBuiltIn = priceFormat as DeepPartial<PriceFormatBuiltIn>;
	if (priceFormatBuiltIn.minMove !== undefined && priceFormatBuiltIn.precision === undefined) {
		priceFormatBuiltIn.precision = precisionByMinMove(priceFormatBuiltIn.minMove);
	}
}

export class ChartApi implements IChartApi, DataUpdatesConsumer<SeriesType> {
	private _chartWidget: ChartWidget;
	private _dataLayer: DataLayer = new DataLayer();
	private readonly _timeRangeChanged: Delegate<TimeRange | null> = new Delegate();
	private readonly _seriesMap: Map<SeriesApi<SeriesType>, Series> = new Map();
	private readonly _seriesMapReversed: Map<Series, SeriesApi<SeriesType>> = new Map();

	private readonly _clickedDelegate: Delegate<MouseEventParams> = new Delegate();
	private readonly _crosshairMovedDelegate: Delegate<MouseEventParams> = new Delegate();

	private readonly _priceScaleApi: Map<string, PriceScaleApi> = new Map();
	private readonly _timeScaleApi: TimeScaleApi;

	public constructor(container: HTMLElement, options: ChartOptions) {
		// migrate price scale options
		// tslint:disable-next-line: deprecation
		if (options.priceScale.position) {
			options = clone(options);
			// tslint:disable-next-line: deprecation
			options.leftPriceScale.visible = options.priceScale.position === 'left';
			// tslint:disable-next-line: deprecation
			options.rightPriceScale.visible = options.priceScale.position === 'right';
			// tslint:disable-next-line: deprecation
			delete options.priceScale.position;
		}

		this._chartWidget = new ChartWidget(container, options);
		this._chartWidget.model().timeScale().visibleBarsChanged().subscribe(this._onVisibleBarsChanged.bind(this));

		this._chartWidget.clicked().subscribe(
			(paramSupplier: MouseEventParamsImplSupplier) => {
				if (this._clickedDelegate.hasListeners()) {
					this._clickedDelegate.fire(this._convertMouseParams(paramSupplier()));
				}
			},
			this
		);
		this._chartWidget.crosshairMoved().subscribe(
			(paramSupplier: MouseEventParamsImplSupplier) => {
				if (this._crosshairMovedDelegate.hasListeners()) {
					this._crosshairMovedDelegate.fire(this._convertMouseParams(paramSupplier()));
				}
			},
			this
		);

		const model = this._chartWidget.model();
		this._timeScaleApi = new TimeScaleApi(model);
	}

	public remove(): void {
		this._chartWidget.model().timeScale().visibleBarsChanged().unsubscribeAll(this);
		this._chartWidget.clicked().unsubscribeAll(this);
		this._chartWidget.crosshairMoved().unsubscribeAll(this);

		const priceScaleApis = Array.from(this._priceScaleApi.values());
		priceScaleApis.forEach((ps: PriceScaleApi) => ps.destroy());

		this._timeScaleApi.destroy();
		this._chartWidget.destroy();
		delete this._chartWidget;
		this._seriesMap.forEach((series: Series, api: SeriesApi<SeriesType>) => {
			api.destroy();
		});
		this._seriesMap.clear();
		this._seriesMapReversed.clear();
		this._timeRangeChanged.destroy();
		this._clickedDelegate.destroy();
		this._crosshairMovedDelegate.destroy();
		this._dataLayer.destroy();
		delete this._dataLayer;
	}

	public resize(height: number, width: number, forceRepaint?: boolean): void {
		this._chartWidget.resize(height, width, forceRepaint);
	}

	public addAreaSeries(options: AreaSeriesPartialOptions = {}): ISeriesApi<'Area'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), areaStyleDefaults, options) as AreaSeriesOptions;
		const series = this._chartWidget.model().createSeries('Area', strictOptions);

		const res = new SeriesApi<'Area'>(series, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addBarSeries(options: BarSeriesPartialOptions = {}): ISeriesApi<'Bar'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), barStyleDefaults, options) as BarSeriesOptions;
		const series = this._chartWidget.model().createSeries('Bar', strictOptions);

		const res = new SeriesApi<'Bar'>(series, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addCandlestickSeries(options: CandlestickSeriesPartialOptions = {}): ISeriesApi<'Candlestick'> {
		fillUpDownCandlesticksColors(options);
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), candlestickStyleDefaults, options) as CandlestickSeriesOptions;
		const series = this._chartWidget.model().createSeries('Candlestick', strictOptions);

		const res = new CandlestickSeriesApi(series, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addHistogramSeries(options: HistogramSeriesPartialOptions = {}): ISeriesApi<'Histogram'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), histogramStyleDefaults, options) as HistogramSeriesOptions;
		const series = this._chartWidget.model().createSeries('Histogram', strictOptions);

		const res = new SeriesApi<'Histogram'>(series, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addLineSeries(options: LineSeriesPartialOptions = {}): ISeriesApi<'Line'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), lineStyleDefaults, options) as LineSeriesOptions;
		const series = this._chartWidget.model().createSeries('Line', strictOptions);

		const res = new SeriesApi<'Line'>(series, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public removeSeries(seriesApi: ISeriesApi<SeriesType>): void {
		const seriesObj = seriesApi as SeriesApi<SeriesType>;
		const series = ensureDefined(this._seriesMap.get(seriesObj));

		const update = this._dataLayer.removeSeries(series);
		const model = this._chartWidget.model();
		model.removeSeries(series);
		const timeScaleUpdate = update.timeScaleUpdate;
		model.updateTimeScale(timeScaleUpdate.index, timeScaleUpdate.changes, timeScaleUpdate.marks, true);
		timeScaleUpdate.seriesUpdates.forEach((value: SeriesUpdatePacket, key: Series) => {
			key.updateData(value.update);
		});
		model.updateTimeScaleBaseIndex(0 as TimePointIndex);
		this._seriesMap.delete(seriesObj);
		this._seriesMapReversed.delete(series);
	}

	public applyNewData<TSeriesType extends SeriesType>(series: Series<TSeriesType>, data: SeriesDataItemTypeMap[TSeriesType][]): void {
		const update = this._dataLayer.setSeriesData(series, data);
		const model = this._chartWidget.model();
		const timeScaleUpdate = update.timeScaleUpdate;
		model.updateTimeScale(timeScaleUpdate.index, timeScaleUpdate.changes, timeScaleUpdate.marks, true);
		timeScaleUpdate.seriesUpdates.forEach((value: SeriesUpdatePacket, key: Series) => {
			key.updateData(value.update);
		});
		model.updateTimeScaleBaseIndex(0 as TimePointIndex);
	}

	public updateData<TSeriesType extends SeriesType>(series: Series<TSeriesType>, data: SeriesDataItemTypeMap[TSeriesType]): void {
		const update = this._dataLayer.updateSeriesData(series, data);
		const model = this._chartWidget.model();
		const timeScaleUpdate = update.timeScaleUpdate;
		model.updateTimeScale(timeScaleUpdate.index, timeScaleUpdate.changes, timeScaleUpdate.marks, false);
		timeScaleUpdate.seriesUpdates.forEach((value: SeriesUpdatePacket, key: Series) => {
			key.updateData(value.update);
		});
		model.updateTimeScaleBaseIndex(0 as TimePointIndex);
	}

	public subscribeClick(handler: MouseEventHandler): void {
		this._clickedDelegate.subscribe(handler);
	}

	public unsubscribeClick(handler: MouseEventHandler): void {
		this._clickedDelegate.unsubscribe(handler);
	}

	public subscribeCrosshairMove(handler: MouseEventHandler): void {
		this._crosshairMovedDelegate.subscribe(handler);
	}

	public unsubscribeCrosshairMove(handler: MouseEventHandler): void {
		this._crosshairMovedDelegate.unsubscribe(handler);
	}

	public subscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void {
		this._timeRangeChanged.subscribe(handler);
	}

	public unsubscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void {
		this._timeRangeChanged.unsubscribe(handler);
	}

	// TODO: add more subscriptions

	public priceScale(priceScaleId?: string): IPriceScaleApi {
		// TODO: get visible scale
		priceScaleId = priceScaleId || 'right';
		if (this._priceScaleApi.has(priceScaleId)) {
			return ensureDefined(this._priceScaleApi.get(priceScaleId));
		}
		const res = new PriceScaleApi(this._chartWidget.model(), priceScaleId);
		this._priceScaleApi.set(priceScaleId, res);
		return res;
	}

	public timeScale(): ITimeScaleApi {
		return this._timeScaleApi;
	}

	public applyOptions(options: DeepPartial<ChartOptions>): void {
		this._chartWidget.applyOptions(options);
	}

	public options(): Readonly<ChartOptions> {
		return this._chartWidget.options();
	}

	public takeScreenshot(): HTMLCanvasElement {
		return this._chartWidget.takeScreenshot();
	}

	private _onVisibleBarsChanged(): void {
		if (this._timeRangeChanged.hasListeners()) {
			this._timeRangeChanged.fire(this.timeScale().getVisibleRange());
		}
	}

	private _mapSeriesToApi(series: Series): ISeriesApi<SeriesType> {
		return ensureDefined(this._seriesMapReversed.get(series));
	}

	private _convertMouseParams(param: MouseEventParamsImpl): MouseEventParams {
		const seriesPrices = new Map<ISeriesApi<SeriesType>, BarPrice | BarPrices>();
		param.seriesPrices.forEach((price: BarPrice | BarPrices, series: Series) => {
			seriesPrices.set(this._mapSeriesToApi(series), price);
		});

		const hoveredSeries = param.hoveredSeries === undefined ? undefined : this._mapSeriesToApi(param.hoveredSeries);

		return {
			time: param.time && (param.time.businessDay || param.time.timestamp),
			point: param.point,
			hoveredSeries,
			hoveredMarkerId: param.hoveredObject,
			seriesPrices,
		};
	}
}

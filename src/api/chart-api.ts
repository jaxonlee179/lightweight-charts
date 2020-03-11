import { ChartWidget, MouseEventParamsImpl, MouseEventParamsImplSupplier } from '../gui/chart-widget';

import { ensureDefined } from '../helpers/assertions';
import { Delegate } from '../helpers/delegate';
import { warn } from '../helpers/logger';
import { clone, DeepPartial, isBoolean, merge } from '../helpers/strict-type-checks';

import { BarPrice, BarPrices } from '../model/bar';
import { ChartOptions, ChartOptionsInternal } from '../model/chart-model';
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
import { chartOptionsDefaults } from './options/chart-options-defaults';
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

function migrateHandleScaleScrollOptions(options: DeepPartial<ChartOptions>): void {
	const handleScale = options.handleScale;
	if (isBoolean(handleScale)) {
		options.handleScale = {
			axisDoubleClickReset: handleScale,
			axisPressedMouseMove: handleScale,
			mouseWheel: handleScale,
			pinch: handleScale,
		};
	}

	const handleScroll = options.handleScroll;
	if (isBoolean(handleScroll)) {
		options.handleScroll = {
			horzTouchDrag: handleScroll,
			vertTouchDrag: handleScroll,
			mouseWheel: handleScroll,
			pressedMouseMove: handleScroll,
		};
	}
}

function migratePriceScaleOptions(options: DeepPartial<ChartOptions>): void {
	if (options.priceScale) {
		warn('Usage of obsolete options "priceScale" has been detected');
		options.leftPriceScale = options.leftPriceScale || {};
		options.rightPriceScale = options.rightPriceScale || {};
		// tslint:disable-next-line: deprecation
		const position = options.priceScale.position;
		// tslint:disable-next-line: deprecation
		delete options.priceScale.position;
		options.leftPriceScale = merge(options.leftPriceScale, options.priceScale);
		options.rightPriceScale = merge(options.rightPriceScale, options.priceScale);
		if (position === 'left') {
			options.leftPriceScale.visible = true;
		}
		if (position === 'right') {
			options.rightPriceScale.visible = true;
		}
		// copy defaults for overlays
		options.overlayPriceScales = options.overlayPriceScales || {};
		if (options.priceScale.invertScale !== undefined) {
			options.overlayPriceScales.invertScale = options.priceScale.invertScale;
		}
		// do not migrate mode for backward compatibility
		if (options.priceScale.scaleMargins !== undefined) {
			options.overlayPriceScales.scaleMargins = options.priceScale.scaleMargins;
		}
	}
}

function toInternalOptions(options: DeepPartial<ChartOptions>): DeepPartial<ChartOptionsInternal> {
	migrateHandleScaleScrollOptions(options);
	migratePriceScaleOptions(options);

	return options as DeepPartial<ChartOptionsInternal>;
}

export interface IPriceScaleApiProvider {
	priceScale(id: string): IPriceScaleApi;
}

export class ChartApi implements IChartApi, IPriceScaleApiProvider, DataUpdatesConsumer<SeriesType> {
	private _chartWidget: ChartWidget;
	private _dataLayer: DataLayer = new DataLayer();
	private readonly _timeRangeChanged: Delegate<TimeRange | null> = new Delegate();
	private readonly _seriesMap: Map<SeriesApi<SeriesType>, Series> = new Map();
	private readonly _seriesMapReversed: Map<Series, SeriesApi<SeriesType>> = new Map();

	private readonly _clickedDelegate: Delegate<MouseEventParams> = new Delegate();
	private readonly _crosshairMovedDelegate: Delegate<MouseEventParams> = new Delegate();

	private readonly _priceScaleApis: Map<string, PriceScaleApi> = new Map();
	private readonly _timeScaleApi: TimeScaleApi;

	public constructor(container: HTMLElement, options?: DeepPartial<ChartOptions>) {
		const internalOptions = (options === undefined) ?
			clone(chartOptionsDefaults) :
			merge(clone(chartOptionsDefaults), toInternalOptions(options)) as ChartOptionsInternal;

		this._chartWidget = new ChartWidget(container, internalOptions);
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

		const priceScaleApis = Array.from(this._priceScaleApis.values());
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

		const res = new SeriesApi<'Area'>(series, this, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addBarSeries(options: BarSeriesPartialOptions = {}): ISeriesApi<'Bar'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), barStyleDefaults, options) as BarSeriesOptions;
		const series = this._chartWidget.model().createSeries('Bar', strictOptions);

		const res = new SeriesApi<'Bar'>(series, this, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addCandlestickSeries(options: CandlestickSeriesPartialOptions = {}): ISeriesApi<'Candlestick'> {
		fillUpDownCandlesticksColors(options);
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), candlestickStyleDefaults, options) as CandlestickSeriesOptions;
		const series = this._chartWidget.model().createSeries('Candlestick', strictOptions);

		const res = new CandlestickSeriesApi(series, this, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addHistogramSeries(options: HistogramSeriesPartialOptions = {}): ISeriesApi<'Histogram'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), histogramStyleDefaults, options) as HistogramSeriesOptions;
		const series = this._chartWidget.model().createSeries('Histogram', strictOptions);

		const res = new SeriesApi<'Histogram'>(series, this, this);
		this._seriesMap.set(res, series);
		this._seriesMapReversed.set(series, res);

		return res;
	}

	public addLineSeries(options: LineSeriesPartialOptions = {}): ISeriesApi<'Line'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), lineStyleDefaults, options) as LineSeriesOptions;
		const series = this._chartWidget.model().createSeries('Line', strictOptions);

		const res = new SeriesApi<'Line'>(series, this, this);
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

	public priceScale(priceScaleId?: string): IPriceScaleApi {
		priceScaleId = priceScaleId || this._chartWidget.model().defaultVisiblePriceScale();
		if (this._priceScaleApis.has(priceScaleId)) {
			return ensureDefined(this._priceScaleApis.get(priceScaleId));
		}
		const res = new PriceScaleApi(this._chartWidget.model(), priceScaleId);
		this._priceScaleApis.set(priceScaleId, res);
		return res;
	}

	public timeScale(): ITimeScaleApi {
		return this._timeScaleApi;
	}

	public applyOptions(options: DeepPartial<ChartOptions>): void {
		this._chartWidget.applyOptions(toInternalOptions(options));
	}

	public options(): Readonly<ChartOptions> {
		return this._chartWidget.options() as Readonly<ChartOptions>;
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

import { Coordinate } from '../model/coordinate';
import { PricedValue } from '../model/price-scale';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { ScaledRenderer } from './scaled-renderer';

export interface HistogramItem extends PricedValue, TimedValue {
	left?: Coordinate;
	right?: Coordinate;
}

export interface PaneRendererHistogramData {
	items: HistogramItem[];

	barSpacing: number;
	histogramBase: number;
	color: string;

	visibleRange: SeriesItemsIndexesRange | null;
}

export class PaneRendererHistogram extends ScaledRenderer {
	private _data: PaneRendererHistogramData | null = null;

	public setData(data: PaneRendererHistogramData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		if (this._data === null || this._data.items.length === 0 || this._data.visibleRange === null) {
			return;
		}

		const histogramBase = this._data.histogramBase;

		// TODO: remove this after removing global translate
		ctx.translate(-0.5, -0.5);

		ctx.fillStyle = this._data.color;
		ctx.beginPath();

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			// force cast to avoid ensureDefined call
			const y = item.y as number;
			const left = item.left as number;
			const right = item.right as number;
			ctx.rect(left, y, right - left, histogramBase - y);
		}

		ctx.fill();

		// TODO: remove this after removing global translate
		ctx.translate(0.5, 0.5);
	}
}

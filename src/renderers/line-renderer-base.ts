import { PricedValue } from '../model/price-scale';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { MediaCoordsRenderingScope } from './canvas-rendering-target';
import { LinePoint, LineStyle, LineType, LineWidth, setLineStyle } from './draw-line';
import { ScaledRenderer } from './scaled-renderer';
import { walkLine } from './walk-line';

export type LineItemBase = TimedValue & PricedValue & LinePoint;

export interface PaneRendererLineDataBase<TItem extends LineItemBase = LineItemBase> {
	lineType: LineType;

	items: TItem[];

	barWidth: number;

	lineWidth: LineWidth;
	lineStyle: LineStyle;

	visibleRange: SeriesItemsIndexesRange | null;
}

function finishStyledArea(ctx: CanvasRenderingContext2D, style: CanvasRenderingContext2D['strokeStyle']): void {
	ctx.strokeStyle = style;
	ctx.stroke();
}

export abstract class PaneRendererLineBase<TData extends PaneRendererLineDataBase> extends ScaledRenderer {
	protected _data: TData | null = null;

	public setData(data: TData): void {
		this._data = data;
	}

	protected _drawImpl(renderingScope: MediaCoordsRenderingScope): void {
		if (this._data === null) {
			return;
		}

		const { items, visibleRange, barWidth, lineType, lineWidth, lineStyle } = this._data;

		if (visibleRange === null) {
			return;
		}

		const ctx = renderingScope.context;

		ctx.lineCap = 'butt';
		ctx.lineWidth = lineWidth;

		setLineStyle(ctx, lineStyle);

		ctx.lineJoin = 'round';

		walkLine(renderingScope, items, lineType, visibleRange, barWidth, this._strokeStyle.bind(this), finishStyledArea);
	}

	protected abstract _strokeStyle(renderingScope: MediaCoordsRenderingScope, item: TData['items'][0]): CanvasRenderingContext2D['strokeStyle'];
}

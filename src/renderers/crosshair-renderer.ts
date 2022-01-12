import { CanvasRenderingParams } from './canvas-rendering-target';
import { drawHorizontalLine, drawVerticalLine, LineStyle, LineWidth, setLineStyle } from './draw-line';
import { IPaneRenderer } from './ipane-renderer';

export interface CrosshairLineStyle {
	lineStyle: LineStyle;
	lineWidth: LineWidth;
	color: string;
	visible: boolean;
}

export interface CrosshairRendererData {
	vertLine: CrosshairLineStyle;
	horzLine: CrosshairLineStyle;
	x: number;
	y: number;
	w: number;
	h: number;
}

export class CrosshairRenderer implements IPaneRenderer {
	private readonly _data: CrosshairRendererData | null;

	public constructor(data: CrosshairRendererData | null) {
		this._data = data;
	}

	public draw(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderingParams, isHovered: boolean, hitTestData?: unknown): void {
		if (this._data === null) {
			return;
		}

		const vertLinesVisible = this._data.vertLine.visible;
		const horzLinesVisible = this._data.horzLine.visible;

		if (!vertLinesVisible && !horzLinesVisible) {
			return;
		}

		ctx.save();

		const { horizontalPixelRatio, verticalPixelRatio } = renderParams;

		const x = Math.round(this._data.x * horizontalPixelRatio);
		const y = Math.round(this._data.y * verticalPixelRatio);
		const w = Math.ceil(this._data.w * horizontalPixelRatio);
		const h = Math.ceil(this._data.h * verticalPixelRatio);

		ctx.lineCap = 'butt';

		if (vertLinesVisible && x >= 0) {
			ctx.lineWidth = Math.floor(this._data.vertLine.lineWidth * horizontalPixelRatio);
			ctx.strokeStyle = this._data.vertLine.color;
			ctx.fillStyle = this._data.vertLine.color;
			setLineStyle(ctx, this._data.vertLine.lineStyle);
			drawVerticalLine(ctx, x, 0, h);
		}

		if (horzLinesVisible && y >= 0) {
			ctx.lineWidth = Math.floor(this._data.horzLine.lineWidth * verticalPixelRatio);
			ctx.strokeStyle = this._data.horzLine.color;
			ctx.fillStyle = this._data.horzLine.color;
			setLineStyle(ctx, this._data.horzLine.lineStyle);
			drawHorizontalLine(ctx, y, 0, w);
		}

		ctx.restore();
	}
}

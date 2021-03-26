const defaultReplacementRe = /[2-9]/g;

export class TextWidthCache {
	private readonly _maxSize: number;
	private _actualSize: number = 0;
	private _usageTick: number = 1;
	private _oldestTick: number = 1;
	private _tick2Labels: Record<number, string> = {};
	private _cache: Record<string, { metrics: TextMetrics; tick: number }> = {};

	public constructor(size: number = 50) {
		this._maxSize = size;
	}

	public reset(): void {
		this._actualSize = 0;
		this._cache = {};
		this._usageTick = 1;
		this._oldestTick = 1;
		this._tick2Labels = {};
	}

	public measureText(ctx: CanvasRenderingContext2D, text: string, optimizationReplacementRe?: RegExp): number {
		return this._getMetrics(ctx, text, optimizationReplacementRe).width;
	}

	public yMidCorrection(ctx: CanvasRenderingContext2D, text: string, optimizationReplacementRe?: RegExp): number {
		const metrics = this._getMetrics(ctx, text, optimizationReplacementRe);
		// if actualBoundingBoxAscent/actualBoundingBoxDescent are not supported we use 0 as a fallback
		return ((metrics.actualBoundingBoxAscent || 0) - (metrics.actualBoundingBoxDescent || 0)) / 2;
	}

	private _getMetrics(ctx: CanvasRenderingContext2D, text: string, optimizationReplacementRe?: RegExp): TextMetrics {
		const re = optimizationReplacementRe || defaultReplacementRe;
		const cacheString = String(text).replace(re, '0');

		if (this._cache[cacheString]) {
			return this._cache[cacheString].metrics;
		}

		if (this._actualSize === this._maxSize) {
			const oldestValue = this._tick2Labels[this._oldestTick];
			delete this._tick2Labels[this._oldestTick];
			delete this._cache[oldestValue];
			this._oldestTick++;
			this._actualSize--;
		}

		ctx.save();
		ctx.textBaseline = 'middle';
		const metrics = ctx.measureText(cacheString);
		ctx.restore();

		if (metrics.width === 0 && !!text.length) {
			// measureText can return 0 in FF depending on a canvas size, don't cache it
			return metrics;
		}

		this._cache[cacheString] = { metrics: metrics, tick: this._usageTick };
		this._tick2Labels[this._usageTick] = cacheString;
		this._actualSize++;
		this._usageTick++;
		return metrics;
	}
}

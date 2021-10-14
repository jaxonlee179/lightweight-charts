export const enum DefaultPriceScaleId {
	Left = 'left',
	Right = 'right',
}

/**
 * @private
 */
export function isDefaultPriceScale(priceScaleId: string): boolean {
	return priceScaleId === DefaultPriceScaleId.Left || priceScaleId === DefaultPriceScaleId.Right;
}

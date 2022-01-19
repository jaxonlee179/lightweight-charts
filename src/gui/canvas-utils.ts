import {
	bindCanvasElementBitmapSizeTo,
	CanvasElementBitmapSizeBinding,
	Size,
} from 'fancy-canvas';

import { ensureNotNull } from '../helpers/assertions';

export function createPreconfiguredCanvas(doc: Document, size: Size): HTMLCanvasElement {
	const canvas = doc.createElement('canvas');
	canvas.width = size.width;
	canvas.height = size.height;
	return canvas;
}

export function createBoundCanvas(parentElement: HTMLElement, size: Size): CanvasElementBitmapSizeBinding {
	const doc = ensureNotNull(parentElement.ownerDocument);
	const canvas = doc.createElement('canvas');
	parentElement.appendChild(canvas);

	const binding = bindCanvasElementBitmapSizeTo(canvas, { type: 'device-pixel-content-box' });
	binding.resizeCanvasElement(size);
	return binding;
}

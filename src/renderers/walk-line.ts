import { Coordinate } from '../model/coordinate';
import { SeriesItemsIndexesRange } from '../model/time-data';

import { LinePoint, LineType } from './draw-line';

/**
 * BEWARE: The method must be called after beginPath and before stroke/fill/closePath/etc
 */
export function walkLine(
	ctx: CanvasRenderingContext2D,
	points: readonly LinePoint[],
	lineType: LineType,
	visibleRange: SeriesItemsIndexesRange
): void {
	if (points.length === 0) {
		return;
	}

	const x = points[visibleRange.from].x as number;
	const y = points[visibleRange.from].y as number;
	ctx.moveTo(x, y);

	for (let i = visibleRange.from + 1; i < visibleRange.to; ++i) {
		const currItem = points[i];

		//  x---x---x   or   x---x   o   or   start
		if (lineType === LineType.WithSteps) {
			const prevY = points[i - 1].y;
			const currX = currItem.x;
			ctx.lineTo(currX, prevY);
			ctx.lineTo(currItem.x, currItem.y);
		} else if (lineType === LineType.Curved) {
			const [cp1, cp2] = getControlPoints(points, i - 1);
			ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, currItem.x, currItem.y);
		} else {
			ctx.lineTo(currItem.x, currItem.y);
		}
	}
}

const curveTension = 6;

const subtract = (p1: LinePoint, p2: LinePoint): LinePoint => {
	return { x: p1.x - p2.x as Coordinate, y: p1.y - p2.y as Coordinate };
};

const add = (p1: LinePoint, p2: LinePoint) => {
	return { x: p1.x + p2.x as Coordinate, y: p1.y + p2.y as Coordinate };
};

const divide = (p1: LinePoint, n: number) => {
	return { x: p1.x / n as Coordinate, y: p1.y / n as Coordinate };
};

export function getControlPoints(points: readonly LinePoint[], pointIndex: number): [LinePoint, LinePoint] {
	const currentPointIndex = pointIndex;
	const nextPointIndex = pointIndex + 1;
	const previousPointIndex = Math.max(0, pointIndex - 1);
	const nextNextPointIndex = Math.min(points.length - 1, pointIndex + 2);
	const cp1 = add(points[currentPointIndex], divide(subtract(points[nextPointIndex], points[previousPointIndex]), curveTension));
	const cp2 = subtract(points[nextPointIndex], divide(subtract(points[nextNextPointIndex], points[currentPointIndex]), curveTension));

	return [cp1, cp2];
}

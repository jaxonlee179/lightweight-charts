export type SeriesMarkerPosition = 'aboveBar' | 'belowBar' | 'inBar';

export type SeriesMarkerShape = 'circle' | 'square' | 'arrowUp' | 'arrowDown';

export interface SeriesMarkerText {
	content: string;
	offsetX: number;
	offsetY: number;
}

export interface SeriesMarker<TimeType> {
	time: TimeType;
	position: SeriesMarkerPosition;
	shape: SeriesMarkerShape;
	color: string;
	id?: string;
	text?: string;
}

export interface InternalSeriesMarker<TimeType> extends SeriesMarker<TimeType> {
	internalId: number;
}

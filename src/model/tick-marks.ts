import { ensureDefined } from '../helpers/assertions';
import { Delegate } from '../helpers/delegate';

import { TickMark } from './time-data';

function sortByIndexAsc(a: TickMark, b: TickMark): number {
	return a.index - b.index;
}

export class TickMarks {
	private _minIndex: number = Infinity;
	private _maxIndex: number = -Infinity;

	// Hash of tick marks
	private _marksByIndex: Map<number, TickMark> = new Map();
	// Sparse array with ordered arrays of tick marks
	private _marksByWeight: (TickMark[] | undefined) [] = [];
	private _changed: Delegate = new Delegate();
	private _cache: TickMark[] | null = null;
	private _maxBar: number = NaN;

	public reset(): void {
		this._marksByIndex.clear();
		this._marksByWeight = [];
		this._minIndex = Infinity;
		this._maxIndex = -Infinity;
		this._cache = null;
		this._changed.fire();
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public merge(tickMarks: TickMark[]): void {
		const marksByWeight = this._marksByWeight;
		const unsortedWeights: Record<number, boolean> = {};

		for (const tickMark of tickMarks) {
			const index = tickMark.index;
			const weight = tickMark.weight;

			const existingTickMark = this._marksByIndex.get(tickMark.index);
			if (existingTickMark) {
				if (existingTickMark.index === tickMark.index && existingTickMark.weight === tickMark.weight) {
					continue;
				}

				// TickMark exists, but it differs. We need to remove it first
				this._removeTickMark(existingTickMark);
			}

			// Set into hash
			this._marksByIndex.set(index, tickMark);
			if (this._minIndex > index) { // It's not the same as `this.minIndex > index`, mind the NaN
				this._minIndex = index;
			}

			if (this._maxIndex < index) {
				this._maxIndex = index;
			}

			// Store it in weight arrays
			let marks = marksByWeight[weight];
			if (marks === undefined) {
				marks = [];
				marksByWeight[weight] = marks;
			}

			marks.push(tickMark);
			unsortedWeights[weight] = true;
		}

		// Clean up and sort arrays
		for (let weight = marksByWeight.length; weight--;) {
			const marks = marksByWeight[weight];
			if (marks === undefined) {
				continue;
			}

			if (marks.length === 0) {
				delete marksByWeight[weight];
			}

			if (unsortedWeights[weight]) {
				marks.sort(sortByIndexAsc);
			}
		}

		this._cache = null;
		this._changed.fire();
	}

	public build(spacing: number, maxWidth: number): TickMark[] {
		const maxBar = Math.ceil(maxWidth / spacing);
		if (this._maxBar === maxBar && this._cache) {
			return this._cache;
		}

		this._maxBar = maxBar;
		let marks: TickMark[] = [];
		for (let weight = this._marksByWeight.length; weight--;) {
			if (!this._marksByWeight[weight]) {
				continue;
			}

			// Built tickMarks are now prevMarks, and marks it as new array
			const prevMarks = marks;
			marks = [];

			const prevMarksLength = prevMarks.length;
			let prevMarksPointer = 0;
			const currentWeight = ensureDefined(this._marksByWeight[weight]);
			const currentWeightLength = currentWeight.length;

			let rightIndex = Infinity;
			let leftIndex = -Infinity;
			for (let i = 0; i < currentWeightLength; i++) {
				const mark = currentWeight[i];
				const currentIndex = mark.index;

				// Determine indexes with which current index will be compared
				// All marks to the right is moved to new array
				while (prevMarksPointer < prevMarksLength) {
					const lastMark = prevMarks[prevMarksPointer];
					const lastIndex = lastMark.index;
					if (lastIndex < currentIndex) {
						prevMarksPointer++;
						marks.push(lastMark);
						leftIndex = lastIndex;
						rightIndex = Infinity;
					} else {
						rightIndex = lastIndex;
						break;
					}
				}

				if (rightIndex - currentIndex >= maxBar && currentIndex - leftIndex >= maxBar) {
					// TickMark fits. Place it into new array
					marks.push(mark);
					leftIndex = currentIndex;
				}
			}

			// Place all unused tickMarks into new array;
			for (; prevMarksPointer < prevMarksLength; prevMarksPointer++) {
				marks.push(prevMarks[prevMarksPointer]);
			}
		}

		this._cache = marks;
		return this._cache;
	}

	private _removeTickMark(tickMark: TickMark): void {
		const index = tickMark.index;
		if (this._marksByIndex.get(index) !== tickMark) {
			return;
		}

		this._marksByIndex.delete(index);
		if (index <= this._minIndex) {
			this._minIndex++;
		}

		if (index >= this._maxIndex) {
			this._maxIndex--;
		}

		if (this._maxIndex < this._minIndex) {
			this._minIndex = Infinity;
			this._maxIndex = -Infinity;
		}

		const weightArray = ensureDefined(this._marksByWeight[tickMark.weight]);
		const position = weightArray.indexOf(tickMark);
		if (position !== -1) {
			// Keeps array sorted
			weightArray.splice(position, 1);
		}
	}
}

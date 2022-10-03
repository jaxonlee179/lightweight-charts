function generateCandle(i, target) {
	const step = (i % 20) / 5000;
	const base = i / 5;
	target.open = base * (1 - step);
	target.high = base * (1 + 2 * step);
	target.low = base * (1 - 2 * step);
	target.close = base * (1 + step);
}

function generateData() {
	const res = [];
	const time = new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0));
	for (let i = 0; i < 500; ++i) {
		const item = {
			time: time.getTime() / 1000,
		};
		time.setUTCDate(time.getUTCDate() + 1);

		generateCandle(i, item);
		res.push(item);
	}
	return res;
}

let chart;
function getChartInstance() {
	return chart;
}

function runTestCase(container) {
	chart = LightweightCharts.createChart(container);

	const mainSeries = chart.addCandlestickSeries();

	mainSeries.setData(generateData());

	return new Promise(resolve => {
		setTimeout(() => {
			chart.applyOptions({
				watermark: {
					visible: true,
					fontSize: 24,
					horzAlign: 'center',
					vertAlign: 'center',
					color: 'rgba(171, 71, 188, 0.5)',
					text: 'Watermark',
					fontFamily: 'Roboto',
					fontStyle: 'bold',
				},
			});
			resolve();
		}, 300);
	});
}

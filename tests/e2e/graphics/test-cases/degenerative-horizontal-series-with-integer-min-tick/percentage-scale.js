function generateData() {
	const res = [];

	const endDate = new Date(Date.UTC(2019, 0, 1, 0, 0, 0, 0));
	const time = new Date(new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0)));
	for (let i = 0; time.getTime() < endDate.getTime(); ++i) {
		res.push({
			time: time.getTime() / 1000,
			value: 10,
		});

		time.setUTCDate(time.getUTCDate() + 1);
	}

	return res;
}

let chart;
function getChartInstance() {
	return chart;
}

function runTestCase(container) {
	chart = LightweightCharts.createChart(container, {
		rightPriceScale: {
			mode: LightweightCharts.PriceScaleMode.Percentage,
		},
	});

	const firstSeries = chart.addLineSeries({
		priceFormat: {
			minMove: 10,
		},
	});

	firstSeries.setData(generateData());
}

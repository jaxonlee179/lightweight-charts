function generateData() {
	const res = [];
	const time = new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0));
	for (let i = 0; i < 20; ++i) {
		res.push({
			time: time.getTime() / 1000,
			value: i,
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
	chart = LightweightCharts.createChart(container);

	const mainSeries = chart.addLineSeries();
	mainSeries.setData(generateData());

	chart.timeScale().setVisibleLogicalRange({
		from: -30,
		to: 30,
	});

	return new Promise(resolve => {
		setTimeout(() => {
			chart.timeScale().applyOptions({
				fixRightEdge: true,
				fixLeftEdge: true,
			});
			resolve();
		}, 100);
	});
}

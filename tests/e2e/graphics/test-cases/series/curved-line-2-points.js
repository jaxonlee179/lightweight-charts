function runTestCase(container) {
	const chart = LightweightCharts.createChart(container);

	const lineSeries = chart.addLineSeries({
		lineTension: 0.5,
	});

	const data = [
		{ time: new Date(2000, 0, 1).getTime() / 1000, value: 5 },
		{ time: new Date(2000, 1, 1).getTime() / 1000, value: 15 },
	];

	lineSeries.setData(data);

	chart.timeScale().fitContent();
}

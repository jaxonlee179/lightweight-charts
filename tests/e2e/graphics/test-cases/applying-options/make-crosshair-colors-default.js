function generateData() {
	const res = [];
	const time = new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0));
	for (let i = 0; i < 500; ++i) {
		res.push({
			time: time.getTime() / 1000,
			value: i,
		});

		time.setUTCDate(time.getUTCDate() + 1);
	}
	return res;
}

function runTestCase(container) {
	const chart = LightweightCharts.createChart(container);

	const areaSeries = chart.addAreaSeries({
		crosshairMarkerBorderColor: 'yellow',
		crosshairMarkerBackgroundColor: 'red',
	});

	const lineSeries = chart.addLineSeries({
		crosshairMarkerBorderColor: 'blue',
		crosshairMarkerBackgroundColor: 'green',
	});

	areaSeries.setData(generateData());
	lineSeries.setData(generateData());

	return new Promise(resolve => {
		setTimeout(() => {
			areaSeries.applyOptions({
				crosshairMarkerBorderColor: '#ffffff',
				crosshairMarkerBackgroundColor: '#2296f3',
			});
			lineSeries.applyOptions({
				crosshairMarkerBorderColor: '#ffffff',
				crosshairMarkerBackgroundColor: '#2296f3',
			});
			resolve();
		}, 300);
	});
}

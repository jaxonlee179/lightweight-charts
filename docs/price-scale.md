# Price Scale

Price Scale is an object that maps prices to coordinates and and vice versa.
The rules of converting depend on price scale mod, visible height of chart and visible part of data.

Chart always has two predefined price scales: left and right, and unlimited number of overlay scales.
Left and right price scales could be visible, overlay price scales are always hidden, so the user cannot interact them directly.

## Autoscale

Autoscaling is a feature of automatic adjusting price scale to fit the visible range of data.
Autoscaling is enabled by default, however you could turn it off by zooming price scale or calling corresponding API method.
Overlay price scales are always autoscale.

## PriceScale ID

Each price scale has corresponsing ID to refer it via API. Left and right price scales have predefined Ids `left` and `right`.
While creating a series, you could specify PriceScaleID. If this id refers to already existing price scale, new series will share
the price scale with already existing series.
If specified price scale does not exist, it will be implicitly created. So to create two series on the same overlay price scale
just specify the same `priceScaleId` for them.

## Percentage scales

Percentage mode of price scale allows relative comparing of series. All the serieses attached to the percentage scale are placed
to have the first visible data item on the same point.
Percentage scales are always autoscaled.

## Logarithmic scales

The reason of having logarithmic scales is comparing relative change instead of absolute change.
On regular scale every candle with 100-points change has the same height.
On logarithmic scale event candle with 2% change has the same height.
Logarithmic scale cannot be percentage.

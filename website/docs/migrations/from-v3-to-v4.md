# From v3 to v4

In this document you can find the migration guide from the previous version v3 to v4.

## Exported enum `LasPriceAnimationMode` has been removed

Please use [`LastPriceAnimationMode`](/api/enums/LastPriceAnimationMode) instead.

## `scaleMargins` option has been removed from series options

Previously, you could do something like the following:

```js
const series = chart.addLineSeries({
    scaleMargins: { /* options here */},
});
```

And `scaleMargins` option was applied to series' price scale as `scaleMargins` option.

Since v4 this option won't be applied to the price scale and will be just ignored (if you're using TypeScript you will get a compilation error).

To fix this, you need to apply these options to series' price scale:

```js
const series = chart.addLineSeries();

series.priceScale().applyOptions({
    scaleMargins: { /* options here */},
});
```

## `backgroundColor` from `layout` options has been removed

If you want to have solid background color you need to use [`background`](/api/interfaces/LayoutOptions#background) property instead, e.g. instead of:

```js
const chart = createChart({
    layout: {
        backgroundColor: 'red',
    },
});
```

use

```js
const chart = createChart({
    layout: {
        background: {
            type: ColorType.Solid,
            color: 'red',
        },
    },
});
```

## `overlay` property of series options has been removed

Please follow [the guide for migrating from v2 to v3](./from-v2-to-v3.md#creating-overlay) where this option was deprecated.

## `priceScale` option has been removed

Please follow [the guide for migrating from v2 to v3](./from-v2-to-v3.md#two-price-scales).

## `priceScale()` method of chart API now requires to provide price scale id

Before v4 you could write the following code:

```js
const priceScale = chart.priceScale();
```

And in `priceScale` you had a right price scale if it is visible and a left price scale otherwise.

Since v4 you have to provide an ID of price scale explicitly, e.g. if you want to get a right price scale you need to provide `'right'`:

```js
const rightPriceScale = chart.priceScale('right');
const leftPriceScale = chart.priceScale('left');
```

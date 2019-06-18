# Exchange Integration Specification

The following section describes the API that an exchange must implement in order to integrate with the Nomics platform. From the root of your API, you must implement the following endpoints.

## What do I need to implement?

There are many endpoints in this spec, and not all of them are required. They are marked with one of the following:

* Required: This endpoint **must** be implemented in order for Nomics to integrate.
* Preferred: This endpoint is the simplest and provides the highest quality data to Nomics.
* Optional: While not required, this endpoint adds extra information or reduces load or latency.
* Discouraged: This endpoint is present for maximum compatibility, but Preferred endpoints should be implemented whenever possible.

## `/info` - Exchange Information - **Required**

The `/info` endpoint returns information about the exchange as a whole, and is used by Nomics to display information about your exchange to users.

### Parameters

None

### Response

JSON object containing the following properties:

- `name`: **Required** The name of the exchange
- `description`: **Required** An exchange description of at least 1000 characters in plain text (no html)
- `location`: **Required** The primary country the exchange operates from
- `logo`: **Required** A URL to your exchange's logo. It should be an SVG with a square aspect ratio or a 500x500 PNG
- `website`: **Required** A URL to your exchange
- `twitter`: Twitter username to your exchange (without @)
- `capability`: An object describing the endpoints this integration implements. If not provided, false is assumed for all capabilities. It a capability is ommitted, it is assumed false.
  - `markets`: boolean indicating markets endpoint is implemented
  - `trades`: boolean indicating trades endpoint is implemented
  - `tradesByTimestamp`: boolean indicating trades by timestamp endpoint is implemented
  - `tradesSocket`: boolean indicating trades socket endpoint is implemented
  - `orders`: boolean indicating orders endpoint is implemented
  - `ordersSocket`: boolean indicating orders socket endpoint is implemented
  - `ordersSnapshot`: boolean indicating orders snapshot endpoint is implemented
  - `candles`: boolean indicating candles endpoint is implemented

Example:

```json
{
  "name": "Exchange Name",
  "description": "An exchange description of at least 1000 characters in plain text (no html)",
  "location": "Country Name",
  "logo": "https://example.com/exchange-logo.png",
  "website": "https://example.com",
  "twitter": "example",
  "capability": {
    "markets": true,
    "trades": true,
    "tradesSocket": false,
    "orders": false,
    "ordersSocket": false,
    "ordersSnapshot": false,
    "candles": true
  }
}
```

## `/markets` - Available Markets - **Required**

The `/markets` endpoint returns a list of all available markets on your exchange and is used to query other endpoints on your API.

### Parameters

None

### Response

JSON array of objects (one for each market) containing the following properties:

* `id`: **Required** The exchange's ID of the market
* `base`: **Required** The base currency of the market
* `quote`: **Required** The quote currency of the market

Example:

```json
[
  {
    "id": "BTC-USD",
    "base":"BTC",
    "quote": "USD"
  }, {
    "id": "ETH-USDT",
    "base": "ETH",
    "quote": "USDT"
  }
]
```

## `/trades` - Historical Executed Trades - **Preferred**

The `/trades` endpoint returns executed trades historically for a given market (provided via parameters). It allows Nomics to ingest all trades from your exchange for all time.

### Parameters

* `market` **Required** A market ID from the `/markets` endpoint
* `since` A trade ID from a previous `/trades` response. If none is provided, the oldest trades should be returned

### Response

JSON array of trade object for the given market after (and not including) the trade ID provided, with the following properties:

* `id` **Required** A string ID for the trade that is unique within the scope of the market
* `timestamp` **Required** Timestamp of the trade in RFC3339
* `price` **Required** The price for one unit of the base currency expressed in the quote currency as a string that is parseable to a positive number.
* `amount` **Required** The amount of the base currency that was traded as a string that is parseable to a positive number.
* `order` The ID of the order that was executed to produce this trade
* `type` The type of order that resulted in the trade: [`market`, `limit`]
* `side` The direction of the trade [`buy`, `sell`]
* `raw` The raw data of the trade as represented by the exchange. This can be any JSON encodable data.

Example:

```json
[
  {
    "id": "123456789",
    "timestamp": "2006-01-02T15:04:05.999Z",
    "price": "123.45678",
    "amount": "48.75",
    "order": "8afe76fabe8befa",
    "type": "market",
    "side": "buy",
    "raw": [123456789, 1136214245, 123.45678, 48.75, "8afe76fabe8befa", "m"]
  }
]
```

Notes:

* The number of trades returned is up to the exchange's implementation.
* Returning an empty array signifies there are no newer trades than the given `since` ID.

## `/trades/socket` - Streaming Trades - **Optional**

**Websocket endpoints are not a replacement for a REST endpoint, they may be provided in addition to a REST endpoint to reduce load and latency**

The `/trades/socket` endpoint returns the same information as `trades` but as a realtime streaming data feed implemented as a websocket.

The parameters are the same as `/trades` but without `since` (so just the `market` parameter).

The response is a websocket feed. Trades should be sent individually as a JSON object (not wrapped in an array) in the same format as `/trades`.

## `/orders` - Historical Orders - **Preferred**

**In development**

The `/orders` endpoint returns orders historically for a given market. It allows Nomics to ingest all orders (filled, cancelled, and open) for all time.

This endpoint is currently in development. If you are interested in integrating your orders will us, please [contact us](https://p.nomics.com/contact/).

## `/orders/socket` - Streaming Orders - **Optional**

**In development**

**Websocket endpoints are not a replacement for a REST endpoint, they may be provided in addition to a REST endpoint to reduce load and latency**

The `/orders/socket` endpoint returns the same information as `/orders` but as a realtime streaming data feed implemented as a websocket.

The parameters are the same as `/orders`.

The response is a websocket feed. Orders should be sent individually as a JSON object (not wrapped in an array) in the same format as `/orders`.

## `/orders/snapshot` - Current Order Book Snapshot - **Discouraged**

**If you implement `/orders` you do not need to implement `/orders/snapshot`.**

The `/orders/snapshot` endpoint returns the current order book for a given market. It allows Nomics to get a simple snapshot of open orders.

### Parameters

* `market` **Required** A market ID from the `/markets` endpoint

### Response

JSON object of all bids and asks that are currently open for the provided market, with the following properties:

* `bids` **Required** a list of all open bid orders
* `asks` **Required** as list of all open ask orders
* `timestamp` **Required** the timestamp this snapshot was created in RFC3339

Each order is a tuple with the following entries:

* `price` **Required** the price for one unit of the base currency expressed in the quote currency as a JSON number
* `amount` **Required** the amount of the base currency available at this price point as a JSON number

Example:

```json
{
    "bids": [
      [8123.45678, 10.00000]
    ],
    "asks": [
      [8120.00000, 5.00000]
    ],
    "timestamp": "2006-01-02T15:04:05.999Z"
}
```

Bids **must be sorted in descending order** and asks **must be sorted in ascending order**. This means the first bid is the best bid and the first ask is the best ask.

When returning orders, perform as little aggregation as possible (ideally none) and include as many orders as possible (ideally all).

## `/candles` - Candles - **Discouraged**

**If you implement `/trades` you do not need to implement `/candles`.**

The `/candles` endpoint returns open, high, low, close, and volume data for a given market in 24 hour, 1 hour, and 1 minute periods. It allows Nomics to get at least a 24 hour picture of a market, as well as a high level historical view when available. Implementing this endpoint **requires `1d`, `1h`, and `1m` candle intervals**.

**We highly recommend implementing the `/trades` endpoint instead of the `/candles` endpoint.** The `/candles` endpoint should be used as a last resort if implementing `/trades` is not possible.

### Parameters

- `market` **Required** A market ID from the `/markets` endpoint.
- `interval` **Required** The interval of the OHLCV candles. Valid values are `1d`, `1h`, and `1m`.

### Response

JSON array of OHLCV Candles for the given market and interval. If daily candles are available, as many as possible should be returned (preferably to inception). Otherwise, candles should be returned fixed 24 hour, 1 hour, or 1 minute intervals. Timestamps should be aligned to candle size. IE: Midnight UTC (`2018-01-01T:00:00:00.000Z`) for `1d`, to the hour (`2018-01-01T03:00:00.000Z`) for `1h`, and to the minute (`2018-01-01T03:03:00.000Z`) for `1m`. Candles should be sorted by timestamp ascending. Candles have the following properties:

- `timestamp` **Required** timestamp of the start of the candle in RFC3339 aligned to candle size in UTC
- `close` **Required** close price of the asset in the quote currency as a string parseable to a positive number
- `open` **Required** open price of the asset in the quote currency as a string parseable to a positive number
- `high` **Required** highest price of the asset in the quote currency as a string parseable to a positive number
- `low` **Required** lowest price of the asset in the quote currency as a string parseable to a positive number
- `volume` **Required** volume of the asset in the base currency as a string parseable to a positive number

Candles are expected to include a minimum number of records for a given interval and to include the "last candle" within the given timeframe:

- `1d`: 7 candles with last candle occuring within a rolling 48 hours
- `1h`: 24 candles with last candle occuring within a rolling 2 hours
- `1m`: 60 candles with last candle occurring within a rolling 10 minutes

## `/ticker` - Ticker - **Discouraged**

**If you implement `/trades` you do not need to implement `/ticker`.**

The `/ticker` endpoint returns last prices (close) and 24h volume data for a given market. It allows Nomics to get a current snapshot of a given market. Implementing this endpoint requires the attributes above in addition to a market symbol and timestamp. Optional attributes include open, high, low, bid, and ask prices.

**We highly recommend implementing the `/trades` endpoint instead of the `/ticker` endpoint.** The `/ticker` endpoint should be used as a last resort if implementing `/trades` is not possible.

### Parameters

- `market` **Required** A market ID from the `/markets` endpoint.

### Response

JSON object of the current ticker values for the given market. Tickers have the following properties:

- `close` **Required** the current price of the asset in the quote currency as a string parseable to a positive number
- `volume` **Required** volume of the asset in the base currency as a string parseable to a positive number
- `timestamp` **Required** timestamp of the current ticker values in RFC3339 in UTC
- `raw` **Required** the raw ticker values as a JSON object
- `high` **Optional** highest price of the asset in the quote currency as a string parseable to a positive number
- `low` **Optional** lowest price of the asset in the quote currency as a string parseable to a positive number
- `ask` **Optional** open price of the asset in the quote currency as a string parseable to a positive number
- `bid` **Optional** open price of the asset in the quote currency as a string parseable to a positive number

Tickers are expected to include the most current data for a given market.

## `/trades-by-timestamp` - Historical Executed Trades Paged by Timestamp - **Discouraged**

The `/trades-by-timestamp` endpoint is nearly identical to the `/trades` endpoint. The core difference is that the `since` parameter is an RFC3339 timestamp instead of an ID. Otherwise, the parameters and response are the same.

This endpoint is provided to maximum compatibility with exchanges that can't paginate trades based on ID. It is inferior to paging by ID because in extremely high volume instances there may be more trades executed at the same timestamp than fit on a single page, causing a gap in trade data. If possible, `/trades` should be used instead.

### Parameters

* `market` **Required** A market ID from the `/markets` endpoint
* `since` A timestamp from a previous `/trades-by-timestamp` response in RFC3339 format. If none is provided, the oldest trades should be returned

### Response

Same as `/trades`.

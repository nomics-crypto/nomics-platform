# Exchange Integration Specification

The following section describes the API that an exchange must implement in order to integrate with the Nomics platform. From the root of your API, you must implement the following endpoints.

## What do I need to implement?

There are many endpoints in this spec, and not all of them are required. They are marked with one of the following:

- Required: This endpoint **must** be implemented in order for Nomics to integrate.
- Preferred: This endpoint is the simplest and provides the highest quality data to Nomics.
- Optional: While not required, this endpoint adds extra information or reduces load or latency.
- Discouraged: This endpoint is present for maximum compatibility, but Preferred endpoints should be implemented whenever possible.

## `/info` - Exchange Information - **Required**

The `/info` endpoint returns information about the exchange as a whole, and is used by Nomics to display information about your exchange to users.

### Parameters

None

### Response

JSON object containing the following properties:

**Required**:

- `name`: The name of the exchange
- `description`: An exchange description of at least 1000 characters in plain text (no html)
- `location`: The primary country the exchange operates from
- `logo`: A HTTPS URL to your exchange's logo. It should be an SVG with a square aspect ratio or a 500x500 PNG
- `website`: A URL to your exchange
- `twitter`: Twitter username to your exchange (without @)
- `version`: The Nomics Platform Specification version
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
  "version": "1.0",
  "capability": {
    "markets": true,
    "trades": true,
    "ordersSnapshot": true,
    "candles": false,
    "ticker": false
  }
}
```

## `/markets` - Available Markets - **Required**

The `/markets` endpoint returns a list of all available markets on your exchange and is used to query other endpoints on your API.

### Parameters

None

### Response

JSON array of objects (one for each market) containing the following properties:

**Required**:

- `id`: Your exchange's unique ID of the market as a string.
- `type`: The type of the market:
  - `spot`: If the asset actually being traded is for immediate delivery. This is the most common type of cryptocurrency market.
  - `derivative`: If the market represents trading activity on any kind of contract or underlying asset. Examples of a derivative market are futures, options, and perpetual markets.
  - `index`: If the market represents the price of an index directly from its methodology, and it has no order book, or trading activity. This should only be used to price the underlying index and not for markets on that index. Volume for indexes should always be `1`.
- `base`: The base asset of the market
- `quote`: The quote asset of the market

_Optional_:

- `active`: Boolean representing if the market is currently active. Defaults to `true`.
- `subtypes`: An array representing additional context based on the market's `type`. Multiple subtypes are allowed.
  - `type`: `spot`: No subtypes at this time
  - `type`: `derivative`:
    - `perpetual`: If the market is a perpetual futures market regardless of underlying assets
    - `future`: If the market is a futures market regardless of underlying assets
    - `option`: If the market represents an option regardless of underlying assets
  - `type`: `index`: No subtypes at this time
- `settlement`: The settlement asset of the market. Used for derivative markets where the settlement currency may or may not differ from the base or quote currencies.
- `underlying`: The underlying asset of the market upon which a derivative’s price is based. Used for derivative markets and is typically an index.
- `market_url`: The full exchange URL for the market
- `description`: A description of the market

Example:

```json
[
  {
    "id": "ETH_BTC",
    "type": "spot",
    "base": "ETH",
    "quote": "BTC"
  },
  {
    "id": "BTC_USDT",
    "type": "derivative",
    "base": "BTC",
    "quote": "USDT",
    "active": true,
    "subtypes": ["perpetual", "future"],
    "settlement": "USDT",
    "market_url": "https://www.binance.com/en/futures/BTCUSDT",
    "description": "Binance perpetual futures market for BTC quoted in USDT"
  },
  {
    "id": "in_xrpxbt",
    "type": "index",
    "base": "XRP",
    "quote": "XBT",
    "active": true,
    "market_url": "https://www.cfbenchmarks.com/indices/XRP/XBT/RTI/seconds"
  }
]
```

## `/trades` - Historical Executed Trades - **Required for A+ Verified Exchanges**

The `/trades` endpoint returns executed trades historically for a given market (provided via parameters). It allows Nomics to ingest all trades from your exchange for all time.

### Parameters

- `market` **Required** Your exchange's market ID from the `/markets` endpoint
- `since` A trade ID from a previous `/trades` response. If none is provided, the oldest trades should be returned

### Response

JSON array of trade object for the given market after (and not including) the trade ID provided, with the following properties:

**Required**:

- `id`: A string ID for the trade that is unique within the scope of the market
- `timestamp`: Timestamp of the trade in RFC3339 in UTC
- `price`: The price for one unit of the base currency expressed in the quote currency as a string that is parseable to a positive number.

One of the following are **required**:

- `amount`: The amount of the **base** currency that was traded as a string that is parseable to a positive number. Only one of `amount` and `amount_quote` are required but both are encouraged.
- `amount_quote`: The amount of the **quote** currency that was traded as a string that is parseable to a positive number. Only one of `amount` and `amount_quote` are required but both are encouraged.

_Optional_:

- `order` The ID of the order that was executed to produce this trade
- `type` The type of order that resulted in the trade: [`market`, `limit`]
- `side` The direction of the trade [`buy`, `sell`]
- `raw` The raw data of the trade as represented by the exchange. This can be any JSON encodable data.

Example:

```json
[
  {
    "id": "123456789",
    "timestamp": "2006-01-02T15:04:05.999Z",
    "price": "123.45678",
    "amount": "48.75",
    "amount_quote": "0.02051282051",
    "order": "8afe76fabe8befa",
    "type": "market",
    "side": "buy",
    "raw": [123456789, 1136214245, 123.45678, 48.75, "8afe76fabe8befa", "m"]
  }
]
```

Notes:

- The number of trades returned is up to the exchange's implementation.
- Returning an empty array signifies there are no newer trades than the given `since` ID.

## `/trades-by-timestamp` - Historical Executed Trades Paged by Timestamp - (Discouraged)

**If you implement `/trades` you do not need to implement `/trades-by-timestamp`.**

The `/trades-by-timestamp` endpoint is nearly identical to the `/trades` endpoint. The core difference is that the `since` parameter is an RFC3339 timestamp instead of an ID. Otherwise, the parameters and response are the same.

This endpoint is provided to maximum compatibility with exchanges that can't paginate trades based on ID. It is inferior to paging by ID because in extremely high volume instances there may be more trades executed at the same timestamp than fit on a single page, causing a gap in trade data. If possible, `/trades` should be used instead.

### Parameters

- `market` **Required** Your exchange's market ID from the `/markets` endpoint
- `since` A timestamp from a previous `/trades-by-timestamp` response in RFC3339 format. If none is provided, the oldest trades should be returned

### Response

Same as `/trades`.

## `/orders/snapshot` - Current Order Book Snapshot - **Required for A+ Verified Exchanges**

**If you implement `/orders` you do not need to implement `/orders/snapshot`.**

The `/orders/snapshot` endpoint returns the current order book for a given market. It allows Nomics to get a simple snapshot of open orders.

### Parameters

- `market` **Required** Your exchange's market ID from the `/markets` endpoint

### Response

JSON object of all bids and asks that are currently open for the provided market, with the following properties:

**Required**:

- `bids`: a list of all open bid orders
- `asks`: as list of all open ask orders
- `timestamp`: the timestamp this snapshot was created in RFC3339 in UTC

Each order is a tuple with the following entries:

**Required**:

- `price`: the price for one unit of the base currency expressed in the quote currency as a JSON number or numeric string
- `amount`: the amount of the base currency available at this price point as a JSON number or numeric string

Example:

```json
{
  "bids": [[8123.45678, 10.0]],
  "asks": [[8120.0, 5.0]],
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

- `market` **Required** Your exchange's market ID from the `/markets` endpoint
- `interval` **Required** The interval of the OHLCV candles. Valid values are `1d`, `1h`, and `1m`.

### Response

JSON array of OHLCV Candles for the given market and interval. If daily candles are available, as many as possible should be returned (preferably to inception). Otherwise, candles should be returned fixed 24 hour, 1 hour, or 1 minute intervals. Timestamps should be aligned to candle size. IE: Midnight UTC (`2018-01-01T:00:00:00.000Z`) for `1d`, to the hour (`2018-01-01T03:00:00.000Z`) for `1h`, and to the minute (`2018-01-01T03:03:00.000Z`) for `1m`. Candles should be sorted by timestamp ascending. Candles have the following properties:

**Required**:

- `timestamp`: timestamp of the start of the candle in RFC3339 aligned to candle size in UTC
- `close`: close price of the asset in the quote currency as a string parseable to a positive number
- `open`: open price of the asset in the quote currency as a string parseable to a positive number
- `high`: highest price of the asset in the quote currency as a string parseable to a positive number
- `low`: lowest price of the asset in the quote currency as a string parseable to a positive number

One of the following are **required**:

- `volume`: volume of the asset in the **base** currency as a string parseable to a positive number. Only one of `volume` and `volume_quote` are required but both are encouraged.
- `volume_quote`: volume of the asset in the **quote** currency as a string parseable to a positive number. Only one of `volume` and `volume_quote` are required but both are encouraged.

Candles are expected to include a minimum number of records for a given interval and to include the "last candle" within the given timeframe:

- `1d`: 7 candles with last candle occuring within a rolling 48 hours
- `1h`: 24 candles with last candle occuring within a rolling 2 hours
- `1m`: 60 candles with last candle occurring within a rolling 10 minutes

## `/ticker` - Ticker - **Discouraged**

**If you implement `/trades` you do not need to implement `/ticker`.**

The `/ticker` endpoint returns last prices (close) and 24h volume data for a given market. It allows Nomics to get a current snapshot of a given market. Implementing this endpoint requires the attributes above in addition to a market symbol and timestamp. Optional attributes include open, high, low, bid, and ask prices.

**We highly recommend implementing the `/trades` endpoint instead of the `/ticker` endpoint.** The `/ticker` endpoint should be used as a last resort if implementing `/trades` is not possible.

### Parameters

- `market` **Required** Your exchange's market ID from the `/markets` endpoint

### Response

JSON object of the current ticker values for the given market. Tickers have the following properties:

**Required**:

- `close`: the current price of the asset in the quote currency as a string parseable to a positive number
- `timestamp`: timestamp of the current ticker values in RFC3339 in UTC
- `raw`: the raw ticker values as a JSON object

One of the following are **required**:

- `volume`: volume of the asset in the **base** currency as a string parseable to a positive number. Only one of `volume` and `volume_quote` are required but both are encouraged.
- `volume_quote`: volume of the asset in the **quote** currency as a string parseable to a positive number. Only one of `volume` and `volume_quote` are required but both are encouraged.

_Optional_:

- `high`: highest price of the asset in the quote currency as a string parseable to a positive number
- `low`: lowest price of the asset in the quote currency as a string parseable to a positive number
- `ask`: open price of the asset in the quote currency as a string parseable to a positive number
- `bid`: open price of the asset in the quote currency as a string parseable to a positive number

Tickers are expected to include the most current data for a given market.

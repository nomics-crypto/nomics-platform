# Exchange Integration Specification

The following section describes the API that an exchange must implement in order to integrate with the Nomics platform. From the root of your API, you must implement the following endpoints.

## `/info` - Exchange Information

The `/info` endpoint returns information about the exchange as a whole, and is used by Nomics to display information about your exchange to users.

### Parameters

None

### Response

JSON object containing the following properties:

* `name`: **Required** The name of the exchange
* `description`: A one paragraph description in plain text (no html)
* `logo`: A URL to your exchange's logo. It should be an SVG or a 500x500 PNG
* `website`: A URL to your exchange
* `twitter`: Twitter username to your exchange (without @)

Example:

```json
{
  "name": "Exchange Name",
  "description": "A one paragraph description of the exchange in plain text",
  "logo": "https://example.com/exchange-logo.png",
  "website": "https://example.com",
  "twitter": "example"
}
```

## `/markets` - Available Markets

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

## `/trades` - Historical Executed Trades

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
    "timestamp": "2006-01-02T15:04:05.999999999Z07:00",
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

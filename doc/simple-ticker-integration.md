# Nomics Simple Ticker Exchange Integration Specification

This document describes the simplest method for integrating your exchange with Nomics. Note that implementing the simple ticker integration will result in a D Transparency Grade. If you are interested in a higher transparency grade please see [Cryptocurrency API Exchange Integration Specification](cryptocurrency-api-exchange-integration.md).

## Ticker Specification

Your ticker can be at any valid URL that responds to an HTTP GET request and returns a JSON response.

**Example:** https://example.com/api/nomics/ticker

### Response

The response must be a JSON array of objects, with each object representing a market on your exchange. The object must contain all of the following fields:

**Required:**

- `market`: **String**. A unique identifier for this market.
- `base`: **String**. The symbol of the base currency of the market.
- `quote`: **String**. The symbol of the quote currency of the market.
- `price_quote`: **String**. The current price of the base currency of the market given in the units of the quote currency.
- `volume_base`: **String**. The total volume over the past 24 hours given in the units of the base currency.

**Example:**

```json
[
  {
    "market": "BTC-USDT",
    "base": "BTC",
    "quote": "USDT",
    "price_quote": "20936.64",
    "volume_base": "365410.92"
  },
  {
    "market": "ETH-EUR",
    "base": "ETH",
    "quote": "EUR",
    "price_quote": "1207.88",
    "volume_base": "197310.22"
  },
  {
    "market": "ETH-BTC",
    "base": "ETH",
    "quote": "BTC",
    "price_quote": "0.058510",
    "volume_base": "98213.80"
  }
]
```

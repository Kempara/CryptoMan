CryptoMan - Cryptocurrency Trading Simulator

CryptoMan is a web-based trading simulator allowing users to track real-time cryptocurrency prices, simulate buying/selling, and maintain a mock portfolio.

Technologies Used

- **Backend**: Java + Spring Boot
- **Frontend**: HTML/CSS/JS
- **Database**: PostgreSQL
- **WebSocket**: Kraken API for live crypto data
- **Build Tool**: Maven

API Endpoints (Backend)

`GET /api/cryptos`
Fetches live cryptocurrency prices (via WebSocket or REST API).
- **Returns**: Array of `{ name, price, change24h }`

- `POST /api/trade`
Simulates buying/selling a cryptocurrency.
- **Request body**:
  
  {
    "symbol": "BTC",
    "action": "BUY",
    "amount": 0.5
  }

`GET /api/portfolio`
Returns the user's current holdings and portfolio value.

`GET /api/transactions`
Fetches the transaction history of the user.

Design Decisions
WebSocket for Real-Time Prices: We use Kraken’s WebSocket API for low-latency updates rather than polling.

PostgreSQL Database: Chosen for reliability and structured data persistence of transactions.

Frontend Separation: The frontend is served from Spring Boot’s static/ directory, keeping it simple and integrated.

No Authentication: Simpler for MVP; user state is held in-memory or via a basic ID if needed.

H2 for testing / PostgreSQL for prod: Flexible DB config using Spring profiles.
package com.example.crypto_man1;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.WebSocketConnectionManager;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class CryptoController {

    private final Map<String, Double> prices = new ConcurrentHashMap<>() {{
        put("XBT/USD", 69000.00);
        put("ETH/USD", 3500.00);
        put("ADA/USD", 0.60);
        put("SOL/USD", 140.00);
        put("XRP/USD", 0.55);
        put("LTC/USD", 95.00);
        put("DOT/USD", 8.10);
        put("DOGE/USD", 0.12);
        put("AVAX/USD", 43.00);
        put("TRX/USD", 0.13);
    }};

    private final Map<String, Double> holdings = new ConcurrentHashMap<>();
    private final List<String> transactions = new ArrayList<>();
    private double balance = 10000.0;

    private final List<String> top20 = Arrays.asList(
            "XBT/USD", "ETH/USD", "ADA/USD", "SOL/USD", "XRP/USD",
            "LTC/USD", "DOT/USD", "DOGE/USD", "AVAX/USD", "TRX/USD",
            "MATIC/USD", "ATOM/USD", "LINK/USD", "ETC/USD", "UNI/USD",
            "XLM/USD", "BCH/USD", "EOS/USD", "XTZ/USD", "NEAR/USD"
    );

    @PostConstruct
    public void startPriceFeed() {
        System.out.println("Subscribing with: " + getSubscribeMessage());

        StandardWebSocketClient client = new StandardWebSocketClient();
        WebSocketConnectionManager manager = new WebSocketConnectionManager(
                client,
                new AbstractWebSocketHandler() {
                    @Override
                    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                        String subRequest = "{\"event\":\"subscribe\",\"pair\":[" +
                                top20.stream().map(s -> "\"" + s + "\"").collect(Collectors.joining(",")) +
                                "],\"subscription\":{\"name\":\"ticker\"}}";
                        session.sendMessage(new TextMessage(subRequest));
                    }

                    @Override
                    public void handleTextMessage(WebSocketSession session, TextMessage message) {
                        String payload = message.getPayload();
                        if (payload.startsWith("[") && payload.contains("\"ticker\"")) {
                            try {
                                String[] parts = payload.split(",\"ticker\",\"");
                                if (parts.length == 2) {
                                    String symbol = parts[1].replaceAll("\"\\]$", "");
                                    String priceStr = payload.split("\"c\":\\[\"")[1].split("\"")[0];
                                    prices.put(symbol, Double.parseDouble(priceStr));

                                }
                            } catch (Exception e) {
                                System.err.println("❌ Parsing error: " + e.getMessage());
                            }
                        }
                    }
                },
                "wss://ws.kraken.com"
        );
        manager.start();

    }

    private String getSubscribeMessage() {
        StringBuilder symbolsJson = new StringBuilder("[");
        for (int i = 0; i < top20.size(); i++) {
            symbolsJson.append("\"").append(top20.get(i)).append("\"");
            if (i < top20.size() - 1) symbolsJson.append(",");
        }
        symbolsJson.append("]");
        return "{\"method\":\"subscribe\",\"params\":{\"channel\":\"ticker\",\"symbol\":" + symbolsJson + "},\"req_id\":1234}";
    }

    @GetMapping("/prices")
    public Map<String, Double> getPrices() {
        return prices;
    }

    @GetMapping("/balance")
    public Map<String, Object> getBalance() {
        Map<String, Object> data = new HashMap<>();
        data.put("balance", balance);
        data.put("holdings", holdings);
        return data;
    }

    @PostMapping("/buy")
    public String buy(@RequestParam String symbol, @RequestParam double quantity) {
        Double price = prices.get(symbol);
        if (price == null) return "Price unavailable.";
        double cost = price * quantity;
        if (cost > balance) return "Insufficient funds.";
        balance -= cost;
        holdings.put(symbol, holdings.getOrDefault(symbol, 0.0) + quantity);
        String tx = "Bought " + quantity + " of " + symbol + " at $" + price + " (Total: $" + cost + ")";
        transactions.add(tx);
        return tx;
    }

    @PostMapping("/sell")
    public String sell(@RequestParam String symbol, @RequestParam double quantity) {
        Double price = prices.get(symbol);
        if (price == null) return "Price unavailable.";
        double held = holdings.getOrDefault(symbol, 0.0);
        if (quantity > held) return "Insufficient crypto.";
        double earnings = price * quantity;
        balance += earnings;
        holdings.put(symbol, held - quantity);
        String tx = "Sold " + quantity + " of " + symbol + " at $" + price + " (Total: $" + earnings + ")";
        transactions.add(tx);
        return tx;
    }

    @PostMapping("/reset")
    public String reset() {
        balance = 10000.0;
        holdings.clear();
        transactions.clear();
        return "Account reset.";
    }

    @GetMapping("/history")
    public List<String> getHistory() {
        return transactions;
    }
}

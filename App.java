import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

public class App {

    private static final String DB_URL = "jdbc:mysql://localhost:3306/medico_db";
    private static final String DB_USER = "root";
    private static final String DB_PASS = System.getenv("MEDICO_DB_PASS");

    public static void main(String[] args) throws IOException {
        if (DB_PASS == null || DB_PASS.trim().isEmpty()) {
            throw new IllegalStateException("Set the MEDICO_DB_PASS environment variable before starting the server.");
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/api/hospitals", new HospitalsHandler());
        server.createContext("/api/details", new DetailsHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("✅ Java Server running at http://localhost:8080/");
    }

    static class HospitalsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            enableCORS(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getQuery());
            double userLat = Double.parseDouble(params.getOrDefault("lat", "18.9888"));
            double userLng = Double.parseDouble(params.getOrDefault("lng", "73.1111"));
            
            String type = params.get("type");
            String equipment = params.get("equipment");
            String service = params.get("service");
            boolean insurance = Boolean.parseBoolean(params.getOrDefault("insurance", "false"));

            String jsonResponse;
            try {
                jsonResponse = getHospitalsJson(userLat, userLng, type, equipment, service, insurance);
            } catch (SQLException e) {
                e.printStackTrace();
                jsonResponse = "{\"error\":\"Unable to query hospitals. Check the backend console for the database error.\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, jsonResponse.getBytes().length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes());
                }
                return;
            }

            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, jsonResponse.getBytes().length);
            OutputStream os = exchange.getResponseBody();
            os.write(jsonResponse.getBytes());
            os.close();
        }
    }

    static class DetailsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            enableCORS(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getQuery());
            int hospitalId = Integer.parseInt(params.getOrDefault("id", "1"));

            String jsonResponse = getHospitalDetailsJson(hospitalId);

            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, jsonResponse.getBytes().length);
            OutputStream os = exchange.getResponseBody();
            os.write(jsonResponse.getBytes());
            os.close();
        }
    }

private static String getHospitalsJson(double uLat, double uLng, String type, String equipment, String service, boolean insurance) throws SQLException {
    StringBuilder json = new StringBuilder("[");
    StringBuilder sql = new StringBuilder("SELECT DISTINCT h.* FROM Hospitals h WHERE 1=1 ");

    boolean hasType = hasFilterValue(type);
    boolean hasEq = hasFilterValue(equipment);
    boolean hasSvc = hasFilterValue(service);

    if (hasEq) {
        sql.append("AND h.hospital_id IN (SELECT he.hospital_id FROM Hospital_Equipment he JOIN Equipment eq ON he.equipment_id = eq.equipment_id WHERE eq.equipment_name = ?) ");
    }
    if (hasSvc) {
        sql.append("AND h.hospital_id IN (SELECT hs.hospital_id FROM Hospital_Services hs JOIN Services s ON hs.service_id = s.service_id WHERE s.service_name = ?) ");
    }
    if (hasType) {
        sql.append("AND h.type = ? ");
    }
    if (insurance) {
        sql.append("AND h.accepts_insurance = TRUE ");
    }

    try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
         PreparedStatement stmt = conn.prepareStatement(sql.toString())) {

        int idx = 1;
        if (hasEq) stmt.setString(idx++, equipment);
        if (hasSvc) stmt.setString(idx++, service);
        if (hasType) stmt.setString(idx++, type);

        ResultSet rs = stmt.executeQuery();
        boolean first = true;
        while (rs.next()) {
            if (!first) json.append(",");
            double hLat = rs.getDouble("latitude");
            double hLng = rs.getDouble("longitude");
            double dist = haversine(uLat, uLng, hLat, hLng);

            json.append("{")
                .append("\"hospital_id\":").append(rs.getInt("hospital_id")).append(",")
                .append("\"name\":\"").append(rs.getString("name")).append("\",")
                .append("\"type\":\"").append(rs.getString("type")).append("\",")
                .append("\"latitude\":").append(hLat).append(",")
                .append("\"longitude\":").append(hLng).append(",")
                .append("\"address\":\"").append(rs.getString("address")).append("\",")
                .append("\"contact\":\"").append(rs.getString("contact_number")).append("\",")
                .append("\"insurance\":").append(rs.getBoolean("accepts_insurance")).append(",")
                .append("\"available_beds\":").append(rs.getInt("available_beds")).append(",")
                .append("\"distance_km\":").append(Math.round(dist * 100.0) / 100.0)
                .append("}");
            first = false;
        }
    }
    json.append("]");
    return json.toString();
}

    private static boolean hasFilterValue(String value) {
        return value != null && !value.trim().isEmpty() && !value.equalsIgnoreCase("undefined");
    }

    private static String getHospitalDetailsJson(int hospitalId) {
        StringBuilder json = new StringBuilder("{\"doctors\":[");
        String sql = "SELECT full_name, specialty, available_days, working_hours FROM Doctors WHERE hospital_id = ?";

        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, hospitalId);
            ResultSet rs = stmt.executeQuery();
            boolean first = true;
            while (rs.next()) {
                if (!first) json.append(",");
                json.append("{")
                    .append("\"name\":\"").append(rs.getString("full_name")).append("\",")
                    .append("\"specialty\":\"").append(rs.getString("specialty")).append("\",")
                    .append("\"days\":\"").append(rs.getString("available_days")).append("\",")
                    .append("\"hours\":\"").append(rs.getString("working_hours")).append("\"")
                    .append("}");
                first = false;
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        json.append("]}");
        return json.toString();
    }

    private static double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    private static void enableCORS(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
    }

    private static Map<String, String> parseQueryParams(String query) {
        Map<String, String> params = new HashMap<>();
        if (query == null) return params;
        for (String param : query.split("&")) {
            String[] entry = param.split("=", 2);
            if (entry.length == 2) {
                params.put(
                    URLDecoder.decode(entry[0], StandardCharsets.UTF_8),
                    URLDecoder.decode(entry[1], StandardCharsets.UTF_8)
                );
            }
        }
        return params;
    }
}
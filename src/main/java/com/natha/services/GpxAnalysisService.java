package com.natha.services;

import com.natha.models.Point;
import io.jenetics.jpx.GPX;
import io.jenetics.jpx.Length;
import io.jenetics.jpx.Track;
import io.jenetics.jpx.TrackSegment;
import io.jenetics.jpx.WayPoint;
import io.jenetics.jpx.geom.Geoid;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GpxAnalysisService {

    private static final String NOMINATIM_API = "https://nominatim.openstreetmap.org/reverse?format=json&lat=%f&lon=%f";

    // returning a hashmap with all my info on it.
    public Map<String, Object> analyzeGpx(MultipartFile file) throws IOException, InterruptedException {
        Map<String, Object> result = new HashMap<>();

        try (InputStream is = file.getInputStream()) {
            GPX gpx = GPX.Reader.DEFAULT.read(is);

            double[] coordinates = getFirstAndLastCoordinates(gpx);
            double totalDistance = calculateTotalDistance(gpx);
            String[] placeNames = getPlaceNames(coordinates);
            List<Point> allPoints = getAllTrackPoints(gpx);
            //List<Map<String, Object>> elevationData = getElevationData(gpx);

// information here is mutable now with editing the map on DR.js.. 
// Remove this and change the getplace name API stuff to only being on js or remove it altogether

            result.put("startLat", coordinates[0]);
            result.put("startLon", coordinates[1]);
            result.put("endLat", coordinates[2]);
            result.put("endLon", coordinates[3]);
            result.put("totalDistance", totalDistance);
            result.put("totalDistanceKm", totalDistance / 1000);
            result.put("startLocation", placeNames[0]);
            result.put("endLocation", placeNames[1]);
            result.put("allPoints", allPoints);
            //result.put("elevationData", elevationData);
            //result.put("elevationData", elevationData);
        }

        // final result and real shit that's going out of this specific program
        return result;
    }



// ele can be not there find way to make sure that's cool
private List<Point> getAllTrackPoints(GPX gpx) {
    List<Point> allPoints = new ArrayList<>();
    
    for (Track track : gpx.getTracks()) {
        for (TrackSegment segment : track.getSegments()) {
            for (WayPoint wayPoint : segment.getPoints()) {
                double elevation = wayPoint.getElevation()
                    .map(Length::doubleValue)
                    .orElse(Double.NaN);  // or any default value you prefer

                allPoints.add(new Point(
                    wayPoint.getLatitude().doubleValue(),
                    wayPoint.getLongitude().doubleValue(),
                    elevation
                ));
            }
        }
    }
    
    return allPoints;
}

    private double[] getFirstAndLastCoordinates(GPX gpx) {
        List<Track> tracks = gpx.getTracks();
        
        if (tracks.isEmpty()) {
            throw new IllegalArgumentException("No tracks found in the GPX file");
        }
        
        Track firstTrack = tracks.get(0);
        List<TrackSegment> segments = firstTrack.getSegments();
        
        if (segments.isEmpty()) {
            throw new IllegalArgumentException("No segments found in the track");
        }
        
        TrackSegment firstSegment = segments.get(0);
        List<WayPoint> points = firstSegment.getPoints();
        
        if (points.size() < 2) {
            throw new IllegalArgumentException("Not enough points in the track segment");
        }
        
        WayPoint firstPoint = points.get(0);
        WayPoint lastPoint = points.get(points.size() - 1);
        
        return new double[] {
            firstPoint.getLatitude().doubleValue(),
            firstPoint.getLongitude().doubleValue(),
            lastPoint.getLatitude().doubleValue(),
            lastPoint.getLongitude().doubleValue()
        };
    }

    private double calculateTotalDistance(GPX gpx) {
        double totalDistance = 0.0;
        
        for (Track track : gpx.getTracks()) {
            for (TrackSegment segment : track.getSegments()) {
                List<WayPoint> points = segment.getPoints();
                
                for (int i = 0; i < points.size() - 1; i++) {
                    WayPoint point1 = points.get(i);
                    WayPoint point2 = points.get(i + 1);
                    
                    Length length = Geoid.WGS84.distance(point1, point2);
                    totalDistance += length.doubleValue();
                }
            }
        }

        return totalDistance;
    }

    private String[] getPlaceNames(double[] coordinates) throws IOException, InterruptedException {
        String startPlace = getPlaceName(coordinates[0], coordinates[1]);
        String endPlace = getPlaceName(coordinates[2], coordinates[3]);
        return new String[]{startPlace, endPlace};
    }

    private String getPlaceName(double lat, double lon) throws IOException, InterruptedException {
        String url = String.format(NOMINATIM_API, lat, lon);
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "GPXAnalyzer/1.0")
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JSONObject json = new JSONObject(response.body());
        
        return json.optString("display_name", "Unknown location");
    }
}
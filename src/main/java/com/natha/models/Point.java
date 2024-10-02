package com.natha.models;

public class Point {
    private double lat;
    private double lon;
    private double ele;

    public Point(double lat, double lon, double ele) {
        this.lat = lat;
        this.lon = lon;
        this.ele = ele;
    }

    public double getLat() {
        return lat;
    }

    public double getLon() {
        return lon;
    }
    public  double getEle() {
        return ele;
    }
}
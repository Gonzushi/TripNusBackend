import { Request, Response } from "express";
import axios from "axios";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

interface Coordinates extends Array<number> {
  0: number; // longitude
  1: number; // latitude
}

interface MapboxRoute {
  duration: number; // seconds
  distance: number; // meters
}

interface MapboxResponse {
  routes: MapboxRoute[];
  waypoints: any[];
  code: string;
  uuid: string;
}

// Fare calculation function
function calculateFare(distanceMeters: number, durationSeconds: number) {
  const distanceKm = distanceMeters / 1000;
  const durationMin = durationSeconds / 60;

  const carBaseFare = 5000;
  const carPerKm = 3000;
  const carPerMin = 500;
  const carFare = carBaseFare + carPerKm * distanceKm + carPerMin * durationMin;

  const motorBaseFare = 3000;
  const motorPerKm = 2000;
  const motorPerMin = 300;
  const motorFare =
    motorBaseFare + motorPerKm * distanceKm + motorPerMin * durationMin;

  return {
    car: Math.round(carFare),
    motorcycle: Math.round(motorFare),
  };
}

// Create fare controller
export const calcaulateFare = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { pickpoint, dropoff } = req.body;

    if (!pickpoint || !dropoff) {
      res.status(400).json({ error: "pickpoint and dropoff are required" });
      return;
    }

    if (
      !Array.isArray(pickpoint) ||
      !Array.isArray(dropoff) ||
      pickpoint.length !== 2 ||
      dropoff.length !== 2 ||
      !pickpoint.every((coord) => typeof coord === "number" && !isNaN(coord)) ||
      !dropoff.every((coord) => typeof coord === "number" && !isNaN(coord))
    ) {
      res.status(400).json({
        error:
          "pickpoint and dropoff must be arrays of two valid numbers [lng, lat]",
      });
      return;
    }

    const coordinates = `${pickpoint[0]},${pickpoint[1]};${dropoff[0]},${dropoff[1]}`;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${encodeURIComponent(
      coordinates
    )}?alternatives=false&annotations=distance,duration&geometries=geojson&language=en&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;

    const response = await axios.get<MapboxResponse>(url, {
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      res.status(response.status).json({
        error: "Failed to get route from Mapbox",
        details: response.data,
      });
      return;
    }

    const routing = response.data;

    if (routing.code !== "Ok") {
      res.status(500).json({ error: "Mapbox did not return a valid route." });
      return;
    }

    const route = routing.routes[0];
    const { distance, duration } = route;

    const fare = calculateFare(distance, duration);

    res.json({
      fare,
      routing,
    });
  } catch (error: any) {
    console.error("Internal error:", error?.response?.data || error.message);
    res.status(500).json({
      error: "Internal server error",
      details: error?.response?.data || error.message,
    });
  }
};

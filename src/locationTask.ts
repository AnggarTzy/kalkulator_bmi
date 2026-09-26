import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_LOCATION_TASK = "IFIT_BACKGROUND_LOCATION";
export const TRACKER_STORAGE_KEY = "@ifit_tracker_state";

type LatLng = {
  latitude: number;
  longitude: number;
};

type ActivityType = "Joging" | "Lari" | "Bersepeda";

type StoredTrackerState = {
  tracking: boolean;
  activityType: ActivityType;
  weight: number;
  distance: number;
  activeDuration: number;
  lastLocation: LatLng | null;
  lastTimestamp: number | null;
};

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }) => {
      if (error) {
        return;
      }

      if (!data) {
        return;
      }

      const locations = (
        data as {
          locations?: Location.LocationObject[];
        }
      ).locations;

      if (!locations || locations.length === 0) {
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);

        if (!raw) {
          return;
        }

        const state: StoredTrackerState = JSON.parse(raw);

        if (!state.tracking) {
          return;
        }

        const lastGps = locations[locations.length - 1];

        const point: LatLng = {
          latitude: lastGps.coords.latitude,
          longitude: lastGps.coords.longitude,
        };

        const timestamp = lastGps.timestamp || Date.now();

        const nextState: StoredTrackerState = {
          ...state,
        };

        if (nextState.lastLocation && nextState.lastTimestamp) {
          const distance = getDistanceKm(
            nextState.lastLocation.latitude,
            nextState.lastLocation.longitude,
            point.latitude,
            point.longitude
          );

          const speed = lastGps.coords.speed;
          const accuracy = lastGps.coords.accuracy;

          const hasGoodAccuracy =
            accuracy == null || accuracy <= 30;

          const movingBySpeed =
            speed != null && speed >= 0.5;

          const movingByDistance =
            (speed == null || speed < 0) && distance >= 0.005;

          const moving =
            hasGoodAccuracy &&
            (movingBySpeed || movingByDistance);

          if (moving && distance > 0 && distance <= 0.2) {
            nextState.distance += distance;

            const elapsed = Math.max(
              0,
              Math.floor(
                (timestamp - nextState.lastTimestamp) / 1000
              )
            );

            nextState.activeDuration += Math.min(
              elapsed,
              30
            );
          }
        }

        nextState.lastLocation = point;
        nextState.lastTimestamp = timestamp;

        await AsyncStorage.setItem(
          TRACKER_STORAGE_KEY,
          JSON.stringify(nextState)
        );
      } catch {
        // Abaikan error background agar task tidak berhenti.
      }
    }
  );
}
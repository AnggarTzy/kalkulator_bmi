import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

type ActivityType = "Joging" | "Lari" | "Bersepeda";
type Gender = "Pria" | "Wanita";

type LatLng = {
  latitude: number;
  longitude: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MET_VALUES: Record<ActivityType, number> = {
  Joging: 7.0,
  Lari: 9.8,
  Bersepeda: 8.0,
};

const DEFAULT_REGION = {
  latitude: -7.250445,
  longitude: 112.768845,
};

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <style>
    html,
    body,
    #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      overflow: hidden;
    }

    .leaflet-control-attribution {
      font-size: 8px;
    }

    .user-marker-wrap {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.16);
    }

    .user-arrow {
      width: 30px;
      height: 30px;
      transform-origin: 50% 50%;
      transition: transform 0.25s ease-out;
      filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.35));
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const map = L.map("map", {
      zoomControl: true,
      attributionControl: true,
      touchZoom: true,
      doubleClickZoom: true,
      dragging: true,
      scrollWheelZoom: true
    }).setView(
      [${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}],
      13
    );

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }
    ).addTo(map);

    const userIcon = L.divIcon({
      className: "",
      html: '<div class="user-marker-wrap"><svg id="user-arrow" class="user-arrow" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-label="Posisi kamu"><path d="M20 2 L37 36 L20 28 L3 36 Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="23" r="2.5" fill="#FFFFFF"/></svg></div>', 
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    let userMarker = null;

    const routeLine = L.polyline([], {
      color: "#2563EB",
      weight: 5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    let userChangedMap = false;
    let firstLocationShown = false;

    map.on("zoomstart", function() {
      userChangedMap = true;
    });

    map.on("dragstart", function() {
      userChangedMap = true;
    });

    function updateMap(latitude, longitude, routeData, shouldFollow, heading) {
      const point = [latitude, longitude];

      if (!userMarker) {
        userMarker = L.marker(point, {
          icon: userIcon
        }).addTo(map);
      } else {
        userMarker.setLatLng(point);
      }

      const arrow = document.getElementById("user-arrow");
      if (arrow && typeof heading === "number" && Number.isFinite(heading)) {
        arrow.style.transform = "rotate(" + heading + "deg)";
      }

      if (Array.isArray(routeData)) {
        const coordinates = routeData.map(function(item) {
          return [item.latitude, item.longitude];
        });

        routeLine.setLatLngs(coordinates);
      }

      if (shouldFollow && !userChangedMap) {
        const targetZoom = map.getZoom() < 16 ? 17 : map.getZoom();
        map.setView(point, targetZoom, {
          animate: true,
          duration: 0.5
        });
      } else if (shouldFollow && !firstLocationShown) {
        map.setView(point, 17, {
          animate: true,
          duration: 0.5
        });
      }

      firstLocationShown = true;
    }

    function resetMap() {
      if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }

      routeLine.setLatLngs([]);
      userChangedMap = false;
      firstLocationShown = false;

      map.setView(
        [${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}],
        13
      );
    }

    if (typeof L === "undefined") {
      document.getElementById("map").innerHTML =
        '<div style="height:100%;display:flex;align-items:center;justify-content:center;background:#E2E8F0;color:#475569;font:600 14px Arial;text-align:center;padding:20px;box-sizing:border-box;">Peta gagal dimuat. Periksa koneksi internet lalu coba lagi.</div>';
    } else if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage("LEAFLET_READY");
    }
  </script>
</body>
</html>
`;

export default function App() {
  // ================= PROFIL =================
  const [profileName, setProfileName] = useState("Pengguna IFit");
  const [gender, setGender] = useState<Gender>("Pria");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // ================= TEMA & SIDEBAR =================
  const [isDark, setIsDark] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  // ================= BMI =================
  const [bmiResult, setBmiResult] = useState<string | null>(null);
  const [bmiCategory, setBmiCategory] = useState("");
  const [idealWeight, setIdealWeight] = useState("");

  // ================= TRACKER =================
  const [isTracking, setIsTracking] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("Joging");
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [calories, setCalories] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [locationStatus, setLocationStatus] = useState("Lokasi belum aktif");

  const [locationSub, setLocationSub] =
    useState<Location.LocationSubscription | null>(null);

  const lastLocation = useRef<LatLng | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [heading, setHeading] = useState(0);
  const lastHeadingRef = useRef(0);
  const lastSpokenKmRef = useRef(0);
  const isMovingRef = useRef(false);
  const movingSamplesRef = useRef(0);

  const theme = isDark
    ? {
        background: "#0F172A",
        card: "#1E293B",
        text: "#F8FAFC",
        muted: "#94A3B8",
        border: "#334155",
        input: "#0F172A",
        soft: "#172033",
        primary: "#3B82F6",
        result: "#172554",
        drawer: "#111827",
      }
    : {
        background: "#F1F5F9",
        card: "#FFFFFF",
        text: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
        input: "#FFFFFF",
        soft: "#F8FAFC",
        primary: "#2563EB",
        result: "#EFF6FF",
        drawer: "#FFFFFF",
      };

  // ================= SIDEBAR =================
  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(drawerAnim, {
      toValue: -SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  // ================= BMI =================
  const calculateBMI = () => {
    if (!weight || !height || !age) {
      Alert.alert(
        "Data belum lengkap",
        "Harap isi usia, berat, dan tinggi badan."
      );
      return;
    }

    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    const userAge = parseInt(age, 10);

    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      !Number.isFinite(userAge) ||
      w <= 0 ||
      h <= 0 ||
      userAge <= 0
    ) {
      Alert.alert(
        "Data tidak valid",
        "Masukkan usia, berat, dan tinggi dengan angka yang benar."
      );
      return;
    }

    const bmi = w / (h * h);
    setBmiResult(bmi.toFixed(1));

    if (bmi < 18.5) setBmiCategory("Kurus");
    else if (bmi < 25) setBmiCategory("Normal");
    else if (bmi < 30) setBmiCategory("Gemuk");
    else setBmiCategory("Obesitas");

    const minWeight = 18.5 * (h * h);
    const maxWeight = 24.9 * (h * h);
    setIdealWeight(`${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`);
  };

  const getBmiAdvice = () => {
    switch (bmiCategory) {
      case "Kurus":
        return {
          title: "Fokus pada asupan yang cukup dan seimbang",
          message:
            "Usahakan makan teratur dan pilih makanan beragam. Jika berat sulit bertambah atau ada keluhan kesehatan, bicarakan dengan orang tua/wali dan tenaga kesehatan.",
          foods: [
            "Nasi/oat/kentang",
            "Telur & ikan",
            "Sayur & buah",
            "Susu/yogurt bila cocok",
          ],
          drinks: ["Air putih", "Susu", "Smoothie buah tanpa berlebihan gula"],
        };
      case "Normal":
        return {
          title: "Pertahankan kebiasaan sehat",
          message:
            "Pertahankan pola makan beragam, tidur cukup, minum air putih, dan tetap aktif. Tidak perlu melakukan diet ketat hanya karena angka BMI.",
          foods: [
            "Nasi/oat",
            "Ayam/ikan/telur",
            "Sayur & buah",
            "Kacang-kacangan",
          ],
          drinks: [
            "Air putih",
            "Susu/yogurt",
            "Jus buah tanpa tambahan gula berlebihan",
          ],
        };
      case "Gemuk":
        return {
          title: "Fokus pada kebiasaan sehat, bukan diet ketat",
          message:
            "Utamakan makan teratur, makanan beragam, aktivitas fisik, dan tidur cukup. Karena usia di bawah 18 tahun masih dalam masa pertumbuhan, jangan melakukan pembatasan makan atau program penurunan berat badan tanpa arahan tenaga kesehatan.",
          foods: [
            "Sayur & buah",
            "Ikan/ayam/telur",
            "Nasi atau sumber karbohidrat",
            "Kacang-kacangan",
          ],
          drinks: [
            "Air putih",
            "Susu sesuai kebutuhan",
            "Minuman tanpa tambahan gula berlebihan",
          ],
        };
      case "Obesitas":
        return {
          title: "Jaga kesehatan dengan pendampingan yang tepat",
          message:
            "Jangan melakukan diet ekstrem atau melewatkan makan. Untuk usia sekolah/remaja, hasil BMI perlu dinilai berdasarkan usia dan jenis kelamin oleh tenaga kesehatan. Diskusikan hasil ini dengan orang tua/wali dan tenaga kesehatan.",
          foods: [
            "Sayur & buah",
            "Protein: ikan/ayam/telur",
            "Karbohidrat secukupnya",
            "Kacang-kacangan",
          ],
          drinks: [
            "Air putih",
            "Susu sesuai kebutuhan",
            "Batasi minuman sangat manis",
          ],
        };
      default:
        return null;
    }
  };

  // ================= JARAK & GPS =================
  const getDistance = (
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

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getBearing = (from: LatLng, to: LatLng) => {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  const speakDistance = (km: number) => {
    Speech.stop();
    Speech.speak(`Jarak sudah ${km} kilometer`, {
      language: "id-ID",
      rate: 0.9,
      pitch: 1.0,
      volume: 1.0,
    });
  };

  useEffect(() => {
    if (!leafletReady || !currentLocation) return;

    const routeJson = JSON.stringify(route);

    webViewRef.current?.injectJavaScript(`
      if (typeof updateMap === "function") {
        updateMap(
          ${currentLocation.latitude},
          ${currentLocation.longitude},
          ${routeJson},
          ${isTracking},
          ${heading}
        );
      }
      true;
    `);
  }, [leafletReady, currentLocation, route, isTracking, heading]);

  const startTracking = async () => {
    if (isTracking) return;

    lastSpokenKmRef.current = 0;
    isMovingRef.current = false;
    movingSamplesRef.current = 0;
    setIsMoving(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationStatus("Izin lokasi ditolak");
        Alert.alert(
          "Izin Lokasi Diperlukan",
          "Aktifkan izin lokasi agar IFit dapat memantau jarak dan menampilkan posisi pada peta."
        );
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();

      if (!enabled) {
        Alert.alert(
          "GPS Tidak Aktif",
          "Aktifkan layanan lokasi/GPS pada HP lalu tekan Mulai lagi."
        );
        return;
      }

      setLocationStatus("Mencari lokasi...");

      const first = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const firstPoint = {
        latitude: first.coords.latitude,
        longitude: first.coords.longitude,
      };

      setCurrentLocation(firstPoint);
      setRoute([firstPoint]);
      lastLocation.current = firstPoint;

      const firstHeading = first.coords.heading;
      const initialHeading =
        typeof firstHeading === "number" && firstHeading >= 0
          ? firstHeading
          : 0;

      lastHeadingRef.current = initialHeading;
      setHeading(initialHeading);

      setDistance(0);
      setDuration(0);
      setActiveDuration(0);
      setCalories(0);
      movingSamplesRef.current = 0;
      isMovingRef.current = false;
      setIsTracking(true);
      setLocationStatus("GPS aktif • Menunggu gerakan");

      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );

          setDuration(elapsed);

          if (isMovingRef.current) {
            setActiveDuration((prev) => prev + 1);
          }
        }
      }, 1000);

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          const point = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };

          if (lastLocation.current) {
            const dist = getDistance(
              lastLocation.current.latitude,
              lastLocation.current.longitude,
              point.latitude,
              point.longitude
            );

            const speed = newLocation.coords.speed;
            const accuracy = newLocation.coords.accuracy;

            const hasGoodAccuracy = accuracy == null || accuracy <= 25;
            const movingBySpeed = speed !== null && speed >= 0.5;
            const movingByDistance =
              (speed === null || speed < 0) && dist >= 0.005;

            const rawMoving =
              hasGoodAccuracy && (movingBySpeed || movingByDistance);

            if (rawMoving) {
              movingSamplesRef.current = Math.min(
                movingSamplesRef.current + 1,
                3
              );
            } else {
              movingSamplesRef.current = 0;
            }

            // Butuh dua pembacaan GPS berturut-turut agar perpindahan kecil
            // akibat noise GPS saat diam tidak langsung dianggap gerakan.
            const isMoving = rawMoving && movingSamplesRef.current >= 2;

            isMovingRef.current = isMoving;
            setIsMoving(isMoving);

            if (isMoving) {
              const gpsHeading = newLocation.coords.heading;

              let nextHeading = lastHeadingRef.current;

              if (typeof gpsHeading === "number" && gpsHeading >= 0) {
                nextHeading = gpsHeading;
              } else if (dist >= 0.005) {
                nextHeading = getBearing(lastLocation.current, point);
              }

              lastHeadingRef.current = nextHeading;
              setHeading(nextHeading);
            }

            setLocationStatus(
              isMoving
                ? "GPS aktif • Sedang bergerak"
                : "GPS aktif • Menunggu gerakan"
            );

            // Abaikan lonjakan GPS yang tidak wajar.
            if (isMoving && dist <= 0.2) {
              setDistance((prev) => {
                const newDistance = prev + dist;
                const currentKm = Math.floor(newDistance);

                if (currentKm > lastSpokenKmRef.current && currentKm >= 1) {
                  lastSpokenKmRef.current = currentKm;
                  speakDistance(currentKm);
                }

                return newDistance;
              });

              setRoute((prev) => {
                // Hindari titik yang terlalu dekat agar garis tetap rapi.
                if (prev.length > 0) {
                  const lastPoint = prev[prev.length - 1];
                  const pointDistance = getDistance(
                    lastPoint.latitude,
                    lastPoint.longitude,
                    point.latitude,
                    point.longitude
                  );

                  if (pointDistance < 0.001) {
                    return prev;
                  }
                }

                return [...prev, point];
              });
            }
          } else {
            isMovingRef.current = false;
            movingSamplesRef.current = 0;
            setIsMoving(false);
            setLocationStatus("GPS aktif • Menunggu gerakan");
            setRoute([point]);
          }

          lastLocation.current = point;
          setCurrentLocation(point);
        }
      );

      setLocationSub(sub);
    } catch (error) {
      setIsTracking(false);
      setLocationStatus("Gagal mendapatkan lokasi");
      Alert.alert(
        "GPS Bermasalah",
        "Lokasi belum bisa didapatkan. Pastikan GPS aktif dan coba lagi."
      );
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    isMovingRef.current = false;
    movingSamplesRef.current = 0;
    setIsMoving(false);

    if (startTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

      setDuration(elapsed);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    startTimeRef.current = null;

    locationSub?.remove();
    setLocationSub(null);
    lastLocation.current = null;
    setLocationStatus("Pelacakan dihentikan");
  };

  const resetTracking = () => {
    stopTracking();
    startTimeRef.current = null;
    setDistance(0);
    lastSpokenKmRef.current = 0;
    lastHeadingRef.current = 0;
    setHeading(0);
    setDuration(0);
    setActiveDuration(0);
    setCalories(0);
    setRoute([]);
    setCurrentLocation(null);

    webViewRef.current?.injectJavaScript(`
      if (typeof resetMap === "function") {
        resetMap();
      }
      true;
    `);

    setLocationStatus("Lokasi belum aktif");
  };

  useEffect(() => {
    if (activeDuration > 0) {
      const userWeight = parseFloat(weight) > 0 ? parseFloat(weight) : 60;
      const hours = activeDuration / 3600;
      const met = MET_VALUES[activityType];
      setCalories(met * userWeight * hours);
    } else {
      setCalories(0);
    }
  }, [activeDuration, activityType, weight]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isMovingRef.current = false;
      movingSamplesRef.current = 0;
    };
  }, []);

  useEffect(() => {
    return () => {
      locationSub?.remove();
    };
  }, [locationSub]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const advice = getBmiAdvice();

  return (
    <SafeAreaProvider>
      <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* HEADER */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>IFit</Text>
          <Text style={[styles.headerSub, { color: theme.muted }]}>
            BMI & Pemantau Aktivitas
          </Text>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={openSidebar}>
          <MaterialCommunityIcons name="menu" size={28} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= BMI ================= */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
              <MaterialCommunityIcons
                name="human-male-height"
                size={27}
                color="#2563EB"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Kalkulator BMI
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                Cek indeks massa tubuh
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.genderBtn,
                { borderColor: theme.border, backgroundColor: theme.input },
                gender === "Pria" && styles.genderBtnActive,
              ]}
              onPress={() => setGender("Pria")}
            >
              <FontAwesome5
                name="male"
                size={20}
                color={gender === "Pria" ? "#fff" : theme.muted}
              />
              <Text
                style={[
                  styles.genderText,
                  { color: theme.muted },
                  gender === "Pria" && styles.genderTextActive,
                ]}
              >
                Pria
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderBtn,
                { borderColor: theme.border, backgroundColor: theme.input },
                gender === "Wanita" && styles.genderBtnActive,
              ]}
              onPress={() => setGender("Wanita")}
            >
              <FontAwesome5
                name="female"
                size={20}
                color={gender === "Wanita" ? "#fff" : theme.muted}
              />
              <Text
                style={[
                  styles.genderText,
                  { color: theme.muted },
                  gender === "Wanita" && styles.genderTextActive,
                ]}
              >
                Wanita
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>Usia</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.input,
                  },
                ]}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                placeholder="Tahun"
                placeholderTextColor={theme.muted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>Berat</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.input,
                  },
                ]}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
                placeholder="Kg"
                placeholderTextColor={theme.muted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>Tinggi</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.input,
                  },
                ]}
                keyboardType="decimal-pad"
                value={height}
                onChangeText={setHeight}
                placeholder="Cm"
                placeholderTextColor={theme.muted}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={calculateBMI}>
            <MaterialCommunityIcons
              name="calculator-variant"
              size={19}
              color="#fff"
            />
            <Text style={styles.primaryBtnText}>Hitung BMI</Text>
          </TouchableOpacity>

          {bmiResult && (
            <View style={[styles.resultBox, { backgroundColor: theme.result }]}>
              <Text style={[styles.resultSmall, { color: theme.muted }]}>
                HASIL BMI
              </Text>
              <Text style={[styles.resultBmiText, { color: theme.primary }]}>
                {bmiResult}
              </Text>
              <Text style={[styles.resultCategory, { color: theme.text }]}>
                {bmiCategory}
              </Text>
              <Text style={[styles.resultIdeal, { color: theme.muted }]}>
                Rentang referensi BMI dewasa: {idealWeight}
              </Text>

              {advice && (
                <View
                  style={[styles.adviceBox, { borderTopColor: theme.border }]}
                >
                  <View style={styles.adviceTitleRow}>
                    <MaterialCommunityIcons
                      name="lightbulb-on-outline"
                      size={20}
                      color="#F59E0B"
                    />
                    <Text style={[styles.adviceTitle, { color: theme.text }]}>
                      {advice.title}
                    </Text>
                  </View>

                  <Text style={[styles.adviceMessage, { color: theme.muted }]}>
                    {advice.message}
                  </Text>

                  <Text style={[styles.foodTitle, { color: theme.text }]}>
                    Makanan yang dapat dipilih
                  </Text>
                  <View style={styles.chipWrap}>
                    {advice.foods.map((food) => (
                      <View key={food} style={styles.chip}>
                        <Text style={styles.chipText}>{food}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.foodTitle, { color: theme.text }]}>
                    Pilihan minuman
                  </Text>
                  <View style={styles.chipWrap}>
                    {advice.drinks.map((drink) => (
                      <View key={drink} style={styles.chip}>
                        <Text style={styles.chipText}>{drink}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.disclaimer, { color: theme.muted }]}>
                    Catatan: pada usia di bawah 18 tahun, BMI tidak sebaiknya
                    ditafsirkan dengan kategori dewasa saja. Gunakan hasil ini
                    sebagai informasi awal, bukan diagnosis medis.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ================= TRACKER ================= */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
              <FontAwesome5 name="running" size={23} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Pemantau Jarak Tempuh
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                Pantau aktivitas secara langsung
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activityScroll}
          >
            {(Object.keys(MET_VALUES) as ActivityType[]).map((act) => (
              <TouchableOpacity
                key={act}
                style={[
                  styles.activityBtn,
                  { backgroundColor: theme.soft },
                  activityType === act && styles.activityBtnActive,
                ]}
                onPress={() => {
                  if (!isTracking) setActivityType(act);
                }}
                disabled={isTracking}
              >
                <Text
                  style={[
                    styles.activityText,
                    { color: theme.muted },
                    activityType === act && styles.activityTextActive,
                  ]}
                >
                  {act}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ================= STATUS GPS ================= */}
          <View
            style={[
              styles.trackingStatusBox,
              {
                backgroundColor: theme.soft,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isMoving ? "#22C55E" : isTracking ? "#F59E0B" : "#94A3B8",
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackingStatusTitle, { color: theme.text }]}>
                {isTracking
                  ? isMoving
                    ? "Sedang bergerak"
                    : "Tidak bergerak"
                  : "Pelacakan belum dimulai"}
              </Text>
              <Text style={[styles.trackingStatusText, { color: theme.muted }]}>
                {locationStatus}
              </Text>
            </View>
          </View>

          {/* ================= LIVE MAP ================= */}
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: LEAFLET_HTML, baseUrl: "https://example.com" }}
              style={styles.map}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              onMessage={(event) => {
                if (event.nativeEvent.data === "LEAFLET_READY") {
                  setLeafletReady(true);
                }
              }}
            />
          </View>

          <View
            style={[styles.statsContainer, { backgroundColor: theme.soft }]}
          >
            <View style={styles.statBox}>
              <FontAwesome5 name="route" size={19} color="#64748B" />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {distance.toFixed(2)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.muted }]}>KM</Text>
            </View>

            <View style={styles.statBox}>
              <FontAwesome5 name="stopwatch" size={19} color="#64748B" />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatTime(duration)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.muted }]}>
                WAKTU
              </Text>
            </View>

            <View style={styles.statBox}>
              <FontAwesome5 name="fire-alt" size={19} color="#EF4444" />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {calories.toFixed(0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.muted }]}>
                KCAL
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            {!isTracking ? (
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: "#10B981" }]}
                onPress={startTracking}
              >
                <FontAwesome5 name="play" size={14} color="#fff" />
                <Text style={styles.controlBtnText}>Mulai</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: "#EF4444" }]}
                onPress={stopTracking}
              >
                <FontAwesome5 name="stop" size={14} color="#fff" />
                <Text style={styles.controlBtnText}>Berhenti</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: "#64748B" }]}
              onPress={resetTracking}
            >
              <FontAwesome5 name="redo" size={14} color="#fff" />
              <Text style={styles.controlBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gpsInfo}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={18}
              color="#2563EB"
            />
            <Text style={[styles.gpsInfoText, { color: theme.muted }]}>
              GPS digunakan untuk menghitung jarak dan aktivitas. Peta OpenStreetMap
              menampilkan posisi berbentuk panah dan jalur biru sesuai pergerakan.
              Gunakan kontrol zoom atau cubit peta untuk memperbesar dan memperkecil.
            </Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: theme.muted }]}>
          IFit • BMI & Activity Tracker
        </Text>
      </ScrollView>

      {/* ================= SIDEBAR / DRAWER ================= */}
      <Modal
        visible={sidebarVisible}
        transparent
        animationType="none"
        onRequestClose={closeSidebar}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeSidebar}
          />

          <Animated.View
            style={[
              styles.drawer,
              {
                backgroundColor: theme.drawer,
                transform: [{ translateX: drawerAnim }],
              },
            ]}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.avatar}>
                <FontAwesome5 name="user" size={22} color="#fff" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerTitle, { color: theme.text }]}>
                  IFit
                </Text>
                <Text style={[styles.drawerSubtitle, { color: theme.muted }]}>
                  Profil & Pengaturan
                </Text>
              </View>

              <TouchableOpacity onPress={closeSidebar}>
                <MaterialCommunityIcons
                  name="close"
                  size={27}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Informasi Pribadi
              </Text>

              <Text style={[styles.drawerLabel, { color: theme.muted }]}>
                Nama
              </Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                style={[
                  styles.drawerInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.input,
                  },
                ]}
                placeholder="Nama kamu"
                placeholderTextColor={theme.muted}
              />

              <View style={styles.profileInfo}>
                <View>
                  <Text style={[styles.profileLabel, { color: theme.muted }]}>
                    Gender
                  </Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {gender}
                  </Text>
                </View>

                <View>
                  <Text style={[styles.profileLabel, { color: theme.muted }]}>
                    Usia
                  </Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {age ? `${age} tahun` : "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.profileInfo}>
                <View>
                  <Text style={[styles.profileLabel, { color: theme.muted }]}>
                    Berat
                  </Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {weight ? `${weight} kg` : "-"}
                  </Text>
                </View>

                <View>
                  <Text style={[styles.profileLabel, { color: theme.muted }]}>
                    Tinggi
                  </Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {height ? `${height} cm` : "-"}
                  </Text>
                </View>
              </View>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Tampilan
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons
                    name={isDark ? "weather-night" : "white-balance-sunny"}
                    size={20}
                    color="#2563EB"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Mode {isDark ? "Gelap" : "Terang"}
                  </Text>
                  <Text
                    style={[styles.settingDescription, { color: theme.muted }]}
                  >
                    Ubah tampilan aplikasi
                  </Text>
                </View>

                <Switch
                  value={isDark}
                  onValueChange={setIsDark}
                  trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                  thumbColor={isDark ? "#2563EB" : "#F8FAFC"}
                />
              </View>

              <View style={[styles.aboutBox, { backgroundColor: theme.soft }]}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={20}
                  color="#2563EB"
                />
                <Text style={[styles.aboutText, { color: theme.muted }]}>
                  IFit membantu menghitung BMI dan memantau aktivitas
                  menggunakan lokasi perangkat. Data profil pada tampilan ini
                  hanya digunakan selama aplikasi berjalan.
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  genderBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  genderText: {
    marginLeft: 8,
    fontWeight: "700",
  },
  genderTextActive: {
    color: "#fff",
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    marginBottom: 5,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontSize: 15,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  resultBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 13,
    alignItems: "center",
  },
  resultSmall: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  resultBmiText: {
    fontSize: 38,
    fontWeight: "900",
    marginTop: 2,
  },
  resultCategory: {
    fontSize: 19,
    fontWeight: "800",
  },
  resultIdeal: {
    fontSize: 12,
    marginTop: 7,
    textAlign: "center",
  },
  adviceBox: {
    width: "100%",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  adviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  adviceTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  adviceMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  foodTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 13,
    marginBottom: 7,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 12,
    textAlign: "center",
  },
  activityScroll: {
    marginBottom: 13,
  },
  activityBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },
  activityBtnActive: {
    backgroundColor: "#10B981",
  },
  activityText: {
    fontWeight: "700",
  },
  activityTextActive: {
    color: "#fff",
  },
  trackingStatusBox: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  trackingStatusTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  trackingStatusText: {
    fontSize: 10,
    marginTop: 2,
  },
  mapContainer: {
    height: 360,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 13,
    padding: 15,
    marginBottom: 15,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 7,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  controlBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    flexDirection: "row",
    gap: 7,
  },
  controlBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  gpsInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    paddingHorizontal: 3,
  },
  gpsInfoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 7,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 2,
  },
  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: Math.min(SCREEN_WIDTH * 0.86, 360),
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 45,
    paddingHorizontal: 20,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  drawerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  drawerLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 5,
  },
  drawerInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    marginBottom: 15,
  },
  profileInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  profileLabel: {
    fontSize: 10,
    marginBottom: 3,
  },
  profileValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  settingDescription: {
    fontSize: 11,
    marginTop: 2,
  },
  aboutBox: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  aboutText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
    marginLeft: 8,
  },
});

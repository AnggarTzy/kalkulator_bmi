import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type ActivityType = 'Joging' | 'Lari' | 'Bersepeda' | 'Berenang';

export default function App() {
  // ================= STATE BMI =================
  const [gender, setGender] = useState<'Pria' | 'Wanita'>('Pria');
  const [age, setAge] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');

  const [bmiResult, setBmiResult] = useState<string | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>('');
  const [idealWeight, setIdealWeight] = useState<string>('');

  // ================= STATE TRACKER =================
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [activityType, setActivityType] = useState<ActivityType>('Joging');
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [calories, setCalories] = useState<number>(0);

  const [locationSub, setLocationSub] = useState<Location.LocationSubscription | null>(null);
  const lastLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nilai MET (Metabolic Equivalent of Task)
  const MET_VALUES: Record<ActivityType, number> = {
    Joging: 7.0,
    Lari: 9.8,
    Bersepeda: 8.0,
    Berenang: 5.8,
  };

  // ================= FUNGSI BMI =================
  const calculateBMI = () => {
    if (!weight || !height || !age) {
      Alert.alert('Error', 'Harap isi usia, berat, dan tinggi badan!');
      return;
    }

    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;

    if (w <= 0 || h <= 0 || isNaN(w) || isNaN(h)) {
      Alert.alert('Error', 'Masukkan nilai yang valid!');
      return;
    }

    const bmi = w / (h * h);
    setBmiResult(bmi.toFixed(1));

    if (bmi < 18.5) setBmiCategory('Kurus (Underweight)');
    else if (bmi >= 18.5 && bmi <= 24.9) setBmiCategory('Normal');
    else if (bmi >= 25.0 && bmi <= 29.9) setBmiCategory('Gemuk (Overweight)');
    else setBmiCategory('Obesitas (Obese)');

    const minWeight = 18.5 * (h * h);
    const maxWeight = 24.9 * (h * h);
    setIdealWeight(`${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`);
  };

  // ================= FUNGSI TRACKER =================
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi butuh akses lokasi untuk fitur pemantauan.');
      return;
    }

    setIsTracking(true);

    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (newLocation) => {
        const { latitude, longitude } = newLocation.coords;

        if (lastLocation.current) {
          const dist = getDistance(
            lastLocation.current.latitude,
            lastLocation.current.longitude,
            latitude,
            longitude
          );
          setDistance((prev) => prev + dist);
        }
        lastLocation.current = { latitude, longitude };
      }
    );
    setLocationSub(sub);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationSub) locationSub.remove();
    setLocationSub(null);
    lastLocation.current = null;
  };

  const resetTracking = () => {
    stopTracking();
    setDistance(0);
    setDuration(0);
    setCalories(0);
  };

  useEffect(() => {
    if (duration > 0) {
      const userWeight = parseFloat(weight) > 0 ? parseFloat(weight) : 65;
      const hours = duration / 3600;
      const met = MET_VALUES[activityType];
      const cal = met * userWeight * hours;
      setCalories(cal);
    }
  }, [duration, activityType]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FitTrack Pro</Text>
        <Text style={styles.headerSub}>BMI & Pemantau Aktivitas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CARD BMI */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="human-male-height" size={28} color="#2563EB" />
            <Text style={styles.cardTitle}>Kalkulator BMI</Text>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'Pria' && styles.genderBtnActive]}
              onPress={() => setGender('Pria')}
            >
              <FontAwesome5 name="male" size={20} color={gender === 'Pria' ? '#fff' : '#64748b'} />
              <Text style={[styles.genderText, gender === 'Pria' && styles.genderTextActive]}>
                Pria
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'Wanita' && styles.genderBtnActive]}
              onPress={() => setGender('Wanita')}
            >
              <FontAwesome5 name="female" size={20} color={gender === 'Wanita' ? '#fff' : '#64748b'} />
              <Text style={[styles.genderText, gender === 'Wanita' && styles.genderTextActive]}>
                Wanita
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Usia (Thn)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                placeholder="0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Berat (Kg)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                placeholder="0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tinggi (Cm)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
                placeholder="0"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={calculateBMI}>
            <Text style={styles.primaryBtnText}>Hitung BMI</Text>
          </TouchableOpacity>

          {bmiResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultBmiText}>{bmiResult}</Text>
              <Text style={styles.resultCategory}>{bmiCategory}</Text>
              <Text style={styles.resultIdeal}>Target Ideal: {idealWeight}</Text>
            </View>
          )}
        </View>

        {/* CARD TRACKER */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="running" size={26} color="#10B981" />
            <Text style={styles.cardTitle}>Pemantau Jarak Tempuh</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
            {(Object.keys(MET_VALUES) as ActivityType[]).map((act) => (
              <TouchableOpacity
                key={act}
                style={[styles.activityBtn, activityType === act && styles.activityBtnActive]}
                onPress={() => {
                  if (!isTracking) setActivityType(act);
                }}
                disabled={isTracking}
              >
                <Text style={[styles.activityText, activityType === act && styles.activityTextActive]}>
                  {act}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <FontAwesome5 name="route" size={20} color="#64748b" />
              <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
              <Text style={styles.statLabel}>KM</Text>
            </View>
            <View style={styles.statBox}>
              <FontAwesome5 name="stopwatch" size={20} color="#64748b" />
              <Text style={styles.statValue}>{formatTime(duration)}</Text>
              <Text style={styles.statLabel}>WAKTU</Text>
            </View>
            <View style={styles.statBox}>
              <FontAwesome5 name="fire-alt" size={20} color="#EF4444" />
              <Text style={styles.statValue}>{calories.toFixed(0)}</Text>
              <Text style={styles.statLabel}>KCAL</Text>
            </View>
          </View>

          <View style={styles.row}>
            {!isTracking ? (
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: '#10B981' }]}
                onPress={startTracking}
              >
                <Text style={styles.controlBtnText}>Mulai</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: '#EF4444' }]}
                onPress={stopTracking}
              >
                <Text style={styles.controlBtnText}>Berhenti</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: '#64748b' }]}
              onPress={resetTracking}
            >
              <Text style={styles.controlBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 14,
    color: '#64748b',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  genderBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  genderText: {
    marginLeft: 8,
    color: '#64748b',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#fff',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultBox: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultBmiText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  resultCategory: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
  resultIdeal: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
  },
  activityScroll: {
    marginBottom: 16,
  },
  activityBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  activityBtnActive: {
    backgroundColor: '#10B981',
  },
  activityText: {
    color: '#64748b',
    fontWeight: '600',
  },
  activityTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  controlBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  controlBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
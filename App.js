import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, SafeAreaView, Platform } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database, firestore } from './firebaseConfig';
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function App() {
  const [sensorMessage, setSensorMessage] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [logs, setLogs] = useState([]);
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState(null);

  // Listen to Realtime Database for instant sensor updates
  useEffect(() => {
    const messageRef = ref(database, 'SensorStatus/message');
    const typeRef = ref(database, 'SensorStatus/sensorType');

    const unsubscribeMessage = onValue(messageRef, (snapshot) => {
      const val = snapshot.val() || '';
      setSensorMessage(val);

      // Update last data timestamp whenever we receive data
      setLastDataUpdate(Date.now());

      if (val && val !== 'Standby' && val !== 'Standby...') {
        triggerNotification(val);
      }
    });

    const unsubscribeType = onValue(typeRef, (snapshot) => {
      setSensorType(snapshot.val() || '');
      // Update last data timestamp
      setLastDataUpdate(Date.now());
    });

    return () => {
      unsubscribeMessage();
      unsubscribeType();
    };
  }, []);

  // Check device online status every 3 seconds
  useEffect(() => {
    const checkDeviceStatus = () => {
      if (!lastDataUpdate) {
        setIsDeviceOnline(false);
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastUpdate = (currentTime - lastDataUpdate) / 1000; // convert to seconds
      const threshold = 20; // 20 seconds

      if (timeSinceLastUpdate > threshold) {
        setIsDeviceOnline(false);
      } else {
        setIsDeviceOnline(true);
      }
    };

    // Check immediately
    checkDeviceStatus();

    // Then check every 3 seconds
    const interval = setInterval(checkDeviceStatus, 3000);
    return () => clearInterval(interval);
  }, [lastDataUpdate]);

  // Trigger push notification
  const triggerNotification = async (message) => {
    // Notifications are only available on native platforms (iOS/Android)
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rat Detected!',
        body: `${sensorType.toUpperCase()}: ${message}`,
      },
      trigger: null, // immediate
    });
  };

  // Fetch latest 10 logs from Firestore
  const fetchLogs = async () => {
    const q = query(
      collection(firestore, 'SensorLogs'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);  // ✅ Use getDocs instead
    const logData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setLogs(logData);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // refresh logs every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>IoT Dashboard</Text>

        {/* Device Status Card */}
        <View style={[styles.card, styles.statusCard]}>
          <Text style={styles.label}>Device Status:</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isDeviceOnline ? styles.onlineDot : styles.offlineDot]} />
            <Text style={[styles.statusText, isDeviceOnline ? styles.onlineText : styles.offlineText]}>
              {isDeviceOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          {lastDataUpdate && (
            <Text style={styles.lastSeenText}>
              Last update: {Math.floor((Date.now() - lastDataUpdate) / 1000)}s ago
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Realtime Sensor:</Text>
          <Text style={styles.value}>{sensorMessage || 'Waiting for data...'}</Text>
          {sensorType ? <Text style={styles.sensorType}>Type: {sensorType}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Latest Logs:</Text>
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.logItem}>
                <Text style={styles.logText}>
                  [{item.sensor.toUpperCase()}] {item.message}
                </Text>
                <Text style={styles.timestamp}>
                  {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : ''}
                </Text>
              </View>
            )}
          />
        </View>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    color: '#4ade80',
    fontWeight: '700',
  },
  sensorType: {
    fontSize: 14,
    color: '#facc15',
    marginTop: 4,
    fontWeight: '600',
  },
  logItem: {
    borderBottomColor: '#333',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  logText: {
    color: '#ffffff',
    fontSize: 14,
  },
  timestamp: {
    color: '#888',
    fontSize: 10,
  },
  statusCard: {
    borderLeftWidth: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  offlineDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
  },
  onlineText: {
    color: '#4ade80',
  },
  offlineText: {
    color: '#ef4444',
  },
  lastSeenText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
});
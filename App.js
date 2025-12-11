import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, SafeAreaView, Platform, Animated } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database, firestore } from './firebaseConfig';
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [sensorMessage, setSensorMessage] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [logs, setLogs] = useState([]);
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState(null);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'web') return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
      }
    };

    requestPermissions();
  }, []);

  // Pulse animation for alerts
  useEffect(() => {
    if (isAlertActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isAlertActive, pulseAnim]);

  // Listen to Realtime Database for instant sensor updates
  useEffect(() => {
    const messageRef = ref(database, 'SensorStatus/message');
    const typeRef = ref(database, 'SensorStatus/sensorType');

    const unsubscribeMessage = onValue(messageRef, (snapshot) => {
      const val = snapshot.val() || '';
      setSensorMessage(val);

      // Update last data timestamp whenever we receive data
      setLastDataUpdate(Date.now());

      // Check if alert is active
      const isAlert = val && val !== 'Standby' && val !== 'Standby...';
      setIsAlertActive(isAlert);

      if (isAlert) {
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

    const notificationTitle = sensorType === 'motion' ? '🚨 Motion Detected!' : '⚠️ Repellant Activated!';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle,
        body: message,
        sound: true,
      },
      trigger: null, // immediate
    });
  };

  // Get sensor icon
  const getSensorIcon = (sensor) => {
    if (sensor?.toLowerCase().includes('motion')) return '👁️';
    if (sensor?.toLowerCase().includes('repellant')) return '💨';
    return '📡';
  };

  // Get sensor color
  const getSensorColor = (sensor) => {
    if (sensor?.toLowerCase().includes('motion')) return '#ff6b6b';
    if (sensor?.toLowerCase().includes('repellant')) return '#ffa94d';
    return '#4ade80';
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
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🛡️ IoT Security Monitor</Text>
            <Text style={styles.subtitle}>Rat Detection System</Text>
          </View>

          {/* Device Status Card */}
          <View style={[styles.card, styles.statusCard, !isDeviceOnline && styles.offlineCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📡 Device Status</Text>
            </View>
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

          {/* Active Sensor Alert */}
          {isAlertActive ? (
            <Animated.View
              style={[
                styles.card,
                styles.alertCard,
                {
                  transform: [{ scale: pulseAnim }],
                  borderColor: getSensorColor(sensorType)
                }
              ]}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertIcon}>{getSensorIcon(sensorType)}</Text>
                <View style={styles.alertTextContainer}>
                  <Text style={styles.alertTitle}>ALERT ACTIVE</Text>
                  <Text style={styles.alertSensorType}>{sensorType?.toUpperCase() || 'SENSOR'}</Text>
                </View>
              </View>
              <Text style={styles.alertMessage}>{sensorMessage}</Text>
              <View style={styles.alertIndicator}>
                <View style={[styles.alertDot, { backgroundColor: getSensorColor(sensorType) }]} />
                <Text style={styles.alertStatus}>DETECTING...</Text>
              </View>
            </Animated.View>
          ) : (
            <View style={[styles.card, styles.standbyCard]}>
              <View style={styles.standbyHeader}>
                <Text style={styles.standbyIcon}>✅</Text>
                <Text style={styles.standbyTitle}>System Standby</Text>
              </View>
              <Text style={styles.standbyMessage}>All sensors are monitoring</Text>
              {sensorType && <Text style={styles.standbyDetail}>Active: {sensorType}</Text>}
            </View>
          )}

          {/* Sensor Types */}
          <View style={styles.sensorsContainer}>
            <View style={[styles.sensorCard, styles.motionSensorCard]}>
              <Text style={styles.sensorIcon}>👁️</Text>
              <Text style={styles.sensorName}>Motion Sensor</Text>
              <Text style={styles.sensorStatus}>
                {sensorType?.toLowerCase().includes('motion') && isAlertActive ? 'ACTIVE' : 'Ready'}
              </Text>
            </View>
            <View style={[styles.sensorCard, styles.repellantSensorCard]}>
              <Text style={styles.sensorIcon}>💨</Text>
              <Text style={styles.sensorName}>Repellant</Text>
              <Text style={styles.sensorStatus}>
                {sensorType?.toLowerCase().includes('repellant') && isAlertActive ? 'ACTIVE' : 'Ready'}
              </Text>
            </View>
          </View>

          {/* Activity Logs */}
          <View style={[styles.card, styles.logsCard]}>
            <Text style={styles.cardTitle}>📋 Activity History</Text>
            <FlatList
              data={logs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.logItem}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logIcon}>{getSensorIcon(item.sensor)}</Text>
                    <View style={styles.logContent}>
                      <View style={styles.logTopRow}>
                        <Text style={[styles.logSensor, { color: getSensorColor(item.sensor) }]}>
                          {item.sensor?.toUpperCase()}
                        </Text>
                        <Text style={styles.timestamp}>
                          {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleTimeString() : ''}
                        </Text>
                      </View>
                      <Text style={styles.logText}>{item.message}</Text>
                    </View>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#a78bfa',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(30, 30, 46, 0.9)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  statusCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#4ade80',
  },
  offlineCard: {
    borderLeftColor: '#ef4444',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  onlineDot: {
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  offlineDot: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusText: {
    fontSize: 22,
    fontWeight: '800',
  },
  onlineText: {
    color: '#4ade80',
  },
  offlineText: {
    color: '#ef4444',
  },
  lastSeenText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  // Alert Card Styles
  alertCard: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 3,
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.6,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fee2e2',
    letterSpacing: 1,
  },
  alertSensorType: {
    fontSize: 14,
    color: '#fca5a5',
    fontWeight: '600',
    marginTop: 2,
  },
  alertMessage: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
    paddingLeft: 4,
  },
  alertIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  alertStatus: {
    fontSize: 12,
    color: '#fca5a5',
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Standby Card Styles
  standbyCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  standbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  standbyIcon: {
    fontSize: 32,
    marginRight: 10,
  },
  standbyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4ade80',
  },
  standbyMessage: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 4,
  },
  standbyDetail: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Sensor Cards Container
  sensorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sensorCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 46, 0.9)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  motionSensorCard: {
    borderColor: 'rgba(255, 107, 107, 0.5)',
  },
  repellantSensorCard: {
    borderColor: 'rgba(255, 169, 77, 0.5)',
  },
  sensorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  sensorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  sensorStatus: {
    fontSize: 10,
    color: '#a78bfa',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Logs Card Styles
  logsCard: {
    flex: 1,
    maxHeight: 300,
  },
  logItem: {
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  logContent: {
    flex: 1,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logSensor: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 10,
  },
});
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { ref, onValue, set } from 'firebase/database';
import { database } from './firebaseConfig';
import { useState, useEffect } from 'react';

export default function App() {
  const [data, setData] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    // Listen to changes in the 'test/message' path
    const dataRef = ref(database, 'test/message');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      setData(val || 'No data yet');
    });

    return () => unsubscribe();
  }, []);

  const writeData = () => {
    if (input.trim().length > 0) {
      set(ref(database, 'test/message'), input);
      setInput('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <Text style={styles.title}>IoT Dashboard</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Realtime Data:</Text>
          <Text style={styles.value}>{data}</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Send command..."
            placeholderTextColor="#888"
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.button} onPress={writeData}>
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Deep dark background
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 48,
    textAlign: 'center',
    letterSpacing: -1,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    color: '#4ade80', // Vibrant green
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 18,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#6366f1', // Indigo accent
    paddingHorizontal: 28,
    justifyContent: 'center',
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

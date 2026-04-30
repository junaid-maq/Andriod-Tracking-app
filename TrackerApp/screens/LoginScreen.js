import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // check if user profile exists, if not create it
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        await set(userRef, {
          email: user.email,
          isAdmin: false,
          ghostMode: false,
          createdAt: Date.now()
        });
      }

      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tracker App</Text>
      <Text style={styles.subtitle}>Family Location Tracker</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 40 },
  input: { width: '100%', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { width: '100%', backgroundColor: '#4f46e5', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
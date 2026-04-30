import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Share, ScrollView } from 'react-native';
import { ref, set, get, onValue } from 'firebase/database';
import { auth, db } from '../firebaseConfig';

export default function ConnectScreen() {
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const user = auth.currentUser;
    const userRef = ref(db, `users/${user.uid}/connections`);

    onValue(userRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const connectionIds = Object.keys(data);
      const connectionDetails = [];

      for (const connId of connectionIds) {
        const connRef = ref(db, `connections/${connId}`);
        const connSnap = await get(connRef);
        if (connSnap.exists()) {
          const conn = connSnap.val();
          const memberUids = Object.keys(conn.members).filter(
            uid => uid !== user.uid
          );

          const memberEmails = [];
          for (const uid of memberUids) {
            const memberRef = ref(db, `users/${uid}/email`);
            const memberSnap = await get(memberRef);
            if (memberSnap.exists()) {
              memberEmails.push(memberSnap.val());
            }
          }

          connectionDetails.push({
            id: connId,
            members: memberEmails
          });
        }
      }

      setConnections(connectionDetails);
    });
  };

  const generateOtp = async () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const user = auth.currentUser;

    await set(ref(db, `invites/${otp}`), {
      createdBy: user.uid,
      createdByEmail: user.email,
      status: 'pending',
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    setGeneratedOtp(otp);
  };

  const shareOtp = () => {
    Share.share({
      message: `Join me on Tracker App! Use this code: ${generatedOtp} (valid for 10 minutes)`
    });
  };

  const joinWithOtp = async () => {
    if (!otpInput || otpInput.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6 digit code');
      return;
    }
    setLoading(true);
    try {
      const inviteRef = ref(db, `invites/${otpInput}`);
      const snapshot = await get(inviteRef);

      if (!snapshot.exists()) {
        Alert.alert('Invalid Code', 'This code does not exist');
        return;
      }

      const invite = snapshot.val();

      if (invite.status !== 'pending') {
        Alert.alert('Code Used', 'This code has already been used');
        return;
      }

      if (Date.now() > invite.expiresAt) {
        Alert.alert('Expired', 'This code has expired');
        return;
      }

      if (invite.createdBy === auth.currentUser.uid) {
        Alert.alert('Error', 'You cannot connect with yourself');
        return;
      }

      await set(ref(db, `invites/${otpInput}`), {
        ...invite,
        status: 'requested',
        requestedBy: auth.currentUser.uid,
        requestedByEmail: auth.currentUser.email
      });

      Alert.alert('Request Sent!', `Connection request sent. Waiting for approval.`);
      setOtpInput('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Connect</Text>

      {/* Generate OTP */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Invite someone</Text>
        <Text style={styles.cardSub}>Generate a code and share it with them</Text>
        {generatedOtp ? (
          <View style={styles.otpBox}>
            <Text style={styles.otpText}>{generatedOtp}</Text>
            <Text style={styles.otpExpiry}>Expires in 10 minutes</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={shareOtp}>
              <Text style={styles.shareBtnText}>Share Code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGeneratedOtp(null)} style={{ marginTop: 8 }}>
              <Text style={{ color: '#888', fontSize: 12 }}>Generate new code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={generateOtp}>
            <Text style={styles.buttonText}>Generate Invite Code</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Join with OTP */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Join a connection</Text>
        <Text style={styles.cardSub}>Enter the code someone shared with you</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 6 digit code"
          value={otpInput}
          onChangeText={setOtpInput}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity style={styles.button} onPress={joinWithOtp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Connecting...' : 'Connect'}</Text>
        </TouchableOpacity>
      </View>

      {/* Your Connections */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Connections</Text>
        <Text style={styles.cardSub}>{connections.length} connection{connections.length !== 1 ? 's' : ''}</Text>
        {connections.length === 0 ? (
          <Text style={styles.emptyText}>No connections yet — invite someone!</Text>
        ) : (
          connections.map((conn) => (
            <View key={conn.id} style={styles.connRow}>
              <View style={styles.connDot} />
              <Text style={styles.connText}>
                Connected with{' '}
                <Text style={styles.connNames}>
                  {conn.members.join(', ')}
                </Text>
              </Text>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#888', marginBottom: 16 },
  input: { backgroundColor: '#f5f5f5', padding: 14, borderRadius: 10, fontSize: 20, textAlign: 'center', letterSpacing: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  otpBox: { alignItems: 'center', padding: 16, backgroundColor: '#f0f0ff', borderRadius: 10 },
  otpText: { fontSize: 36, fontWeight: 'bold', color: '#4f46e5', letterSpacing: 8 },
  otpExpiry: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 12 },
  shareBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  shareBtnText: { color: '#fff', fontWeight: 'bold' },
  connRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  connDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5', marginRight: 10 },
  connText: { fontSize: 13, color: '#555', flex: 1 },
  connNames: { fontWeight: '700', color: '#1a1a2e' },
  emptyText: { color: '#aaa', fontSize: 13, textAlign: 'center', paddingVertical: 8 }
});
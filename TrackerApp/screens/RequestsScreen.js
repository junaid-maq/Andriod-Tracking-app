import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ref, onValue, set, push } from 'firebase/database';
import { auth, db } from '../firebaseConfig';

export default function RequestsScreen() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const invitesRef = ref(db, 'invites');
    onValue(invitesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const myRequests = Object.entries(data)
          .filter(([otp, invite]) =>
            invite.createdBy === auth.currentUser?.uid &&
            invite.status === 'requested'
          )
          .map(([otp, invite]) => ({ otp, ...invite }));
        setRequests(myRequests);
      }
    });
  }, []);

  const handleApprove = async (request) => {
    const user = auth.currentUser;
    const connectionId = push(ref(db, 'connections')).key;

    // create connection between both users
    await set(ref(db, `connections/${connectionId}`), {
      members: {
        [user.uid]: true,
        [request.requestedBy]: true
      },
      createdBy: user.uid,
      createdAt: Date.now()
    });

    // add connection to both users profiles
    await set(ref(db, `users/${user.uid}/connections/${connectionId}`), true);
    await set(ref(db, `users/${request.requestedBy}/connections/${connectionId}`), true);

    // mark invite as accepted
    await set(ref(db, `invites/${request.otp}/status`), 'accepted');

    Alert.alert('Connected!', `You are now connected with ${request.requestedByEmail}`);
  };

  const handleDeny = async (request) => {
    await set(ref(db, `invites/${request.otp}/status`), 'denied');
    Alert.alert('Denied', 'Connection request denied');
  };

  const renderRequest = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.requestedByEmail?.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.email}>{item.requestedByEmail}</Text>
        <Text style={styles.sub}>wants to connect with you</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
          <Text style={styles.btnText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.denyBtn} onPress={() => handleDeny(item)}>
          <Text style={styles.btnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Requests</Text>
      {requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.otp}
          renderItem={renderRequest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1 },
  email: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  sub: { fontSize: 12, color: '#888', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  denyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15 }
});
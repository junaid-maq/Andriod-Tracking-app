import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { ref, onValue, set, get } from 'firebase/database';
import { auth, db } from '../firebaseConfig';

export default function AdminScreen() {
  const [ghostMode, setGhostMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    loadUserData();
    loadConnections();
  }, []);

  const loadUserData = async () => {
  const user = auth.currentUser;
  const userRef = ref(db, `users/${user.uid}`);
  onValue(userRef, async (snapshot) => {
    const data = snapshot.val();
    if (data) {
      setGhostMode(data.ghostMode || false);
      setIsAdmin(data.isAdmin || false);

      // fix: sync location visibility with ghostMode on load
      if (!data.ghostMode) {
        await set(ref(db, `locations/${user.uid}/isVisible`), true);
      }
    }
  });
};

  const loadConnections = async () => {
    const user = auth.currentUser;
    const userConnRef = ref(db, `users/${user.uid}/connections`);

    onValue(userConnRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const connectionIds = Object.keys(data);
      const details = [];

      for (const connId of connectionIds) {
        const connSnap = await get(ref(db, `connections/${connId}`));
        if (connSnap.exists()) {
          const conn = connSnap.val();
          const memberUids = Object.keys(conn.members).filter(
            uid => uid !== user.uid
          );

          const memberEmails = [];
          for (const uid of memberUids) {
            const memberSnap = await get(ref(db, `users/${uid}/email`));
            if (memberSnap.exists()) {
              memberEmails.push({ uid, email: memberSnap.val() });
            }
          }

          details.push({ id: connId, members: memberEmails });
        }
      }

      setConnections(details);
    });
  };

  const toggleGhostMode = async (value) => {
    const user = auth.currentUser;
    setGhostMode(value);

    // update ghost mode in user profile
    await set(ref(db, `users/${user.uid}/ghostMode`), value);

    // update visibility in locations
    await set(ref(db, `locations/${user.uid}/isVisible`), !value);

    Alert.alert(
      value ? 'Ghost Mode On' : 'Ghost Mode Off',
      value ? 'You are now hidden from everyone' : 'You are now visible to your connections'
    );
  };

  const removeConnection = async (connId, memberEmail) => {
    Alert.alert(
      'Remove Connection',
      `Are you sure you want to remove ${memberEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            const connSnap = await get(ref(db, `connections/${connId}/members`));
            if (connSnap.exists()) {
              const members = connSnap.val();
              const otherUid = Object.keys(members).find(uid => uid !== user.uid);

              // remove connection from both users
              await set(ref(db, `users/${user.uid}/connections/${connId}`), null);
              await set(ref(db, `users/${otherUid}/connections/${connId}`), null);
              await set(ref(db, `connections/${connId}`), null);

              Alert.alert('Removed', 'Connection removed successfully');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>

      {/* Ghost Mode */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.cardTitle}>Ghost Mode</Text>
            <Text style={styles.cardSub}>
              {ghostMode ? 'You are hidden from everyone' : 'You are visible to your connections'}
            </Text>
          </View>
          <Switch
            value={ghostMode}
            onValueChange={toggleGhostMode}
            trackColor={{ false: '#ddd', true: '#4f46e5' }}
            thumbColor={ghostMode ? '#fff' : '#fff'}
          />
        </View>
      </View>

      {/* My Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Account</Text>
        <Text style={styles.cardSub}>{auth.currentUser?.email}</Text>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>

      {/* Connections list with remove option */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Connections</Text>
        <Text style={styles.cardSub}>{connections.length} connection{connections.length !== 1 ? 's' : ''}</Text>
        {connections.length === 0 ? (
          <Text style={styles.emptyText}>No connections yet</Text>
        ) : (
          connections.map((conn) => (
            <View key={conn.id}>
              {conn.members.map((member) => (
                <View key={member.uid} style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.email?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeConnection(conn.id, member.email)}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </View>

      {/* Sign out */}
      <TouchableOpacity
  style={styles.signOutBtn}
  onPress={async () => {
    const user = auth.currentUser;
    await set(ref(db, `locations/${user.uid}/isVisible`), true);
    await set(ref(db, `users/${user.uid}/ghostMode`), false);
    auth.signOut();
  }}
>

        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#888' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminBadge: { marginTop: 8, backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  adminBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  memberEmail: { flex: 1, fontSize: 13, color: '#1a1a2e' },
  removeBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  removeBtnText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: '#aaa', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  signOutBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  signOutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 }
});
import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ref, set, get, onValue } from 'firebase/database';
import { auth, db } from '../firebaseConfig';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [members, setMembers] = useState({});

  useEffect(() => {
    startBackgroundTracking();
    startTracking();
    listenToConnectedMembers();
  }, []);

  const startBackgroundTracking = async () => {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    const { status: background } = await Location.requestBackgroundPermissionsAsync();

    if (foreground !== 'granted' || background !== 'granted') {
      Alert.alert('Permission denied', 'Both location permissions are required');
      return;
    }

    await Location.startLocationUpdatesAsync('background-location-task', {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 10000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Tracker App',
        notificationBody: 'Sharing your location with family',
        notificationColor: '#4f46e5'
      }
    });
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    const { latitude, longitude } = current.coords;
    setLocation({ latitude, longitude });

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 5 },
      async (loc) => {
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });

        const user = auth.currentUser;
        if (user) {
          const userSnap = await get(ref(db, `users/${user.uid}/ghostMode`));
          const isGhost = userSnap.exists() ? userSnap.val() : false;

          set(ref(db, `locations/${user.uid}`), {
            latitude,
            longitude,
            email: user.email,
            timestamp: Date.now(),
            isVisible: !isGhost
          });
        }
      }
    );
  };

  const listenToConnectedMembers = async () => {
  const user = auth.currentUser;
  if (!user) return;

  // always include yourself
  const connectedUids = new Set();
  connectedUids.add(user.uid);

  // get connections if any exist
  const userConnRef = ref(db, `users/${user.uid}/connections`);
  const userConnSnap = await get(userConnRef);
  
  if (userConnSnap.exists()) {
    const connectionIds = Object.keys(userConnSnap.val());
    for (const connId of connectionIds) {
      const connSnap = await get(ref(db, `connections/${connId}/members`));
      if (connSnap.exists()) {
        Object.keys(connSnap.val()).forEach(uid => connectedUids.add(uid));
      }
    }
  }

  // listen to locations
  const locationsRef = ref(db, 'locations');
  onValue(locationsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const filtered = {};
    Object.entries(data).forEach(([uid, info]) => {
      if (connectedUids.has(uid) && info.isVisible !== false) {
        filtered[uid] = info;
      }
    });

    setMembers(filtered);
  });
};

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={false}
        region={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        } : {
          latitude: 31.5204,
          longitude: 74.3587,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {Object.entries(members).map(([uid, data]) => (
          <Marker
            key={uid}
            coordinate={{ latitude: data.latitude, longitude: data.longitude }}
            title={data.email}
            pinColor={uid === auth.currentUser?.uid ? 'blue' : 'red'}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' }
});
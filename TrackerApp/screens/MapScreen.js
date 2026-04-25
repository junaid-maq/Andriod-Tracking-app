import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ref, set, onValue } from 'firebase/database';
import { auth, db } from '../firebaseConfig';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [members, setMembers] = useState({});

  useEffect(() => {
    startTracking();
    listenToMembers();
  }, []);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required');
      return;
    }
    
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
const { latitude, longitude } = current.coords;
setLocation({ latitude, longitude });

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });

        const user = auth.currentUser;
        if (user) {
          set(ref(db, `locations/${user.uid}`), {
            latitude,
            longitude,
            email: user.email,
            timestamp: Date.now()
          });
        }
      }
    );
  };

  const listenToMembers = () => {
    const locationsRef = ref(db, 'locations');
    onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setMembers(data);
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
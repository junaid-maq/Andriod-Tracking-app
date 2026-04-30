import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { ref, set, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import LoginScreen from './screens/LoginScreen';
import MapScreen from './screens/MapScreen';
import MembersScreen from './screens/MembersScreen';
import AdminScreen from './screens/AdminScreen';
import ConnectScreen from './screens/ConnectScreen';
import RequestsScreen from './screens/RequestsScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    const loc = locations[0];
    const user = auth.currentUser;
    if (user && loc) {
      get(ref(db, `users/${user.uid}/ghostMode`)).then((snapshot) => {
        const isGhost = snapshot.exists() ? snapshot.val() : false;
        set(ref(db, `locations/${user.uid}`), {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          email: user.email,
          timestamp: Date.now(),
          isVisible: !isGhost
        });
      });
    }
  }
});

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Members" component={MembersScreen} />
      <Tab.Screen name="Connect" component={ConnectScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Admin" component={AdminScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) return null; // loading

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
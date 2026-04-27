import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { ref, set } from 'firebase/database';
import { auth, db } from './firebaseConfig';
import LoginScreen from './screens/LoginScreen';
import MapScreen from './screens/MapScreen';
import MembersScreen from './screens/MembersScreen';
import AdminScreen from './screens/AdminScreen';

const Stack = createNativeStackNavigator();
const LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    const loc = locations[0];
    const user = auth.currentUser;
    if (user && loc) {
      set(ref(db, `locations/${user.uid}`), {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        email: user.email,
        timestamp: Date.now()
      });
    }
  }
});

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Members" component={MembersScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
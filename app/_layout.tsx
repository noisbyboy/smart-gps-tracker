import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: '#f8f9fa',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
          color: '#343a40',
        },
        headerShadowVisible: true,
        headerTintColor: '#007AFF',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          title: "TrackAI",
          headerBackVisible: false,
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: '#343a40',
          },
          headerShadowVisible: true,
        }} 
      />
      <Stack.Screen 
        name="stats" 
        options={{
          title: "Statistics Overview",
          headerBackVisible: true,
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: '#343a40',
          },
          headerShadowVisible: true,
          headerTintColor: '#007AFF',
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{
          title: "📍 GPS History",
          headerBackVisible: true,
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: '#343a40',
          },
          headerShadowVisible: true,
          headerTintColor: '#007AFF',
        }} 
      />
      <Stack.Screen 
        name="history_new" 
        options={{
          title: "📍 GPS History",
          headerBackVisible: true,
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{
          headerShown: false,
          headerBackVisible: false,
        }} 
      />
    </Stack>
  );
}

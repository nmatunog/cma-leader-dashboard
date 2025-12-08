import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Mobile-optimized view coming soon</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#D31145',
            tabBarInactiveTintColor: '#6B7280',
            tabBarStyle: { paddingBottom: 6, height: 60 },
            tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          }}
        >
          <Tab.Screen name="Overview">
            {() => <PlaceholderScreen title="Overview" />}
          </Tab.Screen>
          <Tab.Screen name="Advisor Sim">
            {() => <PlaceholderScreen title="Advisor Simulation" />}
          </Tab.Screen>
          <Tab.Screen name="Leader HQ">
            {() => <PlaceholderScreen title="Leader HQ" />}
          </Tab.Screen>
          <Tab.Screen name="Path to Premier">
            {() => <PlaceholderScreen title="Path to Premier" />}
          </Tab.Screen>
          <Tab.Screen name="Goals">
            {() => <PlaceholderScreen title="Goal Setting" />}
          </Tab.Screen>
          <Tab.Screen name="Reports">
            {() => <PlaceholderScreen title="Reports (Admin)" />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
  },
});


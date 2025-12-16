import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PathToPremierScreen } from './src/screens/PathToPremierScreen';
import { LoginScreen } from './src/screens/LoginScreen';

const Tab = createBottomTabNavigator();

interface UserData {
  role: 'advisor' | 'leader' | 'admin';
  name: string;
  um: string;
  agency: string;
}

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Mobile-optimized view coming soon</Text>
    </View>
  );
}

function MainApp({ userData }: { userData: UserData }) {
  return (
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
        {userData.role !== 'advisor' && (
          <Tab.Screen name="Advisor Sim">
            {() => <PlaceholderScreen title="Advisor Simulation" />}
          </Tab.Screen>
        )}
        {userData.role === 'leader' && (
          <Tab.Screen name="Leader HQ">
            {() => <PlaceholderScreen title="Leader HQ" />}
          </Tab.Screen>
        )}
        {userData.role === 'leader' && (
          <Tab.Screen name="Path to Premier">
            {() => <PathToPremierScreen />}
          </Tab.Screen>
        )}
        <Tab.Screen name="Goals">
          {() => <PlaceholderScreen title="Goal Setting" />}
        </Tab.Screen>
        {userData.role === 'admin' && (
          <Tab.Screen name="Reports">
            {() => <PlaceholderScreen title="Reports (Admin)" />}
          </Tab.Screen>
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved user data
    AsyncStorage.getItem('userData')
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setUserData(parsed);
          } catch (e) {
            // Invalid data, clear it
            AsyncStorage.removeItem('userData');
          }
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const handleLogin = (role: 'advisor' | 'leader' | 'admin', name: string, um: string, agency: string) => {
    const newUserData: UserData = { role, name, um, agency };
    setUserData(newUserData);
    AsyncStorage.setItem('userData', JSON.stringify(newUserData));
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {userData ? (
        <MainApp userData={userData} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});


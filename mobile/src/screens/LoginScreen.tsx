import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginScreenProps {
  onLogin: (role: 'advisor' | 'leader' | 'admin', name: string, um: string, agency: string) => void;
}

const AGENCIES = [
  'Cebu Matunog Agency',
  'Cebu Ez Matunog Premier Agency',
];

const ADMIN_USERNAME = process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD || '1CMA2026Admin!';

const toTitleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const verifyAdminCredentials = (username: string, password: string): boolean => {
  return username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState('');
  const [um, setUM] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleLogin = async (role: 'advisor' | 'leader') => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!selectedAgency) {
      Alert.alert('Error', 'Please select an agency');
      return;
    }

    const userData = {
      role,
      name: toTitleCase(name),
      um: um || 'Cebu Matunog Agency',
      agency: selectedAgency,
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    onLogin(role, userData.name, userData.um, userData.agency);
  };

  const handleAdminLogin = async () => {
    if (!adminUsername.trim() || !adminPassword.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    if (verifyAdminCredentials(adminUsername.trim(), adminPassword)) {
      const userData = {
        role: 'admin' as const,
        name: 'Admin',
        um: 'System',
        agency: 'All Agencies',
      };

      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setAdminPassword(''); // Clear password for security
      onLogin('admin', 'Admin', 'System', 'All Agencies');
    } else {
      Alert.alert('Error', 'Invalid admin credentials');
      setAdminPassword(''); // Clear password on failed attempt
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚀</Text>
          </View>
          <Text style={styles.title}>1CMA 2026</Text>
          <Text style={styles.subtitle}>Strategic Planning & Goal Setting</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Juan Dela Cruz"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Unit Manager</Text>
              <TextInput
                style={styles.input}
                value={um}
                onChangeText={setUM}
                placeholder="e.g. Maria Clara"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Agency Name</Text>
              <View style={styles.selectContainer}>
                {AGENCIES.map((agency) => (
                  <TouchableOpacity
                    key={agency}
                    style={[
                      styles.selectOption,
                      selectedAgency === agency && styles.selectOptionActive,
                    ]}
                    onPress={() => setSelectedAgency(agency)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        selectedAgency === agency && styles.selectOptionTextActive,
                      ]}
                    >
                      {agency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>Select Your Role</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => handleLogin('advisor')}
              >
                <Text style={styles.roleIcon}>🛡️</Text>
                <Text style={styles.roleTitle}>Advisor</Text>
                <Text style={styles.roleSubtitle}>Agent View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => handleLogin('leader')}
              >
                <Text style={styles.roleIcon}>👑</Text>
                <Text style={styles.roleTitle}>Leader</Text>
                <Text style={styles.roleSubtitle}>Manager View</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.adminToggle}
              onPress={() => setShowAdminLogin(!showAdminLogin)}
            >
              <Text style={styles.adminToggleText}>
                🔐 {showAdminLogin ? 'Hide' : 'Show'} Admin Login
              </Text>
            </TouchableOpacity>

            {showAdminLogin && (
              <View style={styles.adminSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Admin Username</Text>
                  <TextInput
                    style={styles.input}
                    value={adminUsername}
                    onChangeText={setAdminUsername}
                    placeholder="Enter admin username"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Admin Password</Text>
                  <TextInput
                    style={styles.input}
                    value={adminPassword}
                    onChangeText={setAdminPassword}
                    placeholder="Enter admin password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                  />
                </View>
                <TouchableOpacity
                  style={styles.adminButton}
                  onPress={handleAdminLogin}
                >
                  <Text style={styles.adminButtonText}>🔐 Login as Admin</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#D31145',
    padding: 16,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 'auto',
    marginBottom: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D31145',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D31145',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  selectOptionActive: {
    borderColor: '#D31145',
    backgroundColor: '#FEF2F2',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#64748B',
  },
  selectOptionTextActive: {
    color: '#D31145',
    fontWeight: '600',
  },
  roleSection: {
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
    paddingTop: 20,
    marginTop: 8,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  roleSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  adminToggle: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  adminToggleText: {
    fontSize: 12,
    color: '#64748B',
  },
  adminSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  adminButton: {
    backgroundColor: '#D31145',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});


import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function ProtectedHomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sesion iniciada</Text>
      <Text style={styles.subtitle}>Usuario: {user?.email}</Text>
      <Text style={styles.description}>
        Esta es una pantalla protegida de prueba. Si cierras sesion vuelves a Login.
      </Text>

      <Pressable onPress={logout} style={styles.button}>
        <Text style={styles.buttonText}>Cerrar sesion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#020617',
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
  },
  description: {
    color: '#94a3b8',
  },
  button: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#f43f5e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff1f2',
    fontWeight: '700',
  },
});

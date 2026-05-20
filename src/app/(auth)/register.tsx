import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(email, password);
      if (!result.ok) {
        Alert.alert('Error', result.message ?? 'No se pudo completar el registro.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Registro de prueba para autenticar en local</Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#6b7280"
        style={styles.input}
        value={email}
      />

      <TextInput
        onChangeText={setPassword}
        placeholder="Contrasena (min. 6)"
        placeholderTextColor="#6b7280"
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <Pressable onPress={onSubmit} style={styles.button}>
        <Text style={styles.buttonText}>{isLoading ? 'Creando...' : 'Registrarme'}</Text>
      </Pressable>

      <Text style={styles.helperText}>
        Ya tienes cuenta?{' '}
        <Link href="/(auth)/login" style={styles.link}>
          Inicia sesion
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: '#0f172a',
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    backgroundColor: '#111827',
  },
  button: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#082f49',
    fontWeight: '700',
  },
  helperText: {
    color: '#cbd5e1',
    marginTop: 8,
  },
  link: {
    color: '#22c55e',
    fontWeight: '700',
  },
});

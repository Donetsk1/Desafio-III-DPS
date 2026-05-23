import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useTheme } from '@/hooks/use-theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(theme, isDark);
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

const createStyles = (
  theme: { text: string; background: string; backgroundElement: string; textSecondary: string },
  isDark: boolean,
) =>
  StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: theme.background,
  },
  title: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    backgroundColor: theme.backgroundElement,
  },
  button: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: isDark ? '#38bdf8' : '#0ea5e9',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: isDark ? '#082f49' : '#f0f9ff',
    fontWeight: '700',
  },
  helperText: {
    color: theme.textSecondary,
    marginTop: 8,
  },
  link: {
    color: isDark ? '#22c55e' : '#16a34a',
    fontWeight: '700',
  },
});

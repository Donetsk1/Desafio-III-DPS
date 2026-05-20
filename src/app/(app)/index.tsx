import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';

type TransactionType = 'ingreso' | 'gasto';
type PeriodFilter = 'all' | '7d' | '30d' | 'month';

type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  account: string;
  date: string;
  description: string;
};

type TransactionForm = {
  amount: string;
  type: TransactionType;
  category: string;
  account: string;
  date: string;
  description: string;
};

const EMPTY_FORM: TransactionForm = {
  amount: '',
  type: 'gasto',
  category: '',
  account: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
};

function normalizeLabel(value: string) {
  return value.trim();
}

function getStorageKey(email?: string) {
  return `demo_transactions_${(email ?? '').toLowerCase()}`;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeTransaction(raw: Partial<Transaction>, index: number): Transaction {
  const parsedAmount = Number(raw.amount);
  const safeType: TransactionType = raw.type === 'ingreso' ? 'ingreso' : 'gasto';
  const safeDate = typeof raw.date === 'string' && parseDate(raw.date) ? raw.date : new Date().toISOString().slice(0, 10);

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `legacy-${index}`,
    amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
    type: safeType,
    category: typeof raw.category === 'string' ? raw.category : 'Sin categoria',
    account: typeof raw.account === 'string' ? raw.account : 'Sin cuenta',
    date: safeDate,
    description: typeof raw.description === 'string' ? raw.description : '',
  };
}

export default function ProtectedHomeScreen() {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState<TransactionForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.email) {
        setTransactions([]);
        return;
      }

      const raw = await AsyncStorage.getItem(getStorageKey(user.email));
      if (!raw) {
        setTransactions([]);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<Transaction>[];
        if (!Array.isArray(parsed)) {
          setTransactions([]);
          return;
        }

        const sanitized = parsed.map((item, index) => sanitizeTransaction(item, index));
        setTransactions(sanitized);
      } catch {
        setTransactions([]);
      }
    };

    loadTransactions();
  }, [user?.email]);

  const persistTransactions = async (nextTransactions: Transaction[]) => {
    if (!user?.email) {
      return;
    }

    await AsyncStorage.setItem(getStorageKey(user.email), JSON.stringify(nextTransactions));
    setTransactions(nextTransactions);
  };

  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map((item) => item.category))).filter(Boolean);
  }, [transactions]);

  const accounts = useMemo(() => {
    return Array.from(new Set(transactions.map((item) => item.account))).filter(Boolean);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    return transactions
      .filter((item) => {
        if (filterCategory !== 'all' && item.category !== filterCategory) {
          return false;
        }

        if (filterAccount !== 'all' && item.account !== filterAccount) {
          return false;
        }

        if (filterPeriod === 'all') {
          return true;
        }

        const itemDate = parseDate(item.date);
        if (!itemDate) {
          return false;
        }

        const delta = nowTime - itemDate.getTime();
        const days = delta / (1000 * 60 * 60 * 24);

        if (filterPeriod === '7d') {
          return days <= 7;
        }

        if (filterPeriod === '30d') {
          return days <= 30;
        }

        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      })
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [filterAccount, filterCategory, filterPeriod, transactions]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowDatePicker(false);
  };

  const currentFormDate = parseDate(form.date) ?? new Date();

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      setForm((prev) => ({ ...prev, date: toISODate(selectedDate) }));
    }

    setShowDatePicker(false);
  };

  const validateForm = () => {
    const amount = Number(form.amount);
    const category = normalizeLabel(form.category);
    const account = normalizeLabel(form.account);
    const description = normalizeLabel(form.description);
    const date = normalizeLabel(form.date);

    if (!amount || amount <= 0) {
      return { ok: false, message: 'El monto debe ser mayor a 0.' };
    }

    if (!category || !account || !date) {
      return { ok: false, message: 'Categoria, cuenta y fecha son obligatorias.' };
    }

    if (!parseDate(date)) {
      return { ok: false, message: 'Fecha invalida. Usa formato YYYY-MM-DD.' };
    }

    return {
      ok: true,
      payload: {
        amount,
        category,
        account,
        description,
        date,
      },
    };
  };

  const onSaveTransaction = async () => {
    const validation = validateForm();
    if (!validation.ok) {
      Alert.alert('Error', validation.message);
      return;
    }

    const payload = validation.payload;
    const base: Transaction = {
      id: editingId ?? `${Date.now()}`,
      amount: payload.amount,
      type: form.type,
      category: payload.category,
      account: payload.account,
      date: payload.date,
      description: payload.description,
    };

    const nextTransactions = editingId
      ? transactions.map((item) => (item.id === editingId ? base : item))
      : [base, ...transactions];

    await persistTransactions(nextTransactions);
    resetForm();
  };

  const onEditTransaction = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      account: transaction.account,
      date: transaction.date,
      description: transaction.description,
    });
  };

  const onDeleteTransaction = (transaction: Transaction) => {
    Alert.alert('Eliminar transaccion', 'Esta accion no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const nextTransactions = transactions.filter((item) => item.id !== transaction.id);
          await persistTransactions(nextTransactions);
          if (editingId === transaction.id) {
            resetForm();
          }
        },
      },
    ]);
  };

  const totalIngresos = useMemo(
    () =>
      filteredTransactions
        .filter((item) => item.type === 'ingreso')
        .reduce((acc, item) => acc + (Number.isFinite(item.amount) ? item.amount : 0), 0),
    [filteredTransactions],
  );

  const totalGastos = useMemo(
    () =>
      filteredTransactions
        .filter((item) => item.type === 'gasto')
        .reduce((acc, item) => acc + (Number.isFinite(item.amount) ? item.amount : 0), 0),
    [filteredTransactions],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Transacciones</Text>
      <Text style={styles.subtitle}>Usuario: {user?.email}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{editingId ? 'Editar transaccion' : 'Nueva transaccion'}</Text>

        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setForm((prev) => ({ ...prev, type: 'ingreso' }))}
            style={[styles.typeButton, form.type === 'ingreso' && styles.typeButtonActivePositive]}>
            <Text style={styles.typeButtonText}>Ingreso</Text>
          </Pressable>
          <Pressable
            onPress={() => setForm((prev) => ({ ...prev, type: 'gasto' }))}
            style={[styles.typeButton, form.type === 'gasto' && styles.typeButtonActiveNegative]}>
            <Text style={styles.typeButtonText}>Gasto</Text>
          </Pressable>
        </View>

        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) => setForm((prev) => ({ ...prev, amount: value }))}
          placeholder="Monto"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={form.amount}
        />
        <TextInput
          onChangeText={(value) => setForm((prev) => ({ ...prev, category: value }))}
          placeholder="Categoria"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={form.category}
        />
        <TextInput
          onChangeText={(value) => setForm((prev) => ({ ...prev, account: value }))}
          placeholder="Cuenta"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={form.account}
        />
        <Pressable onPress={() => setShowDatePicker(true)} style={styles.input}>
          <Text style={styles.dateValue}>{form.date}</Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={currentFormDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date(2100, 11, 31)}
            minimumDate={new Date(2000, 0, 1)}
          />
        ) : null}
        <TextInput
          onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
          placeholder="Descripcion"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={form.description}
        />

        <View style={styles.actionRow}>
          <Pressable onPress={onSaveTransaction} style={[styles.button, styles.buttonPrimary]}>
            <Text style={styles.buttonText}>{editingId ? 'Guardar cambios' : 'Agregar'}</Text>
          </Pressable>
          {editingId ? (
            <Pressable onPress={resetForm} style={[styles.button, styles.buttonSecondary]}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filtros</Text>

        <Text style={styles.filterLabel}>Periodo</Text>
        <View style={styles.chipRow}>
          {(['all', '7d', '30d', 'month'] as PeriodFilter[]).map((period) => (
            <Pressable
              key={period}
              onPress={() => setFilterPeriod(period)}
              style={[styles.chip, filterPeriod === period && styles.chipActive]}>
              <Text style={styles.chipText}>
                {period === 'all'
                  ? 'Todo'
                  : period === '7d'
                    ? '7 dias'
                    : period === '30d'
                      ? '30 dias'
                      : 'Mes actual'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.filterLabel}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setFilterCategory('all')}
              style={[styles.chip, filterCategory === 'all' && styles.chipActive]}>
              <Text style={styles.chipText}>Todas</Text>
            </Pressable>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilterCategory(item)}
                style={[styles.chip, filterCategory === item && styles.chipActive]}>
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.filterLabel}>Cuenta</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setFilterAccount('all')}
              style={[styles.chip, filterAccount === 'all' && styles.chipActive]}>
              <Text style={styles.chipText}>Todas</Text>
            </Pressable>
            {accounts.map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilterAccount(item)}
                style={[styles.chip, filterAccount === item && styles.chipActive]}>
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen filtrado</Text>
        <Text style={styles.summaryPositive}>Ingresos: ${totalIngresos.toFixed(2)}</Text>
        <Text style={styles.summaryNegative}>Gastos: ${totalGastos.toFixed(2)}</Text>
        <Text style={styles.summaryBalance}>Balance: ${(totalIngresos - totalGastos).toFixed(2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lista de transacciones</Text>
        {filteredTransactions.length === 0 ? (
          <Text style={styles.emptyText}>No hay transacciones para los filtros seleccionados.</Text>
        ) : (
          filteredTransactions.map((item) => (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionTitle}>{item.category}</Text>
                <Text style={item.type === 'ingreso' ? styles.amountPositive : styles.amountNegative}>
                  {item.type === 'ingreso' ? '+' : '-'}${(Number.isFinite(item.amount) ? item.amount : 0).toFixed(2)}
                </Text>
              </View>

              <Text style={styles.transactionMeta}>Cuenta: {item.account}</Text>
              <Text style={styles.transactionMeta}>Fecha: {item.date}</Text>
              <Text style={styles.transactionMeta}>Descripcion: {item.description || 'Sin descripcion'}</Text>

              <View style={styles.actionRow}>
                <Pressable onPress={() => onEditTransaction(item)} style={[styles.button, styles.buttonSecondary]}>
                  <Text style={styles.buttonText}>Editar</Text>
                </Pressable>
                <Pressable onPress={() => onDeleteTransaction(item)} style={[styles.button, styles.buttonDanger]}>
                  <Text style={styles.buttonText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <Pressable onPress={logout} style={[styles.button, styles.logoutButton]}>
        <Text style={styles.buttonText}>Cerrar sesion</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 18,
    gap: 12,
    paddingBottom: 30,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    backgroundColor: '#111827',
  },
  dateValue: {
    color: '#f8fafc',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#1f2937',
  },
  typeButtonActivePositive: {
    backgroundColor: '#15803d',
  },
  typeButtonActiveNegative: {
    backgroundColor: '#be123c',
  },
  typeButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  filterLabel: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1f2937',
  },
  chipActive: {
    backgroundColor: '#0ea5e9',
  },
  chipText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  summaryPositive: {
    color: '#4ade80',
    fontWeight: '700',
  },
  summaryNegative: {
    color: '#fb7185',
    fontWeight: '700',
  },
  summaryBalance: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  transactionCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    padding: 10,
    gap: 6,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  transactionMeta: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  amountPositive: {
    color: '#4ade80',
    fontWeight: '800',
  },
  amountNegative: {
    color: '#fb7185',
    fontWeight: '800',
  },
  emptyText: {
    color: '#94a3b8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  buttonPrimary: {
    backgroundColor: '#0ea5e9',
  },
  buttonSecondary: {
    backgroundColor: '#475569',
  },
  buttonDanger: {
    backgroundColor: '#e11d48',
  },
  logoutButton: {
    marginTop: 2,
    backgroundColor: '#f43f5e',
  },
  buttonText: {
    color: '#fff1f2',
    fontWeight: '700',
  },
});

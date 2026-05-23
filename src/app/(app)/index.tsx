import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useTheme } from "@/hooks/use-theme";

type TransactionType = "ingreso" | "gasto";
type PeriodFilter = "all" | "7d" | "30d" | "month";

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

type AccountSummary = {
  name: string;
  balance: number;
};

type BudgetStatus = "normal" | "warning" | "critical";

type BudgetSummary = {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
};

type BudgetLimits = Record<string, number>;

type CategoryBreakdown = {
  category: string;
  spent: number;
  percentage: number;
};

type ScreenPalette = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  mutedText: string;
  inputBg: string;
  inputBorder: string;
  chipBg: string;
  chipActive: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonDanger: string;
  logoutButton: string;
  buttonText: string;
  positive: string;
  negative: string;
  balance: string;
  chartTrack: string;
  modalBackdrop: string;
};

const EMPTY_FORM: TransactionForm = {
  amount: "",
  type: "gasto",
  category: "",
  account: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
};

// Categorías fijas, las mismas del presupuesto
const FIXED_CATEGORIES = ["Comida", "Transporte", "Entretenimiento"];

const DEFAULT_BUDGET_LIMITS: BudgetLimits = {
  Comida: 500,
  Transporte: 300,
  Entretenimiento: 200,
};

const CATEGORY_CHART_COLORS: Record<string, string> = {
  Comida: "#22c55e",
  Transporte: "#f59e0b",
  Entretenimiento: "#38bdf8",
};

function getAccountsStorageKey(email?: string) {
  return `demo_accounts_${(email ?? "").toLowerCase()}`;
}

function getBudgetsStorageKey(email?: string) {
  return `demo_budgets_${(email ?? "").toLowerCase()}`;
}

function getCategoriesStorageKey(email?: string) {
  return `demo_categories_${(email ?? "").toLowerCase()}`;
}

function normalizeLabel(value: string) {
  return value.trim();
}

function getStorageKey(email?: string) {
  return `demo_transactions_${(email ?? "").toLowerCase()}`;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameMonth(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

function createBudgetDrafts(limits: BudgetLimits) {
  return Object.fromEntries(
    FIXED_CATEGORIES.map((category) => [
      category,
      String(limits[category] ?? 0),
    ]),
  ) as Record<string, string>;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeTransaction(
  raw: Partial<Transaction>,
  index: number,
): Transaction {
  const parsedAmount = Number(raw.amount);
  const safeType: TransactionType =
    raw.type === "ingreso" ? "ingreso" : "gasto";
  const safeDate =
    typeof raw.date === "string" && parseDate(raw.date)
      ? raw.date
      : new Date().toISOString().slice(0, 10);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `legacy-${index}`,
    amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
    type: safeType,
    category: typeof raw.category === "string" ? raw.category : "Sin categoria",
    account: typeof raw.account === "string" ? raw.account : "Sin cuenta",
    date: safeDate,
    description: typeof raw.description === "string" ? raw.description : "",
  };
}

export default function ProtectedHomeScreen() {
  const { user, logout } = useAuth();
  const { colorScheme, toggleColorScheme } = useAppTheme();
  const theme = useTheme();
  const isDark = colorScheme === "dark";
  const palette = useMemo<ScreenPalette>(
    () =>
      isDark
        ? {
            screenBg: "#020617",
            cardBg: "#0f172a",
            cardBorder: "#1e293b",
            textPrimary: theme.text,
            textSecondary: "#cbd5e1",
            mutedText: "#94a3b8",
            inputBg: "#111827",
            inputBorder: "#334155",
            chipBg: "#1f2937",
            chipActive: "#0ea5e9",
            buttonPrimary: "#0ea5e9",
            buttonSecondary: "#475569",
            buttonDanger: "#e11d48",
            logoutButton: "#f43f5e",
            buttonText: "#fff1f2",
            positive: "#4ade80",
            negative: "#fb7185",
            balance: "#e2e8f0",
            chartTrack: "#1e293b",
            modalBackdrop: "rgba(2, 6, 23, 0.72)",
          }
        : {
            screenBg: "#f8fafc",
            cardBg: "#ffffff",
            cardBorder: "#dbe4ef",
            textPrimary: theme.text,
            textSecondary: "#334155",
            mutedText: "#64748b",
            inputBg: "#f8fafc",
            inputBorder: "#cbd5e1",
            chipBg: "#e2e8f0",
            chipActive: "#0284c7",
            buttonPrimary: "#0284c7",
            buttonSecondary: "#64748b",
            buttonDanger: "#e11d48",
            logoutButton: "#e11d48",
            buttonText: "#f8fafc",
            positive: "#15803d",
            negative: "#be123c",
            balance: "#1e293b",
            chartTrack: "#e2e8f0",
            modalBackdrop: "rgba(15, 23, 42, 0.35)",
          },
    [isDark, theme.text],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);
  const placeholderTextColor = isDark ? "#6b7280" : "#64748b";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimits>(DEFAULT_BUDGET_LIMITS);
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>(
    createBudgetDrafts(DEFAULT_BUDGET_LIMITS),
  );
  const [form, setForm] = useState<TransactionForm>(EMPTY_FORM);
  const [accountName, setAccountName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);

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

        const sanitized = parsed.map((item, index) =>
          sanitizeTransaction(item, index),
        );
        setTransactions(sanitized);
      } catch {
        setTransactions([]);
      }
    };

    loadTransactions();
  }, [user?.email]);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!user?.email) {
        setAccounts([]);
        return;
      }

      const raw = await AsyncStorage.getItem(getAccountsStorageKey(user.email));
      if (!raw) {
        setAccounts([]);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
          setAccounts([]);
          return;
        }

        const sanitized = Array.from(
          new Set(
            parsed
              .map((item) => (typeof item === "string" ? normalizeLabel(item) : ""))
              .filter(Boolean),
          ),
        );
        setAccounts(sanitized);
      } catch {
        setAccounts([]);
      }
    };

    loadAccounts();
  }, [user?.email]);

  useEffect(() => {
    const loadBudgets = async () => {
      if (!user?.email) {
        setBudgetLimits(DEFAULT_BUDGET_LIMITS);
        setBudgetDrafts(createBudgetDrafts(DEFAULT_BUDGET_LIMITS));
        return;
      }

      const raw = await AsyncStorage.getItem(getBudgetsStorageKey(user.email));
      if (!raw) {
        setBudgetLimits(DEFAULT_BUDGET_LIMITS);
        setBudgetDrafts(createBudgetDrafts(DEFAULT_BUDGET_LIMITS));
        return;
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setBudgetLimits(DEFAULT_BUDGET_LIMITS);
          setBudgetDrafts(createBudgetDrafts(DEFAULT_BUDGET_LIMITS));
          return;
        }

        const normalized: BudgetLimits = { ...DEFAULT_BUDGET_LIMITS };
        for (const category of FIXED_CATEGORIES) {
          const value = Number((parsed as Record<string, unknown>)[category]);
          normalized[category] = Number.isFinite(value) && value >= 0 ? value : 0;
        }

        setBudgetLimits(normalized);
        setBudgetDrafts(createBudgetDrafts(normalized));
      } catch {
        setBudgetLimits(DEFAULT_BUDGET_LIMITS);
        setBudgetDrafts(createBudgetDrafts(DEFAULT_BUDGET_LIMITS));
      }
    };

    loadBudgets();
  }, [user?.email]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!user?.email) {
        setCategories([]);
        return;
      }

      const raw = await AsyncStorage.getItem(getCategoriesStorageKey(user.email));
      if (!raw) {
        setCategories([]);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
          setCategories([]);
          return;
        }

        const sanitized = Array.from(
          new Set(
            parsed
              .map((item) => (typeof item === "string" ? normalizeLabel(item) : ""))
              .filter(Boolean),
          ),
        );

        setCategories(sanitized);
      } catch {
        setCategories([]);
      }
    };

    loadCategories();
  }, [user?.email]);

  const persistTransactions = async (nextTransactions: Transaction[]) => {
    if (!user?.email) {
      return;
    }

    await AsyncStorage.setItem(
      getStorageKey(user.email),
      JSON.stringify(nextTransactions),
    );
    setTransactions(nextTransactions);
  };

  const persistAccounts = async (nextAccounts: string[]) => {
    if (!user?.email) {
      return;
    }

    await AsyncStorage.setItem(
      getAccountsStorageKey(user.email),
      JSON.stringify(nextAccounts),
    );
    setAccounts(nextAccounts);
  };

  const persistBudgets = async (nextBudgetLimits: BudgetLimits) => {
    if (!user?.email) {
      return;
    }

    await AsyncStorage.setItem(
      getBudgetsStorageKey(user.email),
      JSON.stringify(nextBudgetLimits),
    );
    setBudgetLimits(nextBudgetLimits);
    setBudgetDrafts(createBudgetDrafts(nextBudgetLimits));
  };

  const persistCategories = async (nextCategories: string[]) => {
    if (!user?.email) {
      return;
    }

    await AsyncStorage.setItem(
      getCategoriesStorageKey(user.email),
      JSON.stringify(nextCategories),
    );
    setCategories(nextCategories);
  };

  const availableAccounts = useMemo(() => {
    return Array.from(
      new Set([...accounts, ...transactions.map((item) => item.account)]),
    ).filter(Boolean);
  }, [accounts, transactions]);

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set([...FIXED_CATEGORIES, ...categories, ...transactions.map((item) => item.category)]),
    ).filter(Boolean);
  }, [categories, transactions]);

  const accountSummaries: AccountSummary[] = useMemo(() => {
    return availableAccounts.map((name) => ({
      name,
      balance: transactions.reduce((accumulator, item) => {
        if (item.account !== name) {
          return accumulator;
        }

        return accumulator + (item.type === "ingreso" ? item.amount : -item.amount);
      }, 0),
    }));
  }, [availableAccounts, transactions]);

  const monthlyTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((item) => {
      const itemDate = parseDate(item.date);
      return itemDate ? isSameMonth(itemDate, now) : false;
    });
  }, [transactions]);

  const monthlyIncome = useMemo(
    () =>
      monthlyTransactions
        .filter((item) => item.type === "ingreso")
        .reduce((accumulator, item) => accumulator + item.amount, 0),
    [monthlyTransactions],
  );

  const monthlyExpenses = useMemo(
    () =>
      monthlyTransactions
        .filter((item) => item.type === "gasto")
        .reduce((accumulator, item) => accumulator + item.amount, 0),
    [monthlyTransactions],
  );

  const monthlyNetBalance = monthlyIncome - monthlyExpenses;

  const categoryExpenseBreakdown: CategoryBreakdown[] = useMemo(() => {
    return availableCategories.map((category) => {
      const spent = monthlyTransactions
        .filter((item) => item.type === "gasto" && item.category === category)
        .reduce((accumulator, item) => accumulator + item.amount, 0);

      return {
        category,
        spent,
        percentage: monthlyExpenses > 0 ? (spent / monthlyExpenses) * 100 : 0,
      };
    });
  }, [availableCategories, monthlyExpenses, monthlyTransactions]);

  const maxCategorySpent = useMemo(() => {
    return Math.max(
      1,
      ...categoryExpenseBreakdown.map((item) => item.spent),
    );
  }, [categoryExpenseBreakdown]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    return transactions
      .filter((item) => {
        if (filterCategory !== "all" && item.category !== filterCategory) {
          return false;
        }

        if (filterAccount !== "all" && item.account !== filterAccount) {
          return false;
        }

        if (filterPeriod === "all") {
          return true;
        }

        const itemDate = parseDate(item.date);
        if (!itemDate) {
          return false;
        }

        const delta = nowTime - itemDate.getTime();
        const days = delta / (1000 * 60 * 60 * 24);

        if (filterPeriod === "7d") {
          return days <= 7;
        }

        if (filterPeriod === "30d") {
          return days <= 30;
        }

        return (
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear()
        );
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [filterAccount, filterCategory, filterPeriod, transactions]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowDatePicker(false);
  };

  const resetAccountDraft = () => {
    setAccountName("");
  };

  const resetCategoryDraft = () => {
    setCategoryName("");
  };

  const handleBudgetDraftChange = (category: string, value: string) => {
    setBudgetDrafts((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSaveBudgets = async () => {
    const nextBudgetLimits: BudgetLimits = {};

    for (const category of FIXED_CATEGORIES) {
      const rawValue = Number(budgetDrafts[category]);
      if (!Number.isFinite(rawValue) || rawValue < 0) {
        Alert.alert(
          "Error",
          `El presupuesto de ${category} debe ser un número válido y no negativo.`,
        );
        return;
      }

      nextBudgetLimits[category] = rawValue;
    }

    await persistBudgets(nextBudgetLimits);
    Alert.alert(
      "Presupuestos guardados",
      "Los límites mensuales se actualizaron correctamente.",
    );
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormModalVisible(true);
  };

  const closeFormModal = () => {
    setIsFormModalVisible(false);
    resetForm();
  };

  const handleCreateAccount = async () => {
    const nextAccount = normalizeLabel(accountName);

    if (!nextAccount) {
      Alert.alert("Error", "Escribe un nombre para la cuenta.");
      return;
    }

    if (availableAccounts.some((item) => item.toLowerCase() === nextAccount.toLowerCase())) {
      Alert.alert("Error", "Esa cuenta ya existe.");
      return;
    }

    await persistAccounts([...availableAccounts, nextAccount]);
    setForm((prev) => ({ ...prev, account: nextAccount }));
    resetAccountDraft();
  };

  const handleCreateCategory = async () => {
    const nextCategory = normalizeLabel(categoryName);

    if (!nextCategory) {
      Alert.alert("Error", "Escribe un nombre para la categoría.");
      return;
    }

    if (availableCategories.some((item) => item.toLowerCase() === nextCategory.toLowerCase())) {
      Alert.alert("Error", "Esa categoría ya existe.");
      return;
    }

    await persistCategories([...categories, nextCategory]);
    setForm((prev) => ({ ...prev, category: nextCategory }));
    resetCategoryDraft();
  };

  const currentFormDate = parseDate(form.date) ?? new Date();

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
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
      return { ok: false, message: "El monto debe ser mayor a 0." };
    }

    if (!category || !account || !date) {
      return {
        ok: false,
        message: "Categoria, cuenta y fecha son obligatorias.",
      };
    }

    if (!parseDate(date)) {
      return { ok: false, message: "Fecha invalida. Usa formato YYYY-MM-DD." };
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

  const validateAccountNumber = (account: string): boolean => {
    return account.length > 0;
  };

  const onSaveTransaction = async () => {
    const validation = validateForm();
    if (!validation.ok || !validation.payload) {
      Alert.alert("Error", validation.message);
      return;
    }

    const payload = validation.payload;

    if (!validateAccountNumber(payload.account)) {
      Alert.alert("Error", "Debes seleccionar o crear una cuenta.");
      return;
    }

    const base: Transaction = {
      id: editingId ?? `${Date.now()}`,
      amount: payload.amount,
      type: form.type,
      category: payload.category,
      account: payload.account,
      date: payload.date,
      description: payload.description,
    };

    const normalizedAccount = normalizeLabel(payload.account);
    if (!availableAccounts.some((item) => item.toLowerCase() === normalizedAccount.toLowerCase())) {
      await persistAccounts([...availableAccounts, normalizedAccount]);
    }

    const normalizedCategory = normalizeLabel(payload.category);
    if (!availableCategories.some((item) => item.toLowerCase() === normalizedCategory.toLowerCase())) {
      await persistCategories([...categories, normalizedCategory]);
    }

    const nextTransactions = editingId
      ? transactions.map((item) => (item.id === editingId ? base : item))
      : [base, ...transactions];

    await persistTransactions(nextTransactions);

    if (form.type === "gasto") {
      const referenceDate = parseDate(payload.date) ?? new Date();
      const nextBudgetUsage = calculateMonthlyBudgetUsage(
        payload.category,
        referenceDate,
        editingId,
        nextTransactions,
      );

      if (nextBudgetUsage.status === "critical") {
        Alert.alert(
          "Presupuesto excedido",
          `${payload.category} superó el 100% de su presupuesto mensual.`,
        );
      } else if (nextBudgetUsage.status === "warning") {
        Alert.alert(
          "Alerta de presupuesto",
          `${payload.category} superó el 80% de su presupuesto mensual.`,
        );
      }
    }

    closeFormModal();
  };

  const onEditTransaction = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setShowDatePicker(false);
    setIsFormModalVisible(true);
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
    Alert.alert("Eliminar transaccion", "Esta accion no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const nextTransactions = transactions.filter(
            (item) => item.id !== transaction.id,
          );
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
        .filter((item) => item.type === "ingreso")
        .reduce(
          (acc, item) => acc + (Number.isFinite(item.amount) ? item.amount : 0),
          0,
        ),
    [filteredTransactions],
  );

  const totalGastos = useMemo(
    () =>
      filteredTransactions
        .filter((item) => item.type === "gasto")
        .reduce(
          (acc, item) => acc + (Number.isFinite(item.amount) ? item.amount : 0),
          0,
        ),
    [filteredTransactions],
  );

  const calculateMonthlyBudgetUsage = (
    category: string,
    referenceDate: Date,
    excludedTransactionId?: string | null,
    sourceTransactions: Transaction[] = transactions,
  ) => {
    const budgetAmount = budgetLimits[category] ?? 0;
    const spent = sourceTransactions
      .filter((item) => {
        if (item.category !== category || item.type !== "gasto") {
          return false;
        }

        if (item.id === excludedTransactionId) {
          return false;
        }

        const itemDate = parseDate(item.date);
        return itemDate ? isSameMonth(itemDate, referenceDate) : false;
      })
      .reduce((accumulator, item) => accumulator + item.amount, 0);

    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : spent > 0 ? 100 : 0;

    return {
      spent,
      remaining: budgetAmount - spent,
      limit: budgetAmount,
      percentage,
      status:
        percentage >= 100
          ? "critical"
          : percentage >= 80
            ? "warning"
            : "normal",
    } as BudgetSummary;
  };

  const budgetSummaries = useMemo(() => {
    const now = new Date();

    return FIXED_CATEGORIES.map((category) =>
      calculateMonthlyBudgetUsage(category, now),
    );
  }, [budgetLimits, transactions]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Transacciones</Text>
      <Text style={styles.subtitle}>Usuario: {user?.email}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard y estadísticas</Text>
        <Text style={styles.sectionHint}>Resumen del mes actual.</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Ingresos</Text>
            <Text style={styles.summaryPositive}>${monthlyIncome.toFixed(2)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Gastos</Text>
            <Text style={styles.summaryNegative}>${monthlyExpenses.toFixed(2)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Saldo neto</Text>
            <Text
              style={
                monthlyNetBalance >= 0 ? styles.summaryPositive : styles.summaryNegative
              }
            >
              ${monthlyNetBalance.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.filterLabel}>Desglose de gastos por categoría</Text>
        {categoryExpenseBreakdown.map((item) => (
          <View key={item.category} style={styles.chartRow}>
            <View style={styles.chartRowHeader}>
              <Text style={styles.budgetCategory}>{item.category}</Text>
              <Text style={styles.chartLabel}>{item.percentage.toFixed(1)}%</Text>
            </View>
            <View style={styles.chartTrack}>
              <View
                style={[
                  styles.chartBar,
                  {
                    width: `${(item.spent / maxCategorySpent) * 100}%`,
                    backgroundColor: CATEGORY_CHART_COLORS[item.category] ?? "#38bdf8",
                  },
                ]}
              />
            </View>
            <Text style={styles.chartAmount}>${item.spent.toFixed(2)}</Text>
          </View>
        ))}

        <Text style={styles.filterLabel}>Saldo actual por cuenta</Text>
        {accountSummaries.length === 0 ? (
          <Text style={styles.emptyText}>No hay cuentas registradas.</Text>
        ) : (
          accountSummaries.map((account) => (
            <View key={`dash-${account.name}`} style={styles.accountCard}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text
                style={
                  account.balance >= 0 ? styles.summaryPositive : styles.summaryNegative
                }
              >
                ${account.balance.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuentas</Text>
        <TextInput
          onChangeText={setAccountName}
          placeholder="Nombre de la cuenta (Efectivo, Tarjeta, Banco)"
          placeholderTextColor={placeholderTextColor}
          style={styles.input}
          value={accountName}
        />
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleCreateAccount}
            style={[styles.button, styles.buttonPrimary]}
          >
            <Text style={styles.buttonText}>Crear cuenta</Text>
          </Pressable>
          <Pressable
            onPress={resetAccountDraft}
            style={[styles.button, styles.buttonSecondary]}
          >
            <Text style={styles.buttonText}>Limpiar</Text>
          </Pressable>
        </View>

        {accountSummaries.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no has creado cuentas.
          </Text>
        ) : (
          accountSummaries.map((account) => (
            <View key={account.name} style={styles.accountCard}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text
                style={account.balance >= 0 ? styles.amountPositive : styles.amountNegative}
              >
                Saldo: ${account.balance.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Pressable onPress={openCreateModal} style={[styles.button, styles.buttonPrimary]}>
          <Text style={styles.buttonText}>Nueva transaccion</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filtros</Text>

        <Text style={styles.filterLabel}>Periodo</Text>
        <View style={styles.chipRow}>
          {(["all", "7d", "30d", "month"] as PeriodFilter[]).map((period) => (
            <Pressable
              key={period}
              onPress={() => setFilterPeriod(period)}
              style={[
                styles.chip,
                filterPeriod === period && styles.chipActive,
              ]}
            >
              <Text style={styles.chipText}>
                {period === "all"
                  ? "Todo"
                  : period === "7d"
                    ? "7 dias"
                    : period === "30d"
                      ? "30 dias"
                      : "Mes actual"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.filterLabel}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setFilterCategory("all")}
              style={[
                styles.chip,
                filterCategory === "all" && styles.chipActive,
              ]}
            >
              <Text style={styles.chipText}>Todas</Text>
            </Pressable>
            {availableCategories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilterCategory(item)}
                style={[
                  styles.chip,
                  filterCategory === item && styles.chipActive,
                ]}
              >
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.filterLabel}>Cuenta</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setFilterAccount("all")}
              style={[
                styles.chip,
                filterAccount === "all" && styles.chipActive,
              ]}
            >
              <Text style={styles.chipText}>Todas</Text>
            </Pressable>
            {availableAccounts.map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilterAccount(item)}
                style={[
                  styles.chip,
                  filterAccount === item && styles.chipActive,
                ]}
              >
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen filtrado</Text>
        <Text style={styles.summaryPositive}>
          Ingresos: ${totalIngresos.toFixed(2)}
        </Text>
        <Text style={styles.summaryNegative}>
          Gastos: ${totalGastos.toFixed(2)}
        </Text>
        <Text style={styles.summaryBalance}>
          Balance: ${(totalIngresos - totalGastos).toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Presupuestos</Text>
        <Text style={styles.sectionHint}>
          Define el límite mensual por categoría y revisa el consumo actual.
        </Text>

        <View style={styles.budgetEditor}>
          {FIXED_CATEGORIES.map((category) => (
            <View key={category} style={styles.budgetEditorRow}>
              <Text style={styles.budgetCategory}>{category}</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) => handleBudgetDraftChange(category, value)}
                placeholder="Límite mensual"
                placeholderTextColor={placeholderTextColor}
                style={styles.budgetInput}
                value={budgetDrafts[category] ?? ""}
              />
            </View>
          ))}

          <Pressable
            onPress={handleSaveBudgets}
            style={[styles.button, styles.buttonPrimary]}
          >
            <Text style={styles.buttonText}>Guardar presupuestos</Text>
          </Pressable>
        </View>

        {budgetSummaries.map((budget) => {
          const clampedPercentage = Math.min(budget.percentage, 100);
          const indicatorStyle =
            budget.status === "critical"
              ? styles.budgetFillCritical
              : budget.status === "warning"
                ? styles.budgetFillWarning
                : styles.budgetFillNormal;

          return (
            <View key={budget.category} style={styles.budgetRow}>
              <View style={styles.budgetHeaderRow}>
                <Text style={styles.budgetCategory}>{budget.category}</Text>
                <Text
                  style={
                    budget.status === "critical"
                      ? styles.budgetBadgeCritical
                      : budget.status === "warning"
                        ? styles.budgetBadgeWarning
                        : styles.budgetBadgeNormal
                  }
                >
                  {clampedPercentage.toFixed(0)}%
                </Text>
              </View>

              <View style={styles.budgetTrack}>
                <View
                  style={[
                    styles.budgetFill,
                    indicatorStyle,
                    { width: `${clampedPercentage}%` },
                  ]}
                />
              </View>

              <Text style={styles.budgetSpent}>
                Gastado este mes: ${budget.spent.toFixed(2)} de ${budget.limit.toFixed(2)}
              </Text>
              <Text style={styles.budgetRemaining}>
                Restante: ${budget.remaining.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuracion</Text>
        <View style={styles.settingsRow}>
          <View style={styles.settingsTextBlock}>
            <Text style={styles.filterLabel}>Modo oscuro</Text>
            <Text style={styles.sectionHint}>
              Cambia entre tema claro y oscuro. Se guarda automaticamente.
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleColorScheme}
            trackColor={{ false: "#94a3b8", true: "#38bdf8" }}
            thumbColor={isDark ? "#f8fafc" : "#0f172a"}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lista de transacciones</Text>
        {filteredTransactions.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay transacciones para los filtros seleccionados.
          </Text>
        ) : (
          filteredTransactions.map((item) => (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionTitle}>{item.category}</Text>
                <Text
                  style={
                    item.type === "ingreso"
                      ? styles.amountPositive
                      : styles.amountNegative
                  }
                >
                  {item.type === "ingreso" ? "+" : "-"}$
                  {(Number.isFinite(item.amount) ? item.amount : 0).toFixed(2)}
                </Text>
              </View>

              <Text style={styles.transactionMeta}>Cuenta: {item.account}</Text>
              <Text style={styles.transactionMeta}>Fecha: {item.date}</Text>
              <Text style={styles.transactionMeta}>
                Descripcion: {item.description || "Sin descripcion"}
              </Text>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => onEditTransaction(item)}
                  style={[styles.button, styles.buttonSecondary]}
                >
                  <Text style={styles.buttonText}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={() => onDeleteTransaction(item)}
                  style={[styles.button, styles.buttonDanger]}
                >
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

      <Modal
        animationType="slide"
        transparent
        visible={isFormModalVisible}
        onRequestClose={closeFormModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>
                {editingId ? "Editar transaccion" : "Nueva transaccion"}
              </Text>

              <View style={styles.typeRow}>
                <Pressable
                  onPress={() => setForm((prev) => ({ ...prev, type: "ingreso" }))}
                  style={[
                    styles.typeButton,
                    form.type === "ingreso" && styles.typeButtonActivePositive,
                  ]}
                >
                  <Text style={styles.typeButtonText}>Ingreso</Text>
                </Pressable>
                <Pressable
                  onPress={() => setForm((prev) => ({ ...prev, type: "gasto" }))}
                  style={[
                    styles.typeButton,
                    form.type === "gasto" && styles.typeButtonActiveNegative,
                  ]}
                >
                  <Text style={styles.typeButtonText}>Gasto</Text>
                </Pressable>
              </View>

              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, amount: value }))
                }
                placeholder="Monto"
                placeholderTextColor={placeholderTextColor}
                style={styles.input}
                value={form.amount}
              />
              <Text style={styles.filterLabel}>Categoría</Text>
              <TextInput
                onChangeText={setCategoryName}
                placeholder="Nueva categoría"
                placeholderTextColor={placeholderTextColor}
                style={styles.input}
                value={categoryName}
              />
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleCreateCategory}
                  style={[styles.button, styles.buttonPrimary]}
                >
                  <Text style={styles.buttonText}>Agregar categoría</Text>
                </Pressable>
                <Pressable
                  onPress={resetCategoryDraft}
                  style={[styles.button, styles.buttonSecondary]}
                >
                  <Text style={styles.buttonText}>Limpiar</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {availableCategories.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setForm((prev) => ({ ...prev, category: cat }))}
                      style={[
                        styles.chip,
                        form.category === cat && styles.chipActive,
                      ]}
                    >
                      <Text style={styles.chipText}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                keyboardType="numeric"
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, account: value }))
                }
                placeholder="Nombre de la cuenta"
                placeholderTextColor={placeholderTextColor}
                style={styles.input}
                value={form.account}
              />
              {availableAccounts.length === 0 ? (
                <Text style={styles.emptyText}>
                  Crea una cuenta arriba para poder asignar transacciones.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {availableAccounts.map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setForm((prev) => ({ ...prev, account: item }))}
                        style={[
                          styles.chip,
                          form.account === item && styles.chipActive,
                        ]}
                      >
                        <Text style={styles.chipText}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
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
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, description: value }))
                }
                placeholder="Descripcion"
                placeholderTextColor={placeholderTextColor}
                style={styles.input}
                value={form.description}
              />

              <View style={styles.actionRow}>
                <Pressable
                  onPress={onSaveTransaction}
                  style={[styles.button, styles.buttonPrimary]}
                >
                  <Text style={styles.buttonText}>
                    {editingId ? "Guardar cambios" : "Agregar"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={closeFormModal}
                  style={[styles.button, styles.buttonSecondary]}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (palette: ScreenPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.screenBg,
    },
    content: {
      padding: 18,
      gap: 12,
      paddingBottom: 30,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: palette.modalBackdrop,
      justifyContent: "center",
      padding: 16,
    },
    modalCard: {
      backgroundColor: palette.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      padding: 16,
      maxHeight: "85%",
    },
    title: {
      color: palette.textPrimary,
      fontSize: 30,
      fontWeight: "800",
    },
    subtitle: {
      color: palette.textSecondary,
      fontSize: 14,
    },
    section: {
      backgroundColor: palette.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      padding: 12,
      gap: 10,
    },
    sectionTitle: {
      color: palette.textPrimary,
      fontWeight: "700",
      fontSize: 16,
    },
    sectionHint: {
      color: palette.textSecondary,
      fontSize: 13,
    },
    settingsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    settingsTextBlock: {
      flex: 1,
      gap: 4,
    },
    metricsRow: {
      gap: 8,
    },
    metricCard: {
      borderWidth: 1,
      borderColor: palette.inputBorder,
      borderRadius: 10,
      backgroundColor: palette.inputBg,
      padding: 10,
      gap: 4,
    },
    metricLabel: {
      color: palette.mutedText,
      fontSize: 12,
      fontWeight: "600",
    },
    chartRow: {
      gap: 6,
      paddingVertical: 6,
    },
    chartRowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    chartTrack: {
      height: 10,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: palette.chartTrack,
    },
    chartBar: {
      height: "100%",
      borderRadius: 999,
    },
    chartLabel: {
      color: palette.balance,
      fontWeight: "700",
      fontSize: 12,
    },
    chartAmount: {
      color: palette.textSecondary,
      fontSize: 12,
    },
    accountCard: {
      borderWidth: 1,
      borderColor: palette.inputBorder,
      borderRadius: 10,
      backgroundColor: palette.inputBg,
      padding: 12,
      gap: 4,
    },
    accountName: {
      color: palette.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    input: {
      borderWidth: 1,
      borderColor: palette.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.textPrimary,
      backgroundColor: palette.inputBg,
    },
    dateValue: {
      color: palette.textPrimary,
    },
    typeRow: {
      flexDirection: "row",
      gap: 8,
    },
    typeButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: palette.chipBg,
    },
    typeButtonActivePositive: {
      backgroundColor: "#15803d",
    },
    typeButtonActiveNegative: {
      backgroundColor: "#be123c",
    },
    typeButtonText: {
      color: "#f8fafc",
      fontWeight: "700",
    },
    filterLabel: {
      color: palette.textSecondary,
      fontWeight: "600",
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: palette.chipBg,
    },
    chipActive: {
      backgroundColor: palette.chipActive,
    },
    chipText: {
      color: "#f8fafc",
      fontWeight: "600",
    },
    summaryPositive: {
      color: palette.positive,
      fontWeight: "700",
    },
    summaryNegative: {
      color: palette.negative,
      fontWeight: "700",
    },
    summaryBalance: {
      color: palette.balance,
      fontWeight: "700",
    },
    transactionCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.inputBorder,
      backgroundColor: palette.inputBg,
      padding: 10,
      gap: 6,
    },
    transactionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    transactionTitle: {
      color: palette.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    transactionMeta: {
      color: palette.textSecondary,
      fontSize: 13,
    },
    amountPositive: {
      color: palette.positive,
      fontWeight: "800",
    },
    amountNegative: {
      color: palette.negative,
      fontWeight: "800",
    },
    emptyText: {
      color: palette.mutedText,
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 110,
    },
    buttonPrimary: {
      backgroundColor: palette.buttonPrimary,
    },
    buttonSecondary: {
      backgroundColor: palette.buttonSecondary,
    },
    buttonDanger: {
      backgroundColor: palette.buttonDanger,
    },
    logoutButton: {
      marginTop: 2,
      backgroundColor: palette.logoutButton,
    },
    buttonText: {
      color: palette.buttonText,
      fontWeight: "700",
    },
    budgetRow: {
      gap: 8,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.cardBorder,
    },
    budgetCategory: {
      fontWeight: "bold",
      color: palette.textPrimary,
    },
    budgetEditor: {
      gap: 10,
      paddingVertical: 4,
    },
    budgetEditorRow: {
      gap: 8,
    },
    budgetInput: {
      borderWidth: 1,
      borderColor: palette.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.textPrimary,
      backgroundColor: palette.inputBg,
    },
    budgetHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    budgetTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: palette.chartTrack,
      overflow: "hidden",
    },
    budgetFill: {
      height: "100%",
      borderRadius: 999,
    },
    budgetFillNormal: {
      backgroundColor: "#4ade80",
    },
    budgetFillWarning: {
      backgroundColor: "#f59e0b",
    },
    budgetFillCritical: {
      backgroundColor: "#ef4444",
    },
    budgetBadgeNormal: {
      color: "#4ade80",
      fontWeight: "800",
    },
    budgetBadgeWarning: {
      color: "#f59e0b",
      fontWeight: "800",
    },
    budgetBadgeCritical: {
      color: "#ef4444",
      fontWeight: "800",
    },
    budgetSpent: {
      color: palette.negative,
    },
    budgetRemaining: {
      color: palette.positive,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: palette.inputBorder,
      borderRadius: 10,
      backgroundColor: palette.inputBg,
      overflow: "hidden",
    },
    pickerLabel: {
      color: palette.textSecondary,
      fontSize: 12,
      paddingHorizontal: 12,
      paddingTop: 8,
      fontWeight: "600",
    },
    picker: {
      color: palette.textPrimary,
      backgroundColor: palette.inputBg,
    },
  });

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

type StoredUser = {
  email: string;
  password: string;
};

type SessionUser = {
  email: string;
};

type AuthContextType = {
  user: SessionUser | null;
  isBootstrapping: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  register: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ ok: boolean; message?: string }>;
  switchAccount: (email: string) => Promise<void>;
};

const USERS_KEY = "demo_users";
const SESSION_KEY = "demo_session";
const USER_DATA_KEY_PREFIXES = [
  "demo_transactions_",
  "demo_accounts_",
  "demo_budgets_",
  "demo_categories_",
] as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getUserScopedKeys(email: string) {
  const normalizedEmail = normalizeEmail(email);
  return USER_DATA_KEY_PREFIXES.map((prefix) => `${prefix}${normalizedEmail}`);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getUsers() {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) {
    return [] as StoredUser[];
  }

  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const rawSession = await AsyncStorage.getItem(SESSION_KEY);

        if (!rawSession) {
          setIsBootstrapping(false);
          return;
        }

        const parsed = JSON.parse(rawSession) as SessionUser;
        if (parsed?.email) {
          setUser({ email: normalizeEmail(parsed.email) });
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, message: "Completa email y contrasena." };
    }

    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, message: "El formato del email no es valido." };
    }

    const users = await getUsers();
    const found = users.find(
      (storedUser) =>
        normalizeEmail(storedUser.email) === normalizedEmail &&
        storedUser.password === normalizedPassword,
    );

    if (!found) {
      return { ok: false, message: "Credenciales invalidas." };
    }

    const nextUser = { email: normalizedEmail };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return { ok: true };
  };

  const register = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, message: "Completa email y contrasena." };
    }

    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, message: "El formato del email no es valido." };
    }

    if (normalizedPassword.length < 6) {
      return {
        ok: false,
        message: "La contrasena debe tener al menos 6 caracteres.",
      };
    }

    const users = await getUsers();
    const alreadyExists = users.some(
      (storedUser) => normalizeEmail(storedUser.email) === normalizedEmail,
    );

    if (alreadyExists) {
      return { ok: false, message: "Ese email ya existe." };
    }

    const updatedUsers = [
      ...users,
      { email: normalizedEmail, password: normalizedPassword },
    ];
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

    const nextUser = { email: normalizedEmail };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    setUser(nextUser);

    return { ok: true };
  };

  const logout = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const deleteAccount = async () => {
    if (!user?.email) {
      return { ok: false, message: "No hay una cuenta activa para eliminar." };
    }

    const currentEmail = normalizeEmail(user.email);
    const users = await getUsers();
    const updatedUsers = users.filter(
      (storedUser) => normalizeEmail(storedUser.email) !== currentEmail,
    );

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    await AsyncStorage.multiRemove([
      SESSION_KEY,
      ...getUserScopedKeys(currentEmail),
    ]);
    setUser(null);

    return { ok: true };
  };

  const switchAccount = async (email: string) => {
    const users = await getUsers();
    const found = users.find(
      (user) => normalizeEmail(user.email) === normalizeEmail(email),
    );

    if (!found) {
      throw new Error("Cuenta no encontrada.");
    }

    const nextUser = { email: normalizeEmail(email) };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const value = useMemo(
    () => ({
      user,
      isBootstrapping,
      login,
      register,
      logout,
      deleteAccount,
      switchAccount,
    }),
    [isBootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

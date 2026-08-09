import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation strings
const resources = {
  en: {
    translation: {
      auth: {
        welcomeBack: "Welcome Back",
        signInToDashboard: "Sign in to your dashboard",
        username: "Username",
        password: "Password",
        signIn: "Sign In",
        signingIn: "Signing In...",
        loginSuccessful: "Login successful!",
        invalidCredentials: "Invalid credentials",
        enterCredentials: "Please enter username and password"
      },
      sidebar: {
        chats: "Chats",
        tasks: "Tasks",
        escalations: "Escalations",
        knowledgeBase: "Knowledge Base",
        insights: "Insights",
        globalSettings: "Global Settings"
      },
      dashboard: {
        searchPlaceholder: "Search chats or messages...",
        deadLetterAlert: "Dead-Letter Queue Alert",
        jobsStalled: "{{count}} background job has stalled and require attention.",
        jobsStalled_plural: "{{count}} background jobs have stalled and require attention.",
        viewAlerts: "View Alerts",
        retryAll: "Retry All",
        restoreBackup: "Restore Backup"
      },
      settings: {
        language: "Language",
        english: "English",
        spanish: "Español"
      },
      backupModal: {
        title: "Restore Backup",
        description: "Upload a <1>wa.db</1> or <3>.sqlite</3> backup file to restore your entire dashboard state.",
        clickOrDrag: "Click or drag and drop to upload",
        sqliteDb: "SQLite Database (.db, .sqlite)",
        warning: "Restoring a backup will overwrite your current database. The active server will automatically back up your current state before proceeding.",
        cancel: "Cancel",
        confirmRestore: "Confirm Restore",
        restoring: "Restoring..."
      }
    }
  },
  es: {
    translation: {
      auth: {
        welcomeBack: "Bienvenido de nuevo",
        signInToDashboard: "Inicie sesión en su panel",
        username: "Nombre de usuario",
        password: "Contraseña",
        signIn: "Iniciar sesión",
        signingIn: "Iniciando sesión...",
        loginSuccessful: "¡Inicio de sesión exitoso!",
        invalidCredentials: "Credenciales inválidas",
        enterCredentials: "Por favor, introduzca su nombre de usuario y contraseña"
      },
      sidebar: {
        chats: "Chats",
        tasks: "Tareas",
        escalations: "Escalaciones",
        knowledgeBase: "Base de Conocimientos",
        insights: "Perspectivas",
        globalSettings: "Ajustes Globales"
      },
      dashboard: {
        searchPlaceholder: "Buscar chats o mensajes...",
        deadLetterAlert: "Alerta de Cola de Mensajes Muertos",
        jobsStalled: "{{count}} trabajo en segundo plano se ha estancado y requiere atención.",
        jobsStalled_plural: "{{count}} trabajos en segundo plano se han estancado y requieren atención.",
        viewAlerts: "Ver Alertas",
        retryAll: "Reintentar Todos",
        restoreBackup: "Restaurar Copia"
      },
      settings: {
        language: "Idioma",
        english: "Inglés",
        spanish: "Español"
      },
      backupModal: {
        title: "Restaurar Copia",
        description: "Suba un archivo <1>wa.db</1> o <3>.sqlite</3> para restaurar todo el estado del panel.",
        clickOrDrag: "Haga clic o arrastre y suelte para subir",
        sqliteDb: "Base de Datos SQLite (.db, .sqlite)",
        warning: "Restaurar una copia sobrescribirá su base de datos actual. El servidor activo hará una copia de seguridad de su estado actual automáticamente antes de proceder.",
        cancel: "Cancelar",
        confirmRestore: "Confirmar Restauración",
        restoring: "Restaurando..."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('i18nextLng') || 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;

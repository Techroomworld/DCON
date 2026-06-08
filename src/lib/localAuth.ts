export type LocalAuthRole = "admin" | "teacher" | "student";
export type LocalAuthUser = {
  email: string;
  role: LocalAuthRole;
};

const STORAGE_KEY = "dcons_local_auth_user";

export function saveLocalAuth(user: LocalAuthUser) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Unable to save local auth user", error);
  }
}

export function getLocalAuth(): LocalAuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email && parsed?.role) {
      return parsed;
    }
  } catch (error) {
    console.error("Unable to read local auth user", error);
  }
  return null;
}

export function clearLocalAuth() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Unable to clear local auth user", error);
  }
}

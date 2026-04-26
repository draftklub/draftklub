/**
 * STUB de autenticação. NÃO usar em produção.
 *
 * Quando Firebase JS SDK for adicionado, substituir por chamadas reais:
 *   firebase.auth().signInWithEmailAndPassword(email, password)
 *   firebase.auth().signInWithPopup(googleProvider)
 *
 * Mantém a interface estável pra tela de login não precisar mudar quando
 * trocar o backend.
 */

export interface AuthUser {
  email: string;
  displayName: string | null;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (!email || !password) {
    throw new Error('Email e senha são obrigatórios');
  }
  if (password.length < 6) {
    throw new Error('Senha precisa ter pelo menos 6 caracteres');
  }
  return { email, displayName: email.split('@')[0] ?? null };
}

export async function loginWithGoogle(): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { email: 'demo@draftklub.com', displayName: 'Player demo' };
}

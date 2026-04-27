'use client';

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  unlink,
  updatePassword,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export type { FirebaseUser };

/**
 * Login com email + senha. Erros conhecidos são re-emitidos com
 * mensagens em PT-BR.
 */
export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return cred.user;
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Login com Google via popup. Se popup for bloqueado, usuário precisa
 * habilitar — não usamos redirect fallback no MVP (UX adicional).
 */
export async function loginWithGoogle(): Promise<FirebaseUser> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(getFirebaseAuth(), provider);
    return cred.user;
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Cria conta com email + senha + nome opcional. Após criar, o user
 * fica logado automaticamente (Firebase Auth retorna a credential).
 *
 * Política de senha (server-side, Firebase Auth project config):
 * - min 8 chars
 * - pelo menos 1 numero
 *
 * O frontend valida o mesmo antes de chamar pra UX boa, mas o server
 * é a autoridade. Erros do servidor (`auth/weak-password` etc) caem
 * no `mapFirebaseError`.
 */
export async function signupWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<FirebaseUser> {
  try {
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    if (displayName && displayName.trim().length > 0) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    return cred.user;
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/** Logout. Limpa o token local + state. */
export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth());
}

// ─── Profile management ─────────────────────────────────────────────────

/**
 * Identifiers dos providers do Firebase que a UI conhece. Outros
 * (apple.com, github.com, etc.) podem aparecer mas não são suportados
 * no fluxo de account linking atual.
 */
export type ProviderId = 'password' | 'google.com';

/**
 * Atualiza nome de exibição do user atual. Lança se sem user logado.
 */
export async function updateDisplayName(name: string): Promise<void> {
  const user = requireCurrentUser();
  try {
    await updateProfile(user, { displayName: name.trim() });
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Vincula o provider email/senha ao user atual. Usar em contas que
 * entraram só com Google e querem definir senha pra também conseguir
 * logar via email/senha. Idempotente: se já tem `password` provider
 * vinculado, lança `auth/provider-already-linked`.
 */
export async function setPasswordOnAccount(password: string): Promise<void> {
  const user = requireCurrentUser();
  if (!user.email) {
    throw new Error('Conta sem e-mail vinculado. Não dá pra definir senha.');
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await linkWithCredential(user, credential);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Troca a senha do user atual. Reautentica com a senha atual antes
 * (Firebase exige operação recente). Lança `auth/wrong-password` se
 * `currentPassword` errado.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = requireCurrentUser();
  if (!user.email) {
    throw new Error('Conta sem e-mail vinculado.');
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Vincula provider Google ao user atual via popup. Use quando o user
 * só tem `password` provider e quer adicionar Google.
 */
export async function linkGoogleProvider(): Promise<void> {
  const user = requireCurrentUser();
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await linkWithPopup(user, provider);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Desvincula um provider do user atual. Bloqueia se for o último
 * provider (deixaria a conta inacessível).
 */
export async function unlinkProvider(providerId: ProviderId): Promise<void> {
  const user = requireCurrentUser();
  if (user.providerData.length <= 1) {
    throw new Error('Não dá pra desconectar o único provider — você ficaria sem como entrar.');
  }
  try {
    await unlink(user, providerId);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Reautentica o user atual usando o provider mais conveniente.
 * Necessário antes de operações sensíveis (delete account, mudar
 * email). Tenta Google popup se o user tem esse provider; senão pede
 * senha atual.
 */
export async function reauthenticate(currentPassword?: string): Promise<void> {
  const user = requireCurrentUser();
  const hasGoogle = user.providerData.some((p) => p.providerId === 'google.com');
  try {
    if (hasGoogle) {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);
      return;
    }
    if (!user.email || !currentPassword) {
      throw new Error('Informe sua senha atual pra confirmar.');
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Exclui o user do Firebase Auth. **Não** limpa dados de aplicação no
 * backend — quem chama precisa coordenar com endpoint backend (TODO:
 * `DELETE /me`). Por enquanto: backend mantém User órfão até cleanup.
 */
export async function deleteCurrentUser(): Promise<void> {
  const user = requireCurrentUser();
  try {
    await deleteUser(user);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

function requireCurrentUser(): FirebaseUser {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  return user;
}

/**
 * Envia email de verificação pro user atual. Lança se sem user logado.
 * O link no email leva pra um domínio Firebase (configurável no Console);
 * após click, `user.emailVerified` vira true no próximo refresh do token.
 */
export async function sendEmailVerify(): Promise<void> {
  const user = requireCurrentUser();
  try {
    await sendEmailVerification(user);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

/**
 * Manda email de reset de senha. Por boa prática (não vazar se o email
 * existe ou não), nunca lance erro pra `auth/user-not-found` no caller —
 * a UI deve mostrar a mesma mensagem de "se existir, mandamos o link"
 * independente do resultado. Outros erros (rede, rate limit) seguem
 * propagando.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  } catch (err) {
    // Engole erro de "user not found" pra não vazar existência de email.
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'auth/user-not-found'
    ) {
      return;
    }
    throw mapFirebaseError(err);
  }
}

/**
 * Retorna o ID token JWT do user atual (refresh automático se expirado).
 * Null se não há user logado.
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/**
 * Inscreve callback pra mudanças de auth state. Retorna unsubscribe.
 * Use no `AuthProvider`, não em componentes individuais.
 */
export function subscribeToAuthState(cb: (user: FirebaseUser | null) => void): Unsubscribe {
  return firebaseOnAuthStateChanged(getFirebaseAuth(), cb);
}

// ─── Error mapping ──────────────────────────────────────────────────────

function mapFirebaseError(err: unknown): Error {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: string }).code;
    const message = ERROR_MESSAGES[code] ?? 'Erro inesperado. Tente novamente.';
    const wrapped = new Error(message);
    (wrapped as Error & { code?: string }).code = code;
    return wrapped;
  }
  return err instanceof Error ? err : new Error('Erro desconhecido.');
}

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos. Confira e tente de novo.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta está desativada. Fale com o seu Klub.',
  'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos. Confira e tente de novo.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Tente novamente em alguns minutos.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet e tente de novo.',
  'auth/popup-closed-by-user': 'Você fechou o popup do Google antes de concluir.',
  'auth/popup-blocked': 'O navegador bloqueou o popup do Google. Habilite e tente de novo.',
  'auth/cancelled-popup-request': 'Login com Google cancelado.',
  'auth/account-exists-with-different-credential':
    'Já existe uma conta com este e-mail usando outro método de login.',
  'auth/missing-email': 'Informe o e-mail.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Use o login.',
  'auth/weak-password': 'Senha muito fraca. Use ao menos 8 caracteres e 1 número.',
  'auth/password-does-not-meet-requirements':
    'Senha não atende aos requisitos: mínimo 8 caracteres com 1 número.',
  'auth/provider-already-linked': 'Esse método de login já está vinculado à sua conta.',
  'auth/credential-already-in-use':
    'Esse e-mail/senha já pertence a outra conta. Use outro e-mail.',
  'auth/requires-recent-login': 'Operação sensível: faça login novamente e tente em seguida.',
};

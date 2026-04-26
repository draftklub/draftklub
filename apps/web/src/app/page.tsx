import { redirect } from 'next/navigation';

export default function HomePage(): never {
  // TODO: detectar sessão (Firebase Auth) e redirecionar pra /dashboard quando logado.
  redirect('/login');
}

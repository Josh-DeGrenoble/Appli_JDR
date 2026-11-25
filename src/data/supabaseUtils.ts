// Mode en ligne : petits utilitaires Supabase (gestion d'erreur traduite, conversion utilisateur, réglages).
import type { User as SbUser } from '@supabase/supabase-js';
import type { Campaign, User } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/types';

/** Utilisateur Supabase → utilisateur de l'appli (pseudo depuis user_metadata.name). */
export const toUser = (u: SbUser | null | undefined): User | null =>
  u ? { id: u.id, email: u.email ?? undefined, name: (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'Aventurier' } : null;

/** Renvoie les données ou lève une erreur en français. */
export function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(translate(res.error.message));
  return res.data;
}

/** Traduit les messages d'erreur courants de Supabase. */
export function translate(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect';
  if (/User already registered/i.test(msg)) return 'Un compte existe déjà avec cet email';
  if (/Password should be at least/i.test(msg)) return 'Mot de passe trop court (6 caractères minimum)';
  if (/Email not confirmed/i.test(msg)) return 'Confirme ton email (regarde ta boîte mail) avant de te connecter';
  if (/row-level security|permission denied/i.test(msg)) return 'Action non autorisée';
  return msg;
}

/** Complète les réglages de campagne avec les valeurs par défaut (réglages ajoutés après coup). */
export const withSettings = (c: Campaign): Campaign => ({ ...c, settings: { ...DEFAULT_SETTINGS, ...(c.settings ?? {}) } });

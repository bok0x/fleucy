import { getAppSettingsAction } from '@/features/settings/actions';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const settings = await getAppSettingsAction();
  return <SettingsClient initialLockMinutes={settings?.pin_lock_minutes ?? 10} />;
}

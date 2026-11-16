// src/features/admin/ComingSoon.tsx
// Placeholder for admin sections not built yet (Posts, Users, Audit log, Reports, Emails, Alerts).
import { Body1, Title1 } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { ADMIN_NS } from './i18n';
import type { AdminSection } from './sections';

export function ComingSoon({ section }: { section: AdminSection }) {
  const { t } = useTranslation(ADMIN_NS);
  return (
    <section>
      <Title1 as="h1">{t(`nav.${section}`)}</Title1>
      <Body1 as="p">{t('comingSoon.body')}</Body1>
    </section>
  );
}

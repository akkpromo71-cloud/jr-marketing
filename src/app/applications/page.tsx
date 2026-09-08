import { Toast } from '@/components/toast';
import { getDict } from '@/lib/i18n';

// Правая панель split-pane для маршрута /applications: список — в layout.tsx.
// На мобиле подсказка скрыта (виден только список); на десктопе — приглашение
// выбрать заявку. Проверка роли и редирект — тоже в layout.tsx.
export default async function ApplicationsPage() {
  const { t } = await getDict();

  return (
    <>
      <Toast successParam="applied" successMessage={t.applicationsList.appliedMsg} />
      <p className="hidden text-body text-text-faint md:block">{t.applicationsList.selectPrompt}</p>
    </>
  );
}

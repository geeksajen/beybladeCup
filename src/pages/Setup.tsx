import { useNavigate } from 'react-router-dom';
import { EventSetupForm } from '../components/admin/EventSetupForm';
import { Icon } from '../components/icons';
import { Card, useAction } from '../components/ui';
import { buildEventDoc, defaultSetupValues } from '../lib/defaults';
import { useEvent } from '../providers/EventProvider';

/** 初次設定頁（spec §4.3）：完成前不能使用其他功能。 */
export default function Setup() {
  const { store } = useEvent();
  const navigate = useNavigate();
  const { busy, error, run } = useAction();

  return (
    <div className="arena-bg min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <Icon name="bey" className="text-5xl text-primary" />
          <h1 className="neon-text mt-2 text-2xl font-black">歡迎！先設定比賽</h1>
          <p className="mt-2 text-sm text-ink-muted">完成設定後才能開始使用。這些設定之後都可以在後台「活動設定」修改。</p>
        </div>
        <Card>
          <EventSetupForm
            initial={defaultSetupValues()}
            requireFuture
            submitLabel="完成設定"
            busy={busy}
            error={error}
            onSubmit={(v) =>
              void run(async () => {
                await store.createEvent(buildEventDoc(v, Date.now()));
                navigate('/admin', { replace: true });
              })
            }
          />
        </Card>
      </div>
    </div>
  );
}

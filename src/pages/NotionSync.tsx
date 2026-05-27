import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { api } from '../lib/api';
import { useApp } from '../App';
import type { SyncLog } from '../types';

export default function NotionSync() {
  const { meta, reloadMeta } = useApp();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');

  const loadLogs = () => api.syncLog().then(setLogs);
  useEffect(() => { loadLogs(); }, []);

  const sync = async () => {
    setBusy(true); setErr(''); setResult(null);
    try {
      const res = await api.syncNotion();
      setResult(res);
      reloadMeta();
      loadLogs();
    } catch (e: any) {
      setErr(e.message);
      loadLogs();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card title="Notion 案件・活動データ同期" icon={Database}>
        <div className="space-y-4">
          <p className="text-sm text-brand-muted leading-relaxed">
            Notionの「DB05_案件（CRM）」「DB06_活動（CRM）」から、受注実績・MRR・パイプライン・架電/商談数を取り込みます。
            同期は既存のNotion由来データを置き換えます（手入力のIS実績には影響しません）。
          </p>

          {!meta?.notionConfigured && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-[12px]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">NOTION_API_KEY が未設定です</p>
                <p className="mt-1 opacity-90">プロジェクト直下の <code className="font-mono">.env</code> に Notion インテグレーションのトークンを設定し、サーバーを再起動してください。</p>
              </div>
            </div>
          )}

          <button onClick={sync} disabled={busy || !meta?.notionConfigured}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-midnight text-white text-[12px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40">
            <RefreshCw className={busy ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            {busy ? '同期中…' : '今すぐ同期'}
          </button>

          {err && <div className="text-red-600 text-sm font-bold">エラー: {err}</div>}

          {result && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-100 text-[13px] space-y-1">
              <p className="flex items-center gap-2 font-bold text-green-700"><CheckCircle2 className="w-4 h-4" />同期完了</p>
              <p>案件 {result.deals} 件 / 活動 {result.activities} 件 を取得</p>
              <p>受注実績 {result.contractsRows} 行・活動実績 {result.activityRows} 行を更新</p>
              {result.unmatched?.length > 0 && (
                <p className="text-amber-700">⚠ メンバー未マッチ: {result.unmatched.join(', ')}（メンバー管理で氏名を合わせてください）</p>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title="同期ログ" subtitle="直近20件" noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border">
              <th className="text-left px-5 py-2 font-black">日時</th>
              <th className="text-left px-3 py-2 font-black">ソース</th>
              <th className="text-left px-3 py-2 font-black">状態</th>
              <th className="text-left px-5 py-2 font-black">詳細</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-brand-border/60">
                <td className="px-5 py-2 font-mono text-[11px] text-brand-muted">{new Date(l.synced_at).toLocaleString('ja-JP')}</td>
                <td className="px-3 py-2"><Badge variant={l.source === 'notion' ? 'info' : 'default'}>{l.source}</Badge></td>
                <td className="px-3 py-2"><Badge variant={l.status === 'ok' ? 'success' : 'danger'}>{l.status}</Badge></td>
                <td className="px-5 py-2 text-[11px] text-brand-muted truncate max-w-[360px]">{l.detail}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-brand-muted text-sm">ログはまだありません</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import {
  Monitor,
  Check,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  RefreshCw,
  LoaderCircle,
} from 'lucide-react';
import type { PublicSettings } from '../../../shared/types';
import type { Act, Notify } from '../../app/types';
import { errorMessage } from '../../../shared/errors';
import { api } from '../../lib/api';
import { providers } from './providers';

export function SettingsView({
  settings,
  act,
  notify,
}: {
  settings: PublicSettings;
  act: Act;
  notify: Notify;
}) {
  const [form, setForm] = useState({ ...settings, apiKey: '' }),
    [keyEdited, setKeyEdited] = useState(false),
    [models, setModels] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  async function discover() {
    setBusy(true);
    try {
      const result = await api<{ models: string[] }>('/api/models', {
        baseUrl: form.baseUrl,
        ...(keyEdited ? { apiKey: form.apiKey } : {}),
      });
      setModels(result.models);
      notify(`Connected. Found ${result.models.length} models.`);
      if (!form.model && result.models.length) setForm({ ...form, model: result.models[0] });
    } catch (error) {
      notify(errorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, YOUR WAY</div>
          <h1>Settings</h1>
          <p>Bring the intelligence. We’ll give it the tools.</p>
        </div>
      </div>
      <div className="settings-layout">
        <form
          className="panel settings-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { apiKey, ...rest } = form;
            const result = await act<PublicSettings>('/api/settings', {
              ...rest,
              ...(keyEdited ? { apiKey } : {}),
            });
            if (result) {
              notify('Model settings saved');
              setKeyEdited(false);
              setForm({ ...result, apiKey: '' });
            }
            setBusy(false);
          }}
        >
          <div className="settings-section-title">
            <span className="empty-icon">
              <Sparkles size={22} />
            </span>
            <div>
              <h2>Model connection</h2>
              <p>Use a cloud provider or a model on your own machine.</p>
            </div>
          </div>
          <label>
            Provider
            <select
              value={form.provider}
              onChange={(e) => {
                const provider = e.target.value;
                setForm({
                  ...form,
                  provider,
                  baseUrl: providers[provider].url,
                  model: '',
                  apiKey: '',
                  hasKey: false,
                });
                setKeyEdited(true);
                setModels([]);
              }}
            >
              {Object.entries(providers).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.name}
                </option>
              ))}
            </select>
            <small>{providers[form.provider]?.hint}</small>
          </label>
          <label>
            API base URL
            <input
              type="url"
              required
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://your-provider.com/v1"
            />
          </label>
          <label>
            API key <span className="optional">optional for local models</span>
            <input
              type="password"
              autoComplete="off"
              value={form.apiKey}
              placeholder={
                form.hasKey && !keyEdited
                  ? 'Key connected — enter a new key to replace'
                  : 'Enter your API key'
              }
              onChange={(e) => {
                setKeyEdited(true);
                setForm({ ...form, apiKey: e.target.value });
              }}
            />
            <small>
              Kept in server memory only. Re-enter after a restart, or set MODEL_API_KEY in the
              server environment.
            </small>
          </label>
          <label>
            Model ID
            <div className="input-action">
              <input
                required
                maxLength={200}
                list="model-list"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="Enter a model ID or discover models"
              />
              <button
                type="button"
                className="button subtle"
                disabled={busy || !form.baseUrl}
                onClick={discover}
              >
                {busy ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}{' '}
                Discover
              </button>
            </div>
            <datalist id="model-list">
              {models.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
            <small>The model must support Chat Completions and function tool calling.</small>
          </label>
          <label>
            Maximum model turns per task
            <input
              type="number"
              min="2"
              max="40"
              value={form.maxSteps}
              onChange={(e) => setForm({ ...form, maxSteps: Number(e.target.value) })}
            />
            <small>
              A turn may contain several tool calls. Tasks pause when they need approval.
            </small>
          </label>
          <div className="settings-footer">
            <span>
              <i className="dot" />
              {settings.model ? settings.model : 'No model connected'}
            </span>
            <button className="button primary" disabled={busy}>
              <Check size={16} /> Save connection
            </button>
          </div>
        </form>
        <aside className="settings-help">
          <div className="panel">
            <ShieldCheck size={25} />
            <h3>You’re in control</h3>
            <p>Files, memory, and task history live in this project’s data folder.</p>
            <p>
              Your chosen model provider receives task instructions, relevant memory, and tool
              results.
            </p>
            <p>
              Commands run on your host computer after approval. Browser interactions also require
              approval.
            </p>
          </div>
          <div className="panel">
            <Monitor size={25} />
            <h3>Going local?</h3>
            <p>
              Start Ollama or LM Studio, load a model with tool support, then use Discover to choose
              it.
            </p>
            <a
              className="text-button"
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
            >
              Get Ollama <ExternalLink size={14} />
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}

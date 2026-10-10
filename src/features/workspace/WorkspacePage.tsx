import { useEffect, useState, useCallback } from 'react';
import { FolderOpen, ChevronRight, FileText, RefreshCw, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { WorkspaceFile } from '../../../shared/types';
import type { Notify } from '../../app/types';
import { errorMessage } from '../../../shared/errors';
import { api } from '../../lib/api';
import { date } from '../../lib/format';
import { Empty } from '../../components/ui/Empty';
import { Modal } from '../../components/ui/Modal';

export function WorkspaceView({ notify }: { notify: Notify }) {
  const [directory, setDirectory] = useState('.'), [files, setFiles] = useState<WorkspaceFile[]>([]), [preview, setPreview] = useState<(WorkspaceFile & { content: string }) | null>(null), [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setFiles(await api<WorkspaceFile[]>(`/api/files?path=${encodeURIComponent(directory)}`)); } catch (error) { notify(errorMessage(error), true); } finally { setLoading(false); } }, [directory, notify]);
  useEffect(() => { void load(); }, [load]);
  async function open(file: WorkspaceFile) { if (file.directory) return setDirectory(file.path); try { const result = await api<{ content: string }>(`/api/file?path=${encodeURIComponent(file.path)}`); setPreview({ ...file, content: result.content }); } catch (error) { notify(error.message, true); } }
  function download() { if (!preview) return; const url = URL.createObjectURL(new Blob([preview.content], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = preview.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <><div className="page-heading"><div><div className="eyebrow">THE OUTPUT, ALL TOGETHER</div><h1>Shared workspace</h1><p>Files your bots create, ready for you and the rest of the team.</p></div><button className="button subtle" onClick={load}><RefreshCw size={16} className={loading ? 'spin' : ''}/> Refresh</button></div><div className="panel files-panel"><div className="panel-heading"><div className="file-path"><button className="text-button" onClick={() => setDirectory('.')}><FolderOpen size={17}/> Workspace</button>{directory !== '.' && <><ChevronRight size={14}/><span>{directory}</span><button className="text-button" onClick={() => setDirectory(directory.split('/').slice(0, -1).join('/') || '.')}>Up one level</button></>}</div><span className="mini-label">{files.length} ITEMS</span></div>{files.length ? <div className="file-table"><div className="file-table-head"><span>Name</span><span>Size</span><span>Modified</span><span/></div>{files.map(file => <button className="file-row" key={file.path} onClick={() => open(file)}><span>{file.directory ? <FolderOpen size={19}/> : <FileText size={19}/>} {file.name}</span><span>{file.directory ? '—' : `${(file.size / 1024).toFixed(1)} KB`}</span><span>{date(file.modified)}</span><ChevronRight size={16}/></button>)}</div> : <Empty icon={FolderOpen} title="Room for great work">Ask a bot to save a report, write a file, or build something.<br/>The results will live here.</Empty>}</div>{preview && <Modal title={preview.name} subtitle={preview.path} wide onClose={() => setPreview(null)}><div className="file-preview">{preview.name.endsWith('.md') ? <div className="markdown"><Markdown remarkPlugins={[remarkGfm]}>{preview.content}</Markdown></div> : <pre>{preview.content}</pre>}</div><div className="modal-footer"><button className="button primary" onClick={download}><Download size={16}/> Download file</button></div></Modal>}</>;
}

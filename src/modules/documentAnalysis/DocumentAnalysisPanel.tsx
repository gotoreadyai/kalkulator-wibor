import { useState, useEffect } from 'react';
import { FileText, Copy, CheckCircle } from 'lucide-react';
import { useCases, useCaseFiles } from '../../core/CaseContext';
import { getDocumentText, getFullText } from '../../core/ocrPipeline';
import type { DocumentText, PageText } from '../../core/types';

function PageCard({ page }: { page: PageText }) {
  const [expanded, setExpanded] = useState(false);
  const preview = page.text.slice(0, 200);
  const hasMore = page.text.length > 200;

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-3 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge badge-sm font-mono">{page.pageNum}</span>
            {page.confidence != null && (
              <span className={`badge badge-xs ${page.confidence > 80 ? 'badge-success' : page.confidence > 50 ? 'badge-warning' : 'badge-error'}`}>
                {page.confidence.toFixed(0)}%
              </span>
            )}
          </div>
          <span className="text-[10px] opacity-40">{page.text.length} znaków</span>
        </div>
        <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed opacity-70 max-h-48 overflow-y-auto">
          {expanded ? page.text : preview}{hasMore && !expanded && '…'}
        </pre>
        {hasMore && (
          <button onClick={() => setExpanded(!expanded)} className="btn btn-ghost btn-xs self-start">
            {expanded ? 'Zwiń' : 'Rozwiń'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DocumentAnalysisPanel() {
  const activeCaseId = useCases(s => s.activeCaseId);
  const caseFiles = useCaseFiles();
  const contractFile = caseFiles.find(f => f.evidenceKey === 'contract');
  const [doc, setDoc] = useState<DocumentText | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeCaseId) { setLoading(false); return; }
    setLoading(true);
    getDocumentText(activeCaseId, 'contract').then(dt => {
      setDoc(dt ?? null);
      setLoading(false);
    });
  }, [activeCaseId, contractFile]);

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner" /></div>;

  if (!doc) {
    return (
      <div className="text-center py-12 space-y-3">
        <FileText className="w-12 h-12 mx-auto opacity-20" />
        <p className="text-sm opacity-50">Brak przetworzonego dokumentu.</p>
        <p className="text-xs opacity-30">Wgraj PDF umowy kredytu w panelu Sprawy i kliknij „Analizuj".</p>
      </div>
    );
  }

  const fullText = getFullText(doc);
  const pagesWithConfidence = doc.pages.filter(p => p.confidence != null && p.confidence > 0);
  const avgConfidence = pagesWithConfidence.length > 0
    ? pagesWithConfidence.reduce((s, p) => s + p.confidence!, 0) / pagesWithConfidence.length
    : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-base-200 rounded-lg p-4 space-y-2">
        <h4 className="font-bold text-sm">Wyciągnięty tekst umowy</h4>
        <div className="flex flex-wrap gap-3 text-xs">
          <span>{doc.pages.length} stron</span>
          <span>{fullText.length.toLocaleString()} znaków</span>
          {avgConfidence != null && (
            <span className={avgConfidence > 80 ? 'text-success' : avgConfidence > 50 ? 'text-warning' : 'text-error'}>
              Pewność OCR: {avgConfidence.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={handleCopy} className="btn btn-sm btn-outline gap-1">
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Skopiowano' : 'Kopiuj cały tekst'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {doc.pages.map(page => (
          <PageCard key={page.pageNum} page={page} />
        ))}
      </div>
    </div>
  );
}

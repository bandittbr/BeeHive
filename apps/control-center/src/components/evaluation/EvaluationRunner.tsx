import { useState, useEffect } from "react";
import {
  Target, Play, Plus, X, CheckCircle, XCircle, AlertCircle,
  Clock, ChevronDown, ChevronRight, Loader2, Trash2, FilePlus,
} from "lucide-react";
import {
  fetchEvaluationSuites, createSuite, deleteSuite, startRun, fetchRuns,
  type EvaluationData,
} from "../../services/evaluation.service";
import type { EvaluationSuite, EvaluationRun } from "../../types";

interface EvaluationRunnerProps {
  project: { id: string; pipelines?: Array<{ id: string; name: string }> };
}

export function EvaluationRunner({ project }: EvaluationRunnerProps) {
  const [data, setData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedSuite, setExpandedSuite] = useState<string | null>(null);
  const [suiteRuns, setSuiteRuns] = useState<Record<string, EvaluationRun[]>>({});
  const [running, setRunning] = useState<string | null>(null);

  const load = () => {
    if (!project?.id) return;
    setLoading(true);
    fetchEvaluationSuites(project.id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [project?.id]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createSuite({ projectId: project.id, name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName("");
      setNewDesc("");
      setCreating(false);
      load();
    } catch (error) {
      console.error("Failed to create suite:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta suite de avaliação?")) return;
    try {
      await deleteSuite(id);
      load();
    } catch (error) {
      console.error("Failed to delete suite:", error);
    }
  };

  const handleRun = async (suiteId: string, pipelineId?: string) => {
    if (!pipelineId) { alert("Selecione um pipeline primeiro"); return; }
    setRunning(suiteId);
    try {
      await startRun(suiteId, pipelineId);
      load();
    } catch (error) {
      console.error("Failed to start run:", error);
    } finally {
      setRunning(null);
    }
  };

  const toggleSuite = async (suiteId: string) => {
    if (expandedSuite === suiteId) {
      setExpandedSuite(null);
      return;
    }
    setExpandedSuite(suiteId);
    if (!suiteRuns[suiteId]) {
      try {
        const { runs } = await fetchRuns(suiteId);
        setSuiteRuns(prev => ({ ...prev, [suiteId]: runs }));
      } catch (error) {
        console.error("Failed to fetch runs:", error);
      }
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle size={16} style={{ color: "var(--success)" }} />;
      case "FAILED": return <XCircle size={16} style={{ color: "var(--danger)" }} />;
      case "RUNNING": return <Loader2 size={16} className="spin" style={{ color: "var(--primary)" }} />;
      case "PENDING": return <Clock size={16} style={{ color: "var(--text-muted)" }} />;
      default: return <AlertCircle size={16} style={{ color: "var(--warning)" }} />;
    }
  };

  if (loading) {
    return (
      <div className="evaluation-view">
        <div className="eval-loading"><Loader2 size={24} className="spin" /> Carregando avaliações...</div>
      </div>
    );
  }

  const suites = data?.suites || [];

  return (
    <div className="evaluation-view">
      <div className="eval-header">
        <div className="eval-header-left">
          <h2><Target size={20} /> Evaluation Framework</h2>
          <p className="eval-subtitle">Teste e valide seus pipelines com suites de avaliação</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nova Suite
        </button>
      </div>

      {creating && (
        <div className="eval-create-form">
          <input
            type="text"
            placeholder="Nome da suite (ex: Validação de Extração)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div className="eval-create-actions">
            <button className="btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
              <FilePlus size={14} /> Criar
            </button>
            <button className="btn-ghost" onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {suites.length === 0 ? (
        <div className="eval-empty">
          <Target size={48} />
          <p>Nenhuma suite de avaliação</p>
          <p className="eval-empty-hint">Crie suites para testar e validar o comportamento dos seus pipelines.</p>
        </div>
      ) : (
        <div className="eval-suites-list">
          {suites.map(suite => {
            const lastRun = suite.runs?.[0];
            const pipelineName = project.pipelines?.find(p => p.id === suite.pipelineId)?.name || "—";

            return (
              <div key={suite.id} className={`eval-suite-card${expandedSuite === suite.id ? " expanded" : ""}`}>
                <div className="eval-suite-header" onClick={() => toggleSuite(suite.id)}>
                  <div className="eval-suite-info">
                    <span className="eval-suite-name">{suite.name}</span>
                    <span className="eval-suite-meta">
                      {suite.testCases?.length || 0} test cases · Pipeline: {pipelineName}
                    </span>
                  </div>
                  <div className="eval-suite-status">
                    {lastRun && (
                      <span className="eval-last-run">
                        {statusIcon(lastRun.status)}
                        {lastRun.passedCases}/{lastRun.totalCases} passaram
                      </span>
                    )}
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); handleRun(suite.id, suite.pipelineId || project.pipelines?.[0]?.id); }} disabled={running === suite.id} title="Executar">
                      {running === suite.id ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
                    </button>
                    <button className="btn-icon danger" onClick={e => { e.stopPropagation(); handleDelete(suite.id); }} title="Excluir">
                      <Trash2 size={14} />
                    </button>
                    <div className="eval-expand-icon">
                      {expandedSuite === suite.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>
                </div>

                {expandedSuite === suite.id && (
                  <div className="eval-suite-body">
                    {suite.description && <p className="eval-suite-desc">{suite.description}</p>}

                    <div className="eval-section">
                      <h4>Test Cases ({suite.testCases?.length || 0})</h4>
                      {suite.testCases?.length > 0 ? (
                        <div className="eval-test-cases">
                          {suite.testCases.map(tc => (
                            <div key={tc.id} className="eval-test-case">
                              <div className="eval-tc-header">
                                <span className="eval-tc-name">{tc.name}</span>
                                <span className="eval-tc-assertions">{tc.assertions?.length || 0} assertions</span>
                              </div>
                              {tc.description && <p className="eval-tc-desc">{tc.description}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="eval-empty-small">Nenhum test case. Adicione via API ou painel.</p>
                      )}
                    </div>

                    <div className="eval-section">
                      <h4>Execuções Recentes</h4>
                      {(suiteRuns[suite.id] || suite.runs || []).length > 0 ? (
                        <div className="eval-runs-list">
                          {(suiteRuns[suite.id] || suite.runs || []).map(run => (
                            <div key={run.id} className={`eval-run-row ${run.status.toLowerCase()}`}>
                              <div className="eval-run-status">{statusIcon(run.status)}</div>
                              <div className="eval-run-info">
                                <span className="eval-run-status-text">{run.status}</span>
                                <span className="eval-run-progress">{run.passedCases}/{run.totalCases} passed</span>
                              </div>
                              <div className="eval-run-time">
                                {run.completedAt
                                  ? new Date(run.completedAt).toLocaleString("pt-BR")
                                  : new Date(run.createdAt).toLocaleString("pt-BR")}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="eval-empty-small">Nenhuma execução ainda.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

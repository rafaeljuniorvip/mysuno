import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Send, ArrowRight, Zap, BookOpen } from 'lucide-react';
import Card from '../components/ui/Card';

const API_BASE = 'https://api.mysn.vipte.co/api';

const copyToClipboard = (text) => navigator.clipboard.writeText(text);

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} title="Copiar" style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
      color: copied ? '#10b981' : '#94a3b8', transition: 'color 0.2s',
    }}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function MethodBadge({ method }) {
  const colors = {
    GET: { bg: '#dcfce7', color: '#166534' },
    POST: { bg: '#dbeafe', color: '#1e40af' },
    DELETE: { bg: '#fee2e2', color: '#991b1b' },
  };
  const c = colors[method] || colors.GET;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
      fontFamily: 'monospace', backgroundColor: c.bg, color: c.color, letterSpacing: '0.5px',
    }}>
      {method}
    </span>
  );
}

function CodeBlock({ children, title }) {
  return (
    <div style={{ position: 'relative', marginTop: '8px' }}>
      {title && <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>{title}</div>}
      <div style={{ position: 'relative' }}>
        <pre style={{
          background: '#0f172a', color: '#e2e8f0', padding: '16px', borderRadius: '10px',
          fontSize: '12px', lineHeight: 1.6, overflowX: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}>
          {children}
        </pre>
        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
          <CopyButton text={children} />
        </div>
      </div>
    </div>
  );
}

function Endpoint({ method, path, description, body, response, notes, credits }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px',
      overflow: 'hidden', transition: 'box-shadow 0.2s',
      boxShadow: open ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
          cursor: 'pointer', background: open ? '#f8fafc' : '#fff',
          transition: 'background 0.2s',
        }}
      >
        {open ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
        <MethodBadge method={method} />
        <code style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>{path}</code>
        <span style={{ fontSize: '13px', color: '#64748b', marginLeft: 'auto' }}>{description}</span>
        {credits !== undefined && (
          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {credits > 0 ? `${credits} creditos` : 'gratis'}
          </span>
        )}
      </div>
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #f1f5f9' }}>
          {body && (
            <CodeBlock title="Corpo da requisicao (JSON)">
              {JSON.stringify(body, null, 2)}
            </CodeBlock>
          )}
          {response && (
            <CodeBlock title="Resposta">
              {JSON.stringify(response, null, 2)}
            </CodeBlock>
          )}
          {notes && <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px', lineHeight: 1.6 }}>{notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <BookOpen size={28} color="#3b82f6" />
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>Documentacao da API</h1>
      </div>

      {/* Autenticacao */}
      <Card title="Autenticacao">
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', lineHeight: 1.7 }}>
          Todas as rotas exigem autenticacao via <strong>API Key</strong> no header <code>X-API-Key</code>.
          Crie suas chaves em <a href="/settings" style={{ color: '#3b82f6', fontWeight: 600 }}>Configuracoes</a>.
        </p>
        <CodeBlock title="Exemplo de autenticacao">
{`curl -H "X-API-Key: mysn_sua_chave_aqui" \\
  ${API_BASE}/suno/limit`}
        </CodeBlock>
        <div style={{
          marginTop: '16px', padding: '14px', background: '#fffbeb', borderRadius: '8px',
          border: '1px solid #fef3c7', fontSize: '13px', color: '#92400e', lineHeight: 1.6,
        }}>
          <strong>Base URL:</strong> <code>{API_BASE}</code>
        </div>
      </Card>

      {/* Geracao de Musica */}
      <div style={{ marginTop: '24px' }}>
        <Card title="Geracao de Musica">
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            Endpoints para gerar musicas, letras e estender audios. Cada geracao consome 12 creditos da sunoapi.org.
          </p>

          <Endpoint
            method="POST"
            path="/suno/generate"
            description="Gerar musica por descricao"
            credits={12}
            body={{
              prompt: "uma bossa nova suave sobre o por do sol",
              make_instrumental: false,
              wait_audio: true
            }}
            response={{
              clips: [
                { id: "abc-123", title: "Por do Sol", audio_url: "https://...", status: "complete", duration: 180 }
              ]
            }}
            notes="Com wait_audio: true, a API aguarda ate a musica ficar pronta (~1-2 min). Com false, retorna o taskId imediatamente e salva em background."
          />

          <Endpoint
            method="POST"
            path="/suno/custom_generate"
            description="Gerar com letra, estilo e titulo"
            credits={12}
            body={{
              prompt: "Versos da letra aqui...",
              tags: "pop, electronic, upbeat",
              title: "Minha Musica",
              make_instrumental: false,
              wait_audio: true
            }}
            response={{
              clips: [
                { id: "def-456", title: "Minha Musica", audio_url: "https://...", tags: "pop, electronic", status: "complete" }
              ]
            }}
            notes="Use 'tags' para definir o estilo musical. 'prompt' contem a letra. Com make_instrumental: true, a letra e ignorada."
          />

          <Endpoint
            method="POST"
            path="/suno/generate_lyrics"
            description="Gerar letra a partir de descricao"
            credits={0.4}
            body={{
              prompt: "uma musica romantica sobre encontrar o amor na praia"
            }}
            response={{
              title: "Amor na Praia",
              text: "[Verse]\nNa areia branca...\n[Chorus]\nEncontrei voce...",
              status: "complete"
            }}
          />

          <Endpoint
            method="POST"
            path="/suno/extend_audio"
            description="Estender duracao de uma musica"
            credits={12}
            body={{
              audio_id: "suno-clip-id",
              prompt: "continuar com solo de guitarra",
              continue_at: 120,
              tags: "rock, guitar solo",
              title: "Extended Version",
              wait_audio: true
            }}
            response={{
              clips: [
                { id: "ghi-789", title: "Extended Version", audio_url: "https://...", duration: 240 }
              ]
            }}
            notes="'continue_at' indica o ponto em segundos de onde a extensao comeca. 'audio_id' e o suno_id da musica original."
          />

          <Endpoint
            method="GET"
            path="/suno/limit"
            description="Consultar creditos e plano"
            credits={0}
            response={{
              credits_left: 3050,
              period: "month",
              monthly_limit: 2500,
              monthly_usage: 0,
              plan: "Pro Plan",
              renews_on: "2026-04-28T14:30:43Z"
            }}
          />
        </Card>
      </div>

      {/* Musicas */}
      <div style={{ marginTop: '24px' }}>
        <Card title="Musicas (banco local)">
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            CRUD das musicas salvas no banco de dados. Sem custo adicional.
          </p>

          <Endpoint
            method="GET"
            path="/songs"
            description="Listar musicas com paginacao e filtros"
            credits={0}
            body={null}
            response={{
              data: [
                { id: "uuid", suno_id: "abc-123", title: "Titulo", tags: "pop", status: "complete", duration: 180, audio_url: "https://...", created_at: "2026-04-01T..." }
              ],
              pagination: { page: 1, limit: 20, total: 42, pages: 3 }
            }}
            notes="Parametros de query: page (default 1), limit (default 20), status (pending|streaming|complete), search (busca por titulo/prompt/tags), sort (created_at|title|status|duration), order (ASC|DESC)."
          />

          <Endpoint
            method="GET"
            path="/songs/:id"
            description="Detalhes de uma musica"
            credits={0}
            response={{
              id: "uuid", suno_id: "abc-123", title: "Titulo", prompt: "...", tags: "pop",
              lyrics: "[Verse]...", audio_url: "https://...", image_url: "https://...",
              video_url: "https://...", status: "complete", duration: 180, model: "V5_5",
              created_at: "2026-04-01T..."
            }}
            notes="Aceita tanto o UUID interno quanto o suno_id como parametro."
          />

          <Endpoint
            method="DELETE"
            path="/songs/:id"
            description="Excluir musica do banco"
            credits={0}
            response={{ deleted: true }}
          />

          <Endpoint
            method="POST"
            path="/songs/sync"
            description="Sincronizar status de musicas pendentes"
            credits={0}
            response={{ synced: 3 }}
            notes="Consulta a API do Suno para atualizar status e URLs de musicas que ainda estao pendentes."
          />
        </Card>
      </div>

      {/* Relatorios */}
      <div style={{ marginTop: '24px' }}>
        <Card title="Relatorios">
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            Endpoints de analytics e estatisticas. Sem custo.
          </p>

          <Endpoint
            method="GET"
            path="/reports/summary"
            description="Resumo geral"
            credits={0}
            response={{
              total_songs: 42, completed_songs: 38, total_generations: 25,
              total_credits_used: 300, songs_today: 3, unique_styles: 12
            }}
          />

          <Endpoint
            method="GET"
            path="/reports/by-period"
            description="Musicas por periodo"
            credits={0}
            response={[
              { period: "2026-04-01T00:00:00.000Z", total: 5 },
              { period: "2026-03-31T00:00:00.000Z", total: 3 }
            ]}
            notes="Parametros: start (data inicio), end (data fim), group (day|week|month)."
          />

          <Endpoint
            method="GET"
            path="/reports/by-style"
            description="Musicas agrupadas por estilo"
            credits={0}
            response={[
              { style: "pop, upbeat", total: 15 },
              { style: "lo-fi, chill", total: 8 }
            ]}
          />

          <Endpoint
            method="GET"
            path="/reports/by-type"
            description="Geracoes por tipo"
            credits={0}
            response={[
              { type: "generate", total: 20, credits: 240 },
              { type: "custom_generate", total: 5, credits: 60 }
            ]}
          />
        </Card>
      </div>

      {/* Exemplos */}
      <div style={{ marginTop: '24px' }}>
        <Card title="Exemplos Completos">
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Gerar musica e aguardar resultado
          </h4>
          <CodeBlock>
{`curl -X POST ${API_BASE}/suno/generate \\
  -H "X-API-Key: mysn_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "uma bossa nova suave sobre o por do sol",
    "make_instrumental": false,
    "wait_audio": true
  }'`}
          </CodeBlock>

          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '24px', marginBottom: '8px' }}>
            Gerar com letra personalizada
          </h4>
          <CodeBlock>
{`curl -X POST ${API_BASE}/suno/custom_generate \\
  -H "X-API-Key: mysn_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Noite Estrelada",
    "prompt": "[Verse]\\nSob o ceu de estrelas\\nEu encontro paz...",
    "tags": "mpb, acustico, suave",
    "wait_audio": true
  }'`}
          </CodeBlock>

          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '24px', marginBottom: '8px' }}>
            Listar musicas com filtro
          </h4>
          <CodeBlock>
{`curl "${API_BASE}/songs?status=complete&search=bossa&limit=10" \\
  -H "X-API-Key: mysn_sua_chave"`}
          </CodeBlock>
        </Card>
      </div>
    </div>
  );
}

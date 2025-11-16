import { useCallback, useMemo, useState } from 'react';
import jsdocJson from '../../../../../doc.json';
import { useSettings } from '../../../settings.mjs';

const DEFAULT_MODEL = 'gpt-5.1';

const docsContext = buildDocsContext(jsdocJson.docs);

const SYSTEM_PROMPT = `You are Strudel's live coding assistant. Strudel is a JavaScript port of TidalCycles used for creating musical patterns. 
You receive the user's current program and a short instruction. Return a minimal modification that keeps the program runnable while applying the intent.
- Always respond with valid JSON matching { "summary": string, "updatedProgram": string }.
- Preserve unrelated code and comments.
- Prefer minimal edits over full rewrites.
- Keep formatting consistent with the original code.
- Only return JSON. No prose, no code fences.

Full Strudel documentation (do not omit from your reasoning):
${docsContext}`;

function buildDocsContext(docs = []) {
  return docs
    .filter((doc) => doc?.name && doc?.description)
    .map((doc) => {
      const description = stripHtml(doc.description);
      const synonyms = doc.synonyms?.length ? doc.synonyms.join(', ') : 'none';
      const params = doc.params?.length
        ? doc.params
            .map((param) => {
              const type = param.type?.names?.join('|') ?? 'any';
              const desc = stripHtml(param.description ?? '');
              return `${param.name}${param.optional ? '?' : ''}: ${type}${desc ? ` - ${desc}` : ''}`;
            })
            .join('; ')
        : 'none';
      const examples = doc.examples?.length ? `Examples:\n${doc.examples.join('\n')}` : '';
      return [`Function: ${doc.name}`, `Description: ${description}`, `Synonyms: ${synonyms}`, `Parameters: ${params}`, examples]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n---\n');
}

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function callOpenAI({ apiKey, model, instruction, code }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `Current Strudel program:\n${code || '// empty program'}`,
            `Instruction:\n${instruction}`,
            'Respond with JSON only.',
          ].join('\n\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(message);
  }

  const payload = await response.json();
  const rawContent = payload?.choices?.[0]?.message?.content;
  const content = typeof rawContent === 'string' ? rawContent : rawContent?.[0]?.text;
  if (!content) {
    throw new Error('The model returned an empty response.');
  }
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error('Unable to parse model response as JSON.');
  }
}

async function safeReadError(response) {
  try {
    const data = await response.json();
    return data?.error?.message || JSON.stringify(data);
  } catch {
    return response.statusText || 'Request failed';
  }
}

export function LlmTab({ context }) {
  const { llmOpenAIKey, llmModel, fontFamily } = useSettings();
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [previousProgram, setPreviousProgram] = useState(null);

  const editor = context?.editorRef?.current;
  const currentCode = editor?.code ?? context?.activeCode ?? '';

  const canSubmit = useMemo(() => {
    return Boolean(instruction.trim() && llmOpenAIKey && editor && status !== 'pending');
  }, [instruction, llmOpenAIKey, editor, status]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    setStatus('pending');
    setResult(null);
    setError('');
    try {
      const data = await callOpenAI({
        apiKey: llmOpenAIKey,
        model: llmModel || DEFAULT_MODEL,
        instruction: instruction.trim(),
        code: currentCode,
      });
      if (!data?.updatedProgram) {
        throw new Error('The response did not include an updated program.');
      }
      const latestProgram = editor?.code ?? currentCode;
      setPreviousProgram(latestProgram);
      editor.setCode(data.updatedProgram);
      if (context?.handleEvaluate) {
        context.handleEvaluate();
      } else {
        editor?.evaluate?.();
      }
      setResult({
        summary: data.summary ?? 'Applied changes.',
        updatedProgram: data.updatedProgram,
      });
      setInstruction('');
    } catch (err) {
      setError(err.message || 'Assistant request failed.');
    } finally {
      setStatus('idle');
    }
  }, [canSubmit, instruction, llmOpenAIKey, llmModel, currentCode, editor, context]);

  const handleUndo = useCallback(() => {
    if (!previousProgram || !editor) {
      return;
    }
    editor.setCode(previousProgram);
    if (context?.handleEvaluate) {
      context.handleEvaluate();
    } else {
      editor?.evaluate?.();
    }
    setPreviousProgram(null);
    setResult(null);
    setError('');
  }, [previousProgram, editor, context]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-foreground w-full" style={{ fontFamily }}>
      <p className="text-sm opacity-80">
        Describe the change you want (for example, &ldquo;add a bass layer&rdquo;). The assistant will minimally edit the
        current Strudel program and update the editor when it succeeds.
      </p>
      <textarea
        className="min-h-28 p-3 rounded-md bg-background border border-lineBackground text-foreground"
        placeholder='e.g. "add a sparse clap on the off beat"'
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {!llmOpenAIKey && (
        <p className="text-xs text-red-300">
          Add an OpenAI API key in the Settings tab to enable this assistant. The key is stored only in this browser.
        </p>
      )}
      {!editor && <p className="text-xs text-yellow-300">Editor is still loading. Try again in a moment.</p>}
      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-md bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {status === 'pending' ? 'Working…' : 'Apply suggestion'}
        </button>
        <button
          className="px-3 py-2 rounded-md border border-lineBackground disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleUndo}
          disabled={!previousProgram}
        >
          Undo last change
        </button>
        <button
          className="px-3 py-2 rounded-md border border-lineBackground"
          onClick={() => {
            setInstruction('');
            setResult(null);
            setError('');
            setPreviousProgram(null);
          }}
        >
          Reset
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && (
        <div className="rounded-md border border-lineBackground bg-background/80 p-3 space-y-2">
          <p className="font-semibold">Summary</p>
          <p className="text-sm">{result.summary}</p>
          <p className="font-semibold pt-2">Updated program</p>
          <pre className="bg-lineBackground/60 p-2 rounded text-xs overflow-auto">{result.updatedProgram}</pre>
        </div>
      )}
    </div>
  );
}

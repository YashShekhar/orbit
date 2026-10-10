export const providers: Record<string, { name: string; url: string; hint: string }> = {
  ollama: { name: 'Ollama · local', url: 'http://localhost:11434/v1', hint: 'Start Ollama and pull a model that supports tools, then discover models.' },
  xai: { name: 'xAI / Grok', url: 'https://api.x.ai/v1', hint: 'Use your xAI API key and a tool-capable Grok model ID.' },
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1', hint: 'Use an API key and a Chat Completions model with tool calling.' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', hint: 'Choose a tool-capable model, including supported Claude or Gemini models.' },
  lmstudio: { name: 'LM Studio · local', url: 'http://localhost:1234/v1', hint: 'Load a tool-capable model and start the local server in LM Studio.' },
  custom: { name: 'Custom compatible endpoint', url: '', hint: 'Any OpenAI-compatible Chat Completions API with function tools.' }
};

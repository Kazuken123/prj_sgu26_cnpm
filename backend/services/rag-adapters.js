// Chooses the embedding/LLM adapters from validated RAG configuration.
const MockEmbeddingAdapter = require("../adapters/mock-embedding");
const MockChatModelAdapter = require("../adapters/mock-llm");
const { OpenAiCompatibleEmbeddingAdapter, OpenAiCompatibleChatAdapter } = require("../adapters/openai-compatible");
function createEmbeddingAdapter(config) {
  if (config.provider === "OPENAI_COMPATIBLE") {
    return new OpenAiCompatibleEmbeddingAdapter({ baseUrl: config.apiBaseUrl, apiKey: config.apiKey, model: config.embeddingModel });
  }
  return new MockEmbeddingAdapter({ model: config.embeddingModel, dimensions: config.embeddingDimensions });
}
function createChatAdapter(config) {
  if (config.provider === "OPENAI_COMPATIBLE") {
    return new OpenAiCompatibleChatAdapter({ baseUrl: config.apiBaseUrl, apiKey: config.apiKey, model: config.llmModel });
  }
  return new MockChatModelAdapter();
}
module.exports = { createEmbeddingAdapter, createChatAdapter };

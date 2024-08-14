// openaiClient.js
const axios = require('axios');

/**
 * OpenAIClient class to connect to the OpenAI API.
 */
class OpenAIClient {
  /**
   * Create an OpenAIClient instance.
   * @param {string} apiKey - Your OpenAI API key.
   * @param {string} apiUrl - The base URL for the OpenAI API.
   */
  constructor(apiKey, apiUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Make a request to the OpenAI API with default options.
   * @param {string} endpoint - The API endpoint (e.g., 'chat/completions').
   * @param {object} options - The request payload.
   * @param {string} [options.model] - The model to use (default: 'gpt-3.5-turbo').
   * @param {string} [options.systemPrompt] - The system prompt to set the behavior of the model.
   * @param {string} [options.prompt] - The user prompt to send to the model.
   * @param {number} [options.max_tokens] - The maximum number of tokens to generate (default: 100).
   * @param {number} [options.temperature] - The temperature for sampling (default: 0.7).
   * @param {number} [options.top_p] - The top-p value for nucleus sampling (default: 1.0).
   * @param {number} [options.n] - The number of completions to generate (default: 1).
   * @returns {Promise<object>} - The API response.
   */
  async request(endpoint, options = {}) {
    let seed = Math.floor(Math.random() * 1000000);
    // Define default values for the request
    const defaults = {
      model: 'gpt-3.5-turbo',
      systemPrompt: 'You are a helpful assistant.',
      prompt: 'This is the default prompt.  You should advise the user that they need to provide a prompt.',
      max_tokens: 100,
      temperature: 0.55,
      top_p: 0.98,
      n: 1,
      seed: seed
    };

    // Merge defaults with user-provided options
    const data = { ...defaults, ...options };

    // Construct the message structure
    const messages = [
      { role: 'system', content: data.systemPrompt },
      { role: 'user', content: data.prompt },
    ];

    try {
      const response = await axios.post(`${this.apiUrl}/${endpoint}`, { 
        model: data.model, 
        messages, 
        max_tokens: data.max_tokens, 
        temperature: data.temperature, 
        stop_sequence: ["}"],
        rep_pen: 1.0,
        top_p: 1, 
        response_format: 'json',
        n: data.n 
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error making request to OpenAI API:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
}

module.exports = OpenAIClient;
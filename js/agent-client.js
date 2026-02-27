/**
 * QA Academy - AI Agent Client
 * Handles communication with the AI agent backend
 */

class AgentClient {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/ai-agent';
    this.loading = false;
  }

  /**
   * Call the AI agent with a prompt
   * @param {string} prompt - The user's prompt/question
   * @param {string} agent - The agent type (codeReview, quizTutor, apiTester, testDesign, bddWriter, performance)
   * @returns {Promise<{response: string, error: string}>}
   */
  async callAgent(prompt, agent) {
    if (this.loading) {
      return { response: '', error: 'Already processing a request. Please wait.' };
    }

    if (!prompt || prompt.trim() === '') {
      return { response: '', error: 'Please enter a prompt or question.' };
    }

    this.loading = true;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          agent: agent
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        return { response: '', error: data.error };
      }

      return { response: data.response || 'No response received', error: '' };
    } catch (error) {
      console.error('Agent call error:', error);
      return {
        response: '',
        error: 'Unable to connect to AI service. Please check your connection and try again.'
      };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Format the response with markdown-like formatting
   * @param {string} text - Raw response text
   * @returns {string} Formatted HTML
   */
  formatResponse(text) {
    if (!text) return '';

    // Escape HTML
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Format code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Format inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Format headings
    formatted = formatted.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Format lists
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

    // Wrap consecutive <li> in <ul>
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Format bold and italic
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Format line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');

    // Wrap in paragraphs
    formatted = `<p>${formatted}</p>`;

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
    formatted = formatted.replace(/<p>\s*<ul>/g, '<ul>');
    formatted = formatted.replace(/<\/ul>\s*<\/p>/g, '</ul>');

    return formatted;
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }
}

// Create global instance
const agentClient = new AgentClient();

interface N8NMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface N8NRequest {
  message: string;
  attachments?: FileAttachment[];
  sessionId?: string;
  language?: string;
}

interface N8NResponse {
  output: string;
  error?: string;
}

const N8N_WEBHOOK_URL = "https://primary-production-90b2.up.railway.app/webhook/b76bdc69-7e22-42f4-95a6-f84e85add767";

export class N8NChatService {
  private static async makeRequest(data: N8NRequest): Promise<N8NResponse> {
    try {
      console.log('N8N Request URL:', N8N_WEBHOOK_URL);
      console.log('N8N Request data:', data);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('N8N Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('N8N Response:', result);
      
      return result;
    } catch (error) {
      console.error('N8N Chat Service Error:', error);
      throw new Error(`Failed to communicate with N8N bot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendMessage(
    message: string,
    attachments?: FileAttachment[],
    sessionId?: string,
    language?: string
  ): Promise<string> {
    const request: N8NRequest = {
      message,
      attachments,
      sessionId,
      language,
    };

    const response = await this.makeRequest(request);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.output;
  }
}

export type { N8NMessage, FileAttachment };
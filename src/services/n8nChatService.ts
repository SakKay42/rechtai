interface FileAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface N8NChatRequest {
  message: string;
  chatId?: string;
  language: string;
  attachments?: FileAttachment[];
  userId: string;
  timestamp: string;
}

interface N8NChatResponse {
  response: string;
  chatId?: string;
  error?: string;
  type?: string;
}

const N8N_WEBHOOK_URL = "https://primary-production-90b2.up.railway.app/webhook/b76bdc69-7e22-42f4-95a6-f84e85add767";

export class N8NChatService {
  private static async makeRequest(data: N8NChatRequest): Promise<N8NChatResponse> {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as N8NChatResponse;
    } catch (error) {
      console.error('N8N API Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  static async sendMessage(
    message: string,
    userId: string,
    language: string = 'nl',
    chatId?: string,
    attachments?: FileAttachment[]
  ): Promise<N8NChatResponse> {
    const requestData: N8NChatRequest = {
      message,
      userId,
      language,
      timestamp: new Date().toISOString(),
      ...(chatId && { chatId }),
      ...(attachments && attachments.length > 0 && { attachments }),
    };

    return await this.makeRequest(requestData);
  }
}

export type { N8NChatRequest, N8NChatResponse, FileAttachment };
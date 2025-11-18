
import type { GoogleDoc, DocContent, DocComment } from '../types';

// Mock Data for Demo Mode
const MOCK_DOCS: GoogleDoc[] = [
    { id: 'mock-1', name: 'Project Apollo Launch Plan', lastModified: '2023-10-27', preview: 'Confidential launch details...' },
    { id: 'mock-2', name: 'Q3 Financial Review - Draft', lastModified: '2023-10-25', preview: 'Revenue exceeded expectations...' },
    { id: 'mock-3', name: 'Website Copy - Homepage v2', lastModified: '2023-10-20', preview: 'Welcome to the future of...' },
];

const MOCK_CONTENT_MAP: Record<string, DocContent> = {
    'mock-1': {
        fullText: `
Project Apollo: Product Launch Strategy
Confidential - Internal Use Only

1. Executive Summary
Project Apollo represents our entry into the generative AI market. This document outlines the go-to-market strategy, key milestones, and risk assessment for the Q4 launch. Our primary goal is to acquire 100,000 active users within the first 30 days.

2. Target Audience
We are targeting three main segments:
- Enterprise Developers: Looking for robust APIs and security.
- Creative Professionals: Needing high-fidelity image and video generation.
- EdTech: Focusing on personalized learning experiences.

3. Marketing Channels
We will utilize a mix of paid search, influencer partnerships, and industry conferences. 
Note: We need to decide if we are sponsoring the "AI Future Summit" next month. The cost is high ($50k), but the exposure is significant.

4. Technical Requirements
The infrastructure must scale to support 10k concurrent requests. 
Latency targets are under 200ms for text generation and under 5s for image generation.

5. Risks
- Competitor movement: Competitor X is rumored to launch a similar feature next week.
- GPU Shortage: Our cloud provider has warned of potential capacity constraints.

6. Conclusion
We are on track for a successful launch, provided we mitigate the hardware risks.
        `,
        comments: [
            { id: 'c1', author: 'Sarah Jenkins', text: 'Is 100k users realistic? That seems very aggressive given our marketing budget.', associatedText: 'acquire 100,000 active users within the first 30 days' },
            { id: 'c2', author: 'Mike Ross', text: 'Please verify the cost of the summit. I thought it was $35k.', associatedText: '$50k' },
            { id: 'c3', author: 'David Chen', text: 'Latency target seems too loose for text. Should we aim for 100ms?', associatedText: 'under 200ms' }
        ]
    },
    'mock-2': {
        fullText: `
Q3 Financial Overview

Revenue: $4.5M (Up 12% QoQ)
Expenses: $3.2M
Net Income: $1.3M

Key Drivers:
- Enterprise subscription growth exceeded targets by 20%.
- Churn rate decreased from 5% to 3.5%.

Areas of Concern:
- Server costs have increased by 15% due to higher traffic. We need to optimize our inference pipelines.
- Marketing spend was underutilized in August.

Outlook for Q4:
We expect a seasonal dip in December but strong growth in October and November.
        `,
        comments: [
            { id: 'c4', author: 'Alice Wong', text: 'Why was marketing spend low in August?', associatedText: 'Marketing spend was underutilized in August' }
        ]
    },
    'mock-3': {
        fullText: `
Welcome to Vantage.

Unlock the power of your documents. 
Vantage uses advanced AI to review, refine, and fact-check your work in seconds.
Don't just write—create with intelligence.

Features:
- Smart Comments: Get actionable feedback instantly.
- Fact Checking: Verify claims against the web.
- Deep Polish: Rewrite your drafts with professional flair.

Join the waitlist today.
        `,
        comments: []
    }
};

// Extract plain text from Google Doc JSON structure
const extractText = (content: any[]): string => {
  if (!content) return '';
  return content.map(element => {
    if (element.paragraph) {
      return element.paragraph.elements
        .map((e: any) => e.textRun ? e.textRun.content : '')
        .join('');
    } else if (element.table) {
      // Simplified table extraction
      return element.table.tableRows.map((row: any) => 
         row.tableCells.map((cell: any) => extractText(cell.content)).join(' | ')
      ).join('\n');
    } else if (element.sectionBreak) {
        return "\n";
    }
    return '';
  }).join('');
};

export const getDocuments = async (accessToken: string): Promise<GoogleDoc[]> => {
  // DEMO MODE CHECK
  if (accessToken === 'demo-token') {
      return new Promise((resolve) => {
          setTimeout(() => resolve(MOCK_DOCS), 800); // Simulate network delay
      });
  }

  try {
    // Query for Google Docs, not in trash
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document' and trashed=false&fields=files(id, name, modifiedTime)&pageSize=20",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
       if (response.status === 401) {
           throw new Error("Your session has expired. Please log in again.");
       }
      throw new Error(`Drive API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.files) {
        return [];
    }
    
    // Basic transformation
    return data.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        lastModified: new Date(f.modifiedTime).toLocaleDateString(),
        preview: "Loading preview..." 
    }));

  } catch (error) {
    console.error("Failed to fetch documents", error);
    throw error;
  }
};

export const getDocumentContent = async (docId: string, accessToken: string): Promise<DocContent> => {
  // DEMO MODE CHECK
  if (accessToken === 'demo-token') {
      return new Promise((resolve) => {
          setTimeout(() => {
              const content = MOCK_CONTENT_MAP[docId] || { fullText: "Content not found.", comments: [] };
              resolve(content);
          }, 600);
      });
  }

  try {
    // 1. Fetch Document Content (Text)
    const docResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );
    
    if (!docResponse.ok) {
        if (docResponse.status === 403) {
             throw new Error("Permission denied. You may not have access to this document.");
        }
        throw new Error("Failed to fetch doc content");
    }
    const docJson = await docResponse.json();
    const fullText = extractText(docJson.body.content);

    // 2. Fetch Comments from Drive API
    // Note: Comments API is part of Drive API, not Docs API
    const commentsResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${docId}/comments?fields=comments(id,author(displayName),content,quotedFileContent)`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );
    
    if (!commentsResponse.ok) throw new Error("Failed to fetch comments");
    const commentsJson = await commentsResponse.json();
    
    const comments: DocComment[] = commentsJson.comments ? commentsJson.comments.map((c: any) => ({
        id: c.id,
        author: c.author?.displayName || "Unknown",
        text: c.content,
        associatedText: c.quotedFileContent?.value || ""
    })) : [];

    return {
        fullText,
        comments
    };

  } catch (error) {
      console.error("Error fetching document details", error);
      throw error;
  }
};

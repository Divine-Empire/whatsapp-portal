import axios from 'axios';

interface SendMessageParams {
  to: string;
  message: string;
  accessToken: string;
  phoneNumberId: string;
}

interface SendMessageResponse {
  messageId: string;
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage({
  to,
  message,
  accessToken,
  phoneNumberId,
}: SendMessageParams): Promise<SendMessageResponse> {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const response = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const waMessageId = response.data?.messages?.[0]?.id;
  if (!waMessageId) {
    throw new Error('No message ID returned from WhatsApp API');
  }

  return { messageId: waMessageId };
}

/**
 * Send an emoji reaction to a message via WhatsApp Cloud API.
 * Pass an empty string for `emoji` to remove a reaction.
 */
export async function sendWhatsAppReaction({
  to,
  messageId,
  emoji,
  accessToken,
  phoneNumberId,
}: {
  to: string;
  messageId: string;
  emoji: string;
  accessToken: string;
  phoneNumberId: string;
}): Promise<void> {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'reaction',
      reaction: {
        message_id: messageId,
        emoji,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Verify the Meta access token is valid by calling the API
 */
export async function verifyMetaToken(
  accessToken: string,
  phoneNumberId: string
): Promise<{ valid: boolean; phoneNumber?: string; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      valid: true,
      phoneNumber: response.data?.display_phone_number || response.data?.verified_name,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.response?.data?.error?.message || 'Invalid token or phone number ID',
    };
  }
}

interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode: string;
  components: any[];
  accessToken: string;
  phoneNumberId: string;
}

/**
 * Send a template message via WhatsApp Cloud API
 */
/**
 * Fetch all approved message templates from the WhatsApp Business Management API
 */
export async function fetchWhatsAppTemplates({
  wabaId,
  accessToken,
}: {
  wabaId: string;
  accessToken: string;
}): Promise<{ name: string; category: string; body: string; language: string }[]> {
  try {
    const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?status=APPROVED&fields=name,category,components,language&limit=100`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const templates: { name: string; category: string; body: string; language: string }[] = [];
    for (const t of response.data?.data || []) {
      const bodyComp = (t.components || []).find((c: any) => c.type === 'BODY');
      templates.push({
        name: t.name,
        category: (t.category || '').toLowerCase(),
        body: bodyComp?.text || '',
        language: t.language || '',
      });
    }
    return templates;
  } catch (err: any) {
    console.error('Failed to fetch WhatsApp templates:', err?.response?.data || err.message);
    return [];
  }
}

/**
 * Resolve the body text and name of a template by matching its category or name.
 * Priority: 1. Exact name match, 2. Category match, 3. Single template fallback.
 */
export function resolveTemplateInfo(
  templates: { name: string; category: string; body: string }[],
  pricingCategory?: string,
  exactName?: string
): { name: string; body: string } {
  if (templates.length === 0) return { name: 'unknown', body: '[Template Message]' };

  // 1. Priority: Exact Name Match (from biz_opaque_callback_data)
  if (exactName) {
    const match = templates.find(t => t.name.toLowerCase() === exactName.toLowerCase());
    if (match) return { name: match.name, body: match.body };
  }

  // 2. Secondary: Pricing Category Match
  if (pricingCategory) {
    const catLower = pricingCategory.toLowerCase();
    const matched = templates.filter((t) => t.category === catLower);
    if (matched.length > 0) {
      // Use the first match in the category
      return { name: matched[0].name, body: matched[0].body };
    }
  }

  // 3. Fallback: If only one template total
  if (templates.length === 1) {
    return { name: templates[0].name, body: templates[0].body };
  }

  return { name: exactName || 'unknown', body: '[Template Message]' };
}

/**
 * Given a template body with placeholders like {{1}}, {{2}}, and the components
 * array from a WhatsApp API send request, substitute the placeholders with real values.
 *
 * Components format from WhatsApp API:
 * [{ type: "body", parameters: [{ type: "text", text: "John" }, { type: "text", text: "123" }] }]
 */
export function resolveTemplateTextWithParams(
  templateBody: string,
  components: any[]
): string {
  if (!templateBody || !components || components.length === 0) return templateBody;

  // Find the body component
  const bodyComponent = components.find(
    (c: any) => c.type === 'body' || c.type === 'BODY'
  );

  if (!bodyComponent?.parameters || bodyComponent.parameters.length === 0) {
    return templateBody;
  }

  let resolved = templateBody;
  bodyComponent.parameters.forEach((param: any, index: number) => {
    const placeholder = `{{${index + 1}}}`;
    const value = param.text || param.value || '';
    resolved = resolved.replace(placeholder, value);
  });

  return resolved;
}

/**
 * Fetch a specific template by name from Meta and return its body text
 * with parameters substituted if components are provided.
 */
export async function resolveTemplateFinalText({
  wabaId,
  accessToken,
  templateName,
  languageCode,
  components,
}: {
  wabaId: string;
  accessToken: string;
  templateName: string;
  languageCode: string;
  components: any[];
}): Promise<string> {
  const templates = await fetchWhatsAppTemplates({ wabaId, accessToken });
  
  // Find the exact template by name
  const match = templates.find(
    (t) => t.name === templateName
  );

  if (!match || !match.body) {
    return `[Template: ${templateName}]`;
  }

  // Substitute {{1}}, {{2}} with actual parameter values
  return resolveTemplateTextWithParams(match.body, components);
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  components,
  accessToken,
  phoneNumberId,
}: SendTemplateParams): Promise<SendMessageResponse> {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const response = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: components,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const waMessageId = response.data?.messages?.[0]?.id;
  if (!waMessageId) {
    throw new Error('No message ID returned from WhatsApp API');
  }

  return { messageId: waMessageId };
}

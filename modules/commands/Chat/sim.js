// autotalk.js - Module lệnh cho bot Messenger trả lời tự động dùng Meta AI (login bằng cookie)
module.exports.config = {
  name: "autotalk",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT + Vũ Tài",
  description: "Tự động trả lời bằng Meta AI, dùng cookie, phong cách Gen Z",
  commandCategory: "Chat",
  usages: "autotalk on <cookie> | off | status",
  cooldowns: 5
};

const fs = require('fs');
const fetch = require('node-fetch');
let accessToken = null;
let userCookie = "";
const activatedThreads = new Set();

async function initMetaToken() {
  if (accessToken) return;
  const res = await fetch('https://www.meta.ai/', {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'cookie': userCookie
    }
  });
  const html = await res.text();
  const lsd = html.match(/"LSD",\[\],\{"token":"(.*?)"/)?.[1] || "";
  const abra_csrf = html.match(/abra_csrf\":\{"value\":\"(.*?)\"/)?.[1] || "";
  const payload = new URLSearchParams({
    lsd,
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "useAbraAcceptTOSForTempUserMutation",
    doc_id: "7604648749596940",
    variables: JSON.stringify({ dob: "2000-01-01", icebreaker_type: "TEXT" })
  });
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    "cookie": userCookie + `; abra_csrf=${abra_csrf}`,
    "x-fb-friendly-name": "useAbraAcceptTOSForTempUserMutation"
  };
  const tokenRes = await fetch("https://www.meta.ai/api/graphql/", { method: 'POST', headers, body: payload });
  const tokenJson = await tokenRes.json();
  accessToken = tokenJson?.data?.xab_abra_accept_terms_of_service?.new_temp_user_auth?.access_token || null;
}

async function askMetaAI(message) {
  await initMetaToken();
  const variables = {
    message: { sensitive_string_value: message },
    externalConversationId: `conv_${Date.now()}`,
    offlineThreadingId: `${Date.now()}`,
    suggestedPromptIndex: null,
    flashVideoRecapInput: { images: [] },
    flashPreviewInput: null,
    promptPrefix: null,
    entrypoint: "ABRA__CHAT__TEXT",
    icebreaker_type: "TEXT"
  };
  const payload = new URLSearchParams({
    access_token: accessToken,
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "useAbraSendMessageMutation",
    doc_id: "7783822248314888",
    variables: JSON.stringify(variables),
    server_timestamps: "true"
  });
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    "x-fb-friendly-name": "useAbraSendMessageMutation"
  };
  try {
    const res = await fetch("https://graph.meta.ai/graphql?locale=user", { method: 'POST', headers, body: payload });
    const text = await res.text();
    const lines = text.split('\n');
    for (let line of lines) {
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        const msg = json?.data?.node?.bot_response_message;
        if (msg?.streaming_state === "OVERALL_DONE") {
          return msg.composed_text.content.map(c => c.text).join(" ");
        }
      } catch {}
    }
    return "Tao đang lag vcl... thử lại đi 😵";
  } catch (e) {
    accessToken = null;
    return "Tao bị lỗi khi gọi Meta AI rồi 😭";
  }
}

module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID, senderID, body, type, messageReply } = event;

  const sub = args[0];
  if (sub === "on") {
    if (!args[1]) return api.sendMessage("⚠️ Dùng: autotalk on <cookie>", threadID, messageID);
    userCookie = args.slice(1).join(" ");
    accessToken = null;
    await initMetaToken();
    if (!accessToken) return api.sendMessage("❌ Cookie không hợp lệ hoặc Meta AI chặn truy cập.", threadID, messageID);
    activatedThreads.add(threadID);
    return api.sendMessage("✅ Bot đã bật trong nhóm này (cookie login)", threadID, messageID);
  }
  if (sub === "off") {
    activatedThreads.delete(threadID);
    return api.sendMessage("❌ Đã tắt autotalk cho nhóm này", threadID, messageID);
  }
  if (sub === "status") {
    const status = activatedThreads.has(threadID) ? "✅ BẬT" : "❌ TẮT";
    return api.sendMessage(`Trạng thái bot: ${status}`, threadID, messageID);
  }

  if (!activatedThreads.has(threadID)) return;

  const botID = api.getCurrentUserID();
  const isReplyToBot = messageReply && messageReply.senderID == botID;
  const isMention = Object.keys(event.mentions || {}).includes(botID);
  if (!isReplyToBot && !isMention && type !== "message") return;

  const msg = body.replace(/@(.+?)\s?/g, "").trim();
  const prompt = `Mày là bạn Gen Z, nói chuyện xàm lồn nhưng thân thiện, trả lời tiếng Việt: \"${msg}\"`;
  const res = await askMetaAI(prompt);
  return api.sendMessage(res, threadID, messageID);
};

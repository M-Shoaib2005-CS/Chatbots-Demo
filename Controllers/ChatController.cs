using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace AutoBotAi.Controllers
{
    public class ChatRequest
    {
        public string BotId { get; set; } = "";
        public string BotName { get; set; } = "";
        public string Message { get; set; } = "";
    }

    [ApiController]
    [Route("api/chat")]
    public class ChatController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        // Same four personas as wwwroot/js/chatbot.js — keep both in sync if you edit one.
        // Shared formatting rules appended to every persona — keeps replies plain
        // text so they render cleanly in the chat bubble (no markdown, no emojis).
        private const string FormattingRules =
            " Reply in plain text only. Do not use emojis, emoticons, or symbols like asterisks, underscores, or markdown formatting (no **bold**, no *bullets*, no headers). Write in normal sentences and, if listing a few items, separate them with commas or simple dashes instead of markdown bullets.";

        private static readonly Dictionary<string, string> BotPersonas = new()
        {
            ["restaurant"] = "You are a friendly booking assistant for a local restaurant in Pakistan. Help with table reservations, menu questions, and daily specials. All food is halal. Keep replies to 1-3 short sentences, warm and practical." + FormattingRules,
            ["clinic"] = "You are a front-desk assistant for a medical clinic called CarePoint. Help book appointments and answer clinic-hours or insurance questions. Keep replies short, calm, and professional. Never give medical advice." + FormattingRules,
            ["sports"] = "You are a gear advisor for Apex Athletics, a sports equipment shop. Help with product recommendations, sizing, and stock or return questions. Keep replies short and energetic." + FormattingRules,
            ["legal"] = "You are an intake screening assistant for Vanguard Legal. Collect case details and help schedule consultations. Keep replies short and professional, and note you are not providing legal advice." + FormattingRules,
        };

        public ChatController(IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ChatRequest request)
        {
            // --- THE GEMINI KEY IS READ HERE, SERVER-SIDE, NEVER SENT TO THE BROWSER ---
            var apiKey = _config["Gemini:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return StatusCode(500, new { reply = "Chat backend isn't configured yet — missing Gemini API key." });
            }

            var persona = BotPersonas.TryGetValue(request.BotId ?? "", out var p)
                ? p
                : "You are a helpful business assistant.";

            var client = _httpClientFactory.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={apiKey}";

            var payload = new
            {
                system_instruction = new { parts = new[] { new { text = persona } } },
                contents = new[]
                {
                    new { role = "user", parts = new[] { new { text = request.Message ?? "" } } }
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync(url, content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(500, new { reply = "Sorry, I couldn't reach the AI service right now." });
            }

            try
            {
                using var doc = JsonDocument.Parse(body);
                var reply = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                return Ok(new { reply });
            }
            catch (Exception)
            {
                return StatusCode(500, new { reply = "Sorry, I couldn't parse the AI response." });
            }
        }
    }
}

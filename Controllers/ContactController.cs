using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.Mvc;

namespace AutoBotAi.Controllers
{
    public class ContactRequest
    {
        public string Name { get; set; } = "";
        public string Business { get; set; } = "";
        public string Contact { get; set; } = "";
        public string Message { get; set; } = "";
    }

    [ApiController]
    [Route("api/contact")]
    public class ContactController : ControllerBase
    {
        private readonly IConfiguration _config;

        public ContactController(IConfiguration config)
        {
            _config = config;
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ContactRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) ||
                string.IsNullOrWhiteSpace(request.Contact) ||
                string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { ok = false, error = "Missing required fields." });
            }

            // --- THE GMAIL APP PASSWORD IS READ HERE, SERVER-SIDE, NEVER SENT TO THE BROWSER ---
            var gmailAddress = _config["Smtp:GmailAddress"];
            var gmailAppPassword = _config["Smtp:GmailAppPassword"];
            Console.WriteLine($"DEBUG: password length = {gmailAppPassword?.Length ?? 0}");

            if (string.IsNullOrWhiteSpace(gmailAddress) || string.IsNullOrWhiteSpace(gmailAppPassword))
            {
                return StatusCode(500, new { ok = false, error = "Email isn't configured yet." });
            }

            try
            {
                using var client = new SmtpClient("smtp.gmail.com", 587)
                {
                    Credentials = new NetworkCredential(gmailAddress, gmailAppPassword),
                    EnableSsl = true,
                };

                var mail = new MailMessage
                {
                    From = new MailAddress(gmailAddress, "AutoBot AI Website"),
                    Subject = $"New AutoBot AI lead: {request.Business} ({request.Name})",
                    Body =
                        $"Name: {request.Name}\n" +
                        $"Business: {request.Business}\n" +
                        $"Email/Phone: {request.Contact}\n\n" +
                        $"Message:\n{request.Message}",
                    IsBodyHtml = false,
                };
                mail.To.Add(gmailAddress);

                await client.SendMailAsync(mail);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine("CONTACT EMAIL ERROR: " + ex.Message);
                return StatusCode(500, new { ok = false, error = "Could not send message right now." });
            }
        }
    }
}

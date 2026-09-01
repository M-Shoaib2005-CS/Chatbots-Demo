/* =========================================================
   AutoBot AI — chat widget
   Handles bot theme switching, message rendering, and the
   (currently mocked) call out to the ASP.NET Core backend.
   ========================================================= */
const AutoBotChat = (() => {

  /* ---------------------------------------------------------
     BACKEND INTEGRATION POINT
     Flip USE_BACKEND to true and point BACKEND_URL at your
     live ASP.NET Core API to replace mock replies with real
     ones. Expected response shape: { "reply": "..." }
     --------------------------------------------------------- */
  const USE_BACKEND = false;
  const BACKEND_URL = '/api/chat';

  const bots = {
    restaurant: {
      id: 'restaurant', name: 'Restaurant Booking Assistant', icon: 'utensils',
      accent: '#D97706', accent2: '#F59E0B',
      greeting: "Hi! I'm your restaurant's booking assistant 🍽️ Want to reserve a table, check today's specials, or ask about the menu?",
      chips: ['Book a table for 4', "What's today's special?", 'Halal certified menu?'],
      replies: {
        'book a table for 4': "Got it — a table for 4! What date and time works for you, and would you prefer indoor or outdoor seating?",
        "what's today's special?": "Today's special is Chicken Handi with garlic naan, plus a fresh mango lassi on the house with any main course. 🥭",
        'halal certified menu?': "Yes, our entire menu is 100% halal — all meat is sourced from certified halal suppliers.",
      },
      fallback: "Happy to help with that! For reservations I'll just need the date, time, and party size — for anything else, ask away."
    },
    clinic: {
      id: 'clinic', name: 'CarePoint Medical Receptionist', icon: 'stethoscope',
      accent: '#059669', accent2: '#0D9488',
      greeting: "Hello, I'm CarePoint's front desk assistant 🩺 I can book appointments or answer questions about the clinic.",
      chips: ['Book general checkup', 'Clinic timing?', 'Do you take insurance?'],
      replies: {
        'book general checkup': "Sure — Dr. Ahmed has openings tomorrow at 10:30 AM and 4:00 PM. Which works better for you?",
        'clinic timing?': "We're open Monday–Saturday, 9:00 AM to 8:00 PM. Closed on Sundays and public holidays.",
        'do you take insurance?': "We accept most major insurance providers including State Life and Jubilee Health. Want me to check a specific one?",
      },
      fallback: "I can help with that — could you share a bit more detail so I can check availability or forward it to the front desk?"
    },
    sports: {
      id: 'sports', name: 'Apex Athletics Gear Advisor', icon: 'dumbbell',
      accent: '#2563EB', accent2: '#0284C7',
      greeting: "Hey! I'm Apex's gear advisor 🏋️ Looking for something specific — shoes, apparel, or equipment?",
      chips: ['Best running shoes?', 'Size chart for gloves', 'Return policy?'],
      replies: {
        'best running shoes?': "For road running, our top picks are the Apex Velocity 3 (cushioned) and the Apex Sprint Lite (lightweight, for speed work). What's your running style?",
        'size chart for gloves': "Our gloves run true to size: S (7–7.5\"), M (7.5–8\"), L (8–8.5\"), XL (8.5–9\"). Measure around your knuckles for the best fit.",
        'return policy?': "Unused items in original packaging can be returned within 14 days with your receipt — free exchanges in-store.",
      },
      fallback: "Good question — tell me a bit more about what you're training for and I'll point you to the right gear."
    },
    legal: {
      id: 'legal', name: 'Vanguard Legal Screening Bot', icon: 'scale',
      accent: '#4F46E5', accent2: '#7C3AED',
      greeting: "Hello, I'm Vanguard's intake assistant ⚖️ I can screen your case details and book a consultation with an attorney.",
      chips: ['Book legal consultation', 'What are your fees?', 'Practice areas?'],
      replies: {
        'book legal consultation': "I can set that up. Could you briefly describe the nature of your case, and your preferred day this week?",
        'what are your fees?': "Initial consultations are PKR 3,000, credited toward your case if you proceed with us. Ongoing fees depend on case type.",
        'practice areas?': "We handle family law, property disputes, corporate contracts, and civil litigation. Which of these is closest to your situation?",
      },
      fallback: "Understood — could you share a few more details about your case so I can route you to the right attorney?"
    },
  };

  let currentBot = null;
  let isOpen = false;

  function setTheme(bot){
    const root = document.documentElement.style;
    root.setProperty('--accent', bot.accent);
    root.setProperty('--accent-2', bot.accent2);
  }

  function switchBot(botId){
    const bot = bots[botId];
    if(!bot) return;
    currentBot = bot;
    setTheme(bot);

    document.getElementById('chatBotName').textContent = bot.name;
    document.getElementById('chatAvatarIcon').setAttribute('data-lucide', bot.icon);

    const chipsWrap = document.getElementById('chatChips');
    chipsWrap.innerHTML = '';
    bot.chips.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.type = 'button';
      btn.textContent = c;
      btn.addEventListener('click', () => sendMessage(c));
      chipsWrap.appendChild(btn);
    });

    const body = document.getElementById('chatBody');
    body.innerHTML = '';
    appendSystemDivider(`Now chatting with ${bot.name}`);
    appendBotMessage(bot.greeting);

    if(window.lucide) lucide.createIcons();
  }

  function quickLaunch(botId, text){
    switchBot(botId);
    open();
    setTimeout(() => sendMessage(text), 250);
  }

  function toggle(){ isOpen ? close() : open(); }

  function open(){
    if(!currentBot) switchBot('restaurant');
    isOpen = true;
    const win = document.getElementById('chatWindow');
    win.classList.remove('closed'); win.classList.add('open');
    document.querySelector('.chat-trigger__icon-open').classList.add('hidden');
    document.querySelector('.chat-trigger__icon-close').classList.remove('hidden');
    document.getElementById('chatInput').focus();
  }

  function close(){
    isOpen = false;
    const win = document.getElementById('chatWindow');
    win.classList.remove('open'); win.classList.add('closed');
    document.querySelector('.chat-trigger__icon-open').classList.remove('hidden');
    document.querySelector('.chat-trigger__icon-close').classList.add('hidden');
  }

  function appendSystemDivider(text){
    const body = document.getElementById('chatBody');
    const row = document.createElement('div');
    row.className = 'msg-sys';
    row.innerHTML = `<span>${text}</span>`;
    body.appendChild(row);
  }

  function appendUserMessage(text){
    const body = document.getElementById('chatBody');
    const row = document.createElement('div');
    row.className = 'msg-row msg-user';
    row.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function appendBotMessage(text){
    const body = document.getElementById('chatBody');
    const row = document.createElement('div');
    row.className = 'msg-row msg-bot';
    row.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping(){
    const body = document.getElementById('chatBody');
    const row = document.createElement('div');
    row.className = 'msg-row msg-bot';
    row.id = 'typingRow';
    row.innerHTML = `<div class="msg-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function removeTyping(){
    const row = document.getElementById('typingRow');
    if(row) row.remove();
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function handleSendClick(){
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text) return;
    input.value = '';
    sendMessage(text);
  }

  async function sendMessage(text){
    if(!currentBot) switchBot('restaurant');
    if(!isOpen) open();
    appendUserMessage(text);
    showTyping();

    let replyText = null;

    if(USE_BACKEND){
      try{
        // --- LIVE BACKEND CALL -------------------------------------------
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botId: currentBot.id,
            botName: currentBot.name,
            message: text,
          })
        });
        const data = await response.json();
        replyText = data.reply;
        // -------------------------------------------------------------------
      }catch(err){
        console.warn('Backend unavailable, falling back to mock reply:', err);
      }
    }

    if(!replyText){
      const key = text.trim().toLowerCase();
      replyText = currentBot.replies[key] || currentBot.fallback;
    }

    setTimeout(() => {
      removeTyping();
      appendBotMessage(replyText);
    }, 700 + Math.random() * 500);
  }

  return { switchBot, quickLaunch, toggle, open, close, sendMessage, handleSendClick };
})();

document.addEventListener('keydown', function(e){
  if(e.target && e.target.id === 'chatInput' && e.key === 'Enter'){
    AutoBotChat.handleSendClick();
  }
});

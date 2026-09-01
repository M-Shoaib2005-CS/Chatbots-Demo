const AutoBotSite = (() => {
  async function handleContactSubmit(e){
    e.preventDefault();
    const form = e.target;
    const confirmEl = document.getElementById('formConfirm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;

    const payload = {
      name: document.getElementById('contactName').value.trim(),
      business: document.getElementById('contactBusiness').value.trim(),
      contact: document.getElementById('contactEmail').value.trim(),
      message: document.getElementById('contactMessage').value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    confirmEl.classList.add('hidden');

    try{
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if(res.ok && data.ok){
        confirmEl.textContent = "Thanks — your message is in. We'll reply shortly.";
        confirmEl.classList.remove('contact-form__error');
        confirmEl.classList.remove('hidden');
        form.reset();
      }else{
        showError(confirmEl);
      }
    }catch(err){
      showError(confirmEl);
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  }

  function showError(confirmEl){
    confirmEl.textContent = "Something went wrong sending that — please message us on WhatsApp instead.";
    confirmEl.classList.add('contact-form__error');
    confirmEl.classList.remove('hidden');
  }

  return { handleContactSubmit };
})();

document.addEventListener('DOMContentLoaded', function(){
  if(window.lucide) lucide.createIcons();
});

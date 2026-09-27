/**
 * Substitui os atributos onclick/onsubmit das páginas EJS (proibidos pela CSP):
 *  - data-confirm="mensagem" num botão ou formulário pede confirmação antes de continuar;
 *  - data-dismiss-parent num botão esconde o elemento pai (ex.: avisos).
 *
 * Evita também submissões em duplicado: depois de um formulário ser enviado, os botões de
 * submissão ficam desativados (com "A enviar…") e um segundo envio é ignorado.
 */
(function () {
  document.addEventListener('click', function (event) {
    var dismiss = event.target.closest('[data-dismiss-parent]');
    if (dismiss && dismiss.parentElement) {
      dismiss.parentElement.classList.add('d-none');
      return;
    }
    var trigger = event.target.closest('button[data-confirm], a[data-confirm]');
    if (trigger && !window.confirm(trigger.getAttribute('data-confirm'))) {
      event.preventDefault();
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form.hasAttribute('data-confirm') && !window.confirm(form.getAttribute('data-confirm'))) {
      event.preventDefault();
      return;
    }
    // Pesquisas (GET) podem repetir-se; só os envios que alteram dados ficam bloqueados.
    if ((form.getAttribute('method') || 'get').toLowerCase() !== 'post') return;
    if (form.getAttribute('data-submitting') === 'true') {
      event.preventDefault();
      return;
    }
    form.setAttribute('data-submitting', 'true');
    var buttons = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
    Array.prototype.forEach.call(buttons, function (button) {
      button.setAttribute('data-original-text', button.textContent);
      // Desativar no próximo ciclo: desativar já impediria o próprio envio em alguns browsers.
      setTimeout(function () {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        if (button.tagName === 'BUTTON') button.textContent = 'A enviar…';
      }, 0);
    });
  });

  // Ao voltar atrás (cache do browser), os botões voltam a funcionar.
  window.addEventListener('pageshow', function () {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-submitting="true"]'), function (form) {
      form.removeAttribute('data-submitting');
      Array.prototype.forEach.call(form.querySelectorAll('[data-original-text]'), function (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = button.getAttribute('data-original-text');
      });
    });
  });
})();

/**
 * Substitui os atributos onclick/onsubmit das páginas EJS (proibidos pela CSP):
 *  - data-confirm="mensagem" num botão ou formulário pede confirmação antes de continuar;
 *  - data-dismiss-parent num botão esconde o elemento pai (ex.: avisos).
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
    }
  });
})();

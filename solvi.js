document.querySelectorAll('.buscador-solvi').forEach(function (form) {
    var input = form.querySelector('input[type="search"]');
    var button = form.querySelector('button');
    var history = [];

    if (!input || !button) {
        return;
    }

    var panel = document.createElement('section');
    panel.className = 'solvi-chat-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Conversación con Solvi');

    var conversation = document.createElement('div');
    conversation.className = 'solvi-chat-conversation';
    conversation.setAttribute('role', 'log');
    conversation.setAttribute('aria-live', 'polite');
    panel.appendChild(conversation);
    form.insertAdjacentElement('afterend', panel);

    function addMessage(role, text) {
        var message = document.createElement('p');
        message.className = 'solvi-chat-message solvi-chat-message-' + role;

        var author = document.createElement('strong');
        author.textContent = role === 'user' ? 'Tú: ' : 'Solvi: ';

        var content = document.createElement('span');
        content.textContent = text;

        message.append(author, content);
        conversation.appendChild(message);
        conversation.scrollTop = conversation.scrollHeight;
        panel.hidden = false;
        return content;
    }

    function getPricingContext() {
        var selector = document.getElementById('pais-precios');
        if (!selector) {
            return null;
        }

        var opcion = selector.selectedOptions[0];
        var lines = [
            'País seleccionado: ' + opcion.textContent.trim(),
            'Moneda usada para mostrar precios: ' + selector.dataset.monedaActual,
            'Tipo de cambio mostrado: ' + selector.dataset.tasaActual + ' ' +
                selector.dataset.monedaActual + ' por USD.',
            'Los importes son estimaciones orientativas, no una cotización confirmada.'
        ];

        document.querySelectorAll('.card-col').forEach(function (card) {
            var nombre = card.querySelector('h3');
            var rangos = card.querySelectorAll('.precio[data-precio-min]');
            if (!nombre || rangos.length === 0) {
                return;
            }

            var precios = Array.from(rangos).map(function (rango) {
                return (rango.querySelector('strong').textContent.trim() + ' ' +
                    rango.querySelector('.precio-unidad').textContent.trim()).trim();
            });
            var notaGratis = card.querySelector('.precio-gratis');
            lines.push(nombre.textContent.trim() + ': ' + precios.join('; ') + '.');
            if (notaGratis) {
                lines.push(notaGratis.textContent.trim());
            }
        });

        return lines.join('\n');
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var text = input.value.trim();
        if (!text || button.disabled) {
            return;
        }

        var messages = history.slice(-8).concat({ role: 'user', text: text });
        addMessage('user', text);
        var pendingMessage = addMessage('assistant', 'Estoy pensando...');
        var originalButtonText = button.textContent;
        button.disabled = true;
        input.disabled = true;
        button.textContent = 'Consultando...';
        input.value = '';

        try {
            var response;
            try {
                response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: messages,
                        pricingContext: getPricingContext()
                    })
                });
            } catch {
                throw new Error('No se pudo conectar con Node. En la terminal ejecuta «npm start» y abre http://localhost:3000 (no uses Live Server ni abras el HTML directamente).');
            }

            if (!(response.headers.get('content-type') || '').includes('application/json')) {
                throw new Error('Abre el sitio desde http://localhost:3000. No uses Live Server ni abras el HTML directamente.');
            }

            var data;
            try {
                data = await response.json();
            } catch {
                throw new Error('El servidor devolvió una respuesta inválida. Reinicia Node con «npm start».');
            }

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo enviar la pregunta.');
            }

            pendingMessage.textContent = data.reply;
            history = messages.concat({ role: 'model', text: data.reply });
        } catch (error) {
            pendingMessage.textContent = error.message || 'No se pudo conectar con Solvi.';
        } finally {
            button.disabled = false;
            input.disabled = false;
            button.textContent = originalButtonText;
            input.focus();
            conversation.scrollTop = conversation.scrollHeight;
        }
    });
});

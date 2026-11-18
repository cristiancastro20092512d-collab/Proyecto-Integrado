document.querySelectorAll('.filtros button').forEach(function (boton) {
    boton.addEventListener('click', function () {
        document.querySelector('.filtros .activo').classList.remove('activo');
        boton.classList.add('activo');

        var filtro = boton.dataset.filtro;
        document.querySelectorAll('.card-col').forEach(function (col) {
            var coincide = filtro === 'todos' || col.dataset.categoria.split(' ').includes(filtro);
            col.classList.toggle('oculto', !coincide);
        });
    });

    var selectorPais = document.getElementById('pais-precios');
    var avisoPrecios = document.getElementById('aviso-precios');
    var precios = Array.from(document.querySelectorAll('.card-col .precio[data-precio-min]'));
    var tasasCambio;
    var fechaTasa;

    function mostrarPrecios(moneda, locale, tasa) {
        precios.forEach(function (precio) {
            var formato = new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: moneda,
                currencyDisplay: 'code',
                maximumFractionDigits: 0
            });
            var minimo = Number(precio.dataset.precioMin) * tasa;
            var maximo = Number(precio.dataset.precioMax) * tasa;
            precio.querySelector('.precio-valor').textContent =
                formato.format(minimo) + ' – ' + formato.format(maximo);
            precio.querySelector('.precio-unidad').textContent = precio.dataset.precioUnidad;
        });
    }

    if (selectorPais && avisoPrecios) {
        function actualizarPrecios() {
            var opcion = selectorPais.selectedOptions[0];
            var moneda = opcion.dataset.moneda;
            var locale = opcion.dataset.locale;
            var tasa = tasasCambio && (tasasCambio[moneda] || (moneda === 'PAB' ? 1 : null));

            if (tasa) {
                mostrarPrecios(moneda, locale, tasa);
                selectorPais.dataset.monedaActual = moneda;
                selectorPais.dataset.tasaActual = String(tasa);
                avisoPrecios.textContent =
                    'Rangos orientativos convertidos desde USD' +
                    (fechaTasa ? ' (tipo de cambio actualizado: ' + fechaTasa + ')' : '') +
                    '. El precio final puede variar por impuestos, transporte y cotización.';
            } else {
                mostrarPrecios('USD', 'en-US', 1);
                selectorPais.dataset.monedaActual = 'USD';
                selectorPais.dataset.tasaActual = '1';
                avisoPrecios.textContent =
                    'No se pudo consultar el tipo de cambio; se muestran rangos orientativos en USD. El precio final requiere cotización.';
            }
        }

        selectorPais.addEventListener('change', actualizarPrecios);
        mostrarPrecios('USD', 'en-US', 1);
        avisoPrecios.textContent = 'Consultando el tipo de cambio para mostrar los precios en la moneda seleccionada…';

        var controlador = new AbortController();
        var temporizador = setTimeout(function () {
            controlador.abort();
        }, 8000);

        fetch('https://open.er-api.com/v6/latest/USD', { signal: controlador.signal })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('No se pudo consultar el servicio de tipo de cambio.');
                }
                return response.json();
            })
            .then(function (data) {
                if (data.result !== 'success' || !data.rates) {
                    throw new Error('El servicio de tipo de cambio devolvió datos inválidos.');
                }
                tasasCambio = data.rates;
                fechaTasa = data.time_last_update_utc
                    ? new Date(data.time_last_update_utc).toLocaleDateString('es')
                    : '';
                actualizarPrecios();
            })
            .catch(function () {
                tasasCambio = null;
                actualizarPrecios();
            })
            .finally(function () {
                clearTimeout(temporizador);
            });
    }
});
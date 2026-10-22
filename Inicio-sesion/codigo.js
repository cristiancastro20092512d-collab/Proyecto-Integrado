document.addEventListener('DOMContentLoaded', function () {
    var vistas = document.querySelectorAll('.vista');

    document.querySelectorAll('[data-vista]').forEach(function (boton) {
        boton.addEventListener('click', function () {
            var destino = boton.getAttribute('data-vista');

            vistas.forEach(function (v) {
                v.classList.add('oculto');
            });
            document.getElementById(destino).classList.remove('oculto');
        });
    });
});